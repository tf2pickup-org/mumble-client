import {
  Authenticate,
  ChannelRemove,
  ChannelState,
  PermissionDenied,
  PermissionQuery,
  Ping,
  Reject,
  ServerConfig,
  ServerSync,
  TextMessage,
  UserRemove,
  UserState,
  Version,
} from '@tf2pickup-org/mumble-protocol';
import { MessageType } from '@protobuf-ts/runtime';
import { platform, release } from 'node:os';
import { Client } from './client';
import { MumbleSocket } from './mumble-socket';
import { Permissions } from './permissions';
import { PacketType, payloadOf } from './packet-type';
import { User } from './user';
import { encodeMumbleVersion } from './encode-mumble-version';
import { encodeMumbleVersionLegacy } from './encode-mumble-version-legacy';
import {
  ClientDisconnectedError,
  CommandTimedOutError,
  ConnectionRejectedError,
  PermissionDeniedError,
} from './errors';
import { CommandTimeout } from './config';

type PacketTuple<T extends object> = [MessageType<T>, T];
type ManyPackets<T extends object[]> = { [K in keyof T]: PacketTuple<T[K]> };

export type CommandProps<
  Send extends object,
  Return extends object,
  SendMore extends object[] = [],
> = { expectPacket: [MessageType<Return>, (packet: Return) => boolean] } & (
  | {
      sendPacket: PacketTuple<Send>;
    }
  | {
      sendPackets: ManyPackets<[Send, ...SendMore]>;
    }
);

/**
 * What a connection needs from the client that owns it.
 * @internal
 */
export type ConnectionHost = Pick<
  Client,
  'emit' | 'options' | 'channels' | 'users'
>;

/**
 * One TLS link to a Mumble server, from the handshake to the teardown.
 * @internal
 */
export class Connection {
  session?: number;
  serverVersion?: Version;
  serverConfig?: ServerConfig;
  welcomeText?: string;

  // Channel permission cache
  readonly permissions = new Map<number, Permissions>();

  private readonly ended = new AbortController();
  private readonly speaking = new Map<
    number,
    { user: User; timer: NodeJS.Timeout }
  >();
  private pinger?: NodeJS.Timeout;
  private isReady = false;

  constructor(
    readonly socket: MumbleSocket,
    private readonly host: ConnectionHost,
  ) {
    host.channels.clear();
    host.users.clear();
    socket.on('packet', this.onPacket);
    socket.on('audioPacket', this.onAudioPacket);
    socket.on('close', this.onClose);
  }

  get isOpen(): boolean {
    return !this.ended.signal.aborted;
  }

  /**
   * Authenticates and waits for the server to sync.
   * Tears the connection down if the handshake fails.
   */
  async handshake(): Promise<void> {
    let serverSync: ServerSync | undefined;
    let serverConfig: ServerConfig | undefined;
    let version: Version | undefined;
    const synced = this.waitFor(packet => {
      serverSync ??= payloadOf(packet, ServerSync);
      serverConfig ??= payloadOf(packet, ServerConfig);
      version ??= payloadOf(packet, Version);
      const reject = payloadOf(packet, Reject);
      if (reject) {
        return new ConnectionRejectedError(reject);
      }

      return serverSync && serverConfig && version
        ? { value: [serverSync, serverConfig, version] as const }
        : undefined;
    });

    try {
      [[serverSync, serverConfig, version]] = await Promise.all([
        synced,
        this.hello(),
      ]);
    } catch (error) {
      this.teardown();
      throw error;
    }

    // torn down after the server synced, but before this continuation ran
    if (!this.isOpen) {
      throw new ClientDisconnectedError();
    }

    if (serverSync.session) {
      this.session = serverSync.session;
    }
    this.welcomeText = serverSync.welcomeText ?? '';
    this.serverVersion = version;
    this.serverConfig = serverConfig;
    this.isReady = true;
    this.host.emit('connect');
    this.startPinger();
  }

  /**
   * Wraps sending and receiving a packet in a convenient method.
   * Handles denied permissions response, command timeout and teardown.
   */
  async command<
    Send extends object,
    Return extends object,
    SendMore extends object[] = [],
  >(name: string, props: CommandProps<Send, Return, SendMore>) {
    if (!this.isOpen) {
      throw new ClientDisconnectedError();
    }

    const [expectedType, isExpected] = props.expectPacket;
    const ret = this.waitFor(
      packet => {
        const expected = payloadOf(packet, expectedType);
        if (expected && isExpected(expected)) {
          return { value: expected };
        }

        const permissionDenied = payloadOf(packet, PermissionDenied);
        if (permissionDenied && permissionDenied.session === this.session) {
          return new PermissionDeniedError(permissionDenied);
        }

        return undefined;
      },
      { ms: CommandTimeout, error: () => new CommandTimedOutError(name) },
    );

    const send = async () => {
      if ('sendPackets' in props) {
        for (const [type, payload] of props.sendPackets) {
          await this.socket.send(type, payload);
        }
      } else {
        await this.socket.send(props.sendPacket[0], props.sendPacket[1]);
      }
    };
    const [response] = await Promise.all([ret, send()]);
    return response;
  }

  /**
   * Ends the connection. Emits 'disconnect' once, and only if the handshake
   * has completed.
   */
  teardown(reason?: string) {
    if (!this.isOpen) {
      return;
    }

    this.ended.abort();
    this.socket.off('packet', this.onPacket);
    this.socket.off('audioPacket', this.onAudioPacket);
    this.socket.off('close', this.onClose);
    clearInterval(this.pinger);
    for (const session of this.speaking.keys()) {
      this.stopSpeaking(session);
    }
    if (this.isReady) {
      this.host.emit(
        'disconnect',
        reason === undefined ? undefined : { reason },
      );
    }
    this.socket.end();
  }

  private async hello(): Promise<void> {
    const { options } = this.host;
    await this.socket.send(
      Authenticate,
      Authenticate.create({
        username: options.username,
        ...(options.password ? { password: options.password } : {}),
        tokens: options.tokens ?? [],
        opus: true,
      }),
    );

    const version = {
      major: 1,
      minor: 4,
      patch: 287,
    };
    await this.socket.send(
      Version,
      Version.create({
        release: options.clientName ?? '',
        versionV1: encodeMumbleVersionLegacy(version),
        versionV2: encodeMumbleVersion(version),
        os: platform(),
        osVersion: release(),
      }),
    );

    await this.ping();
  }

  private async ping() {
    return await this.socket.send(Ping, Ping.create());
  }

  private startPinger() {
    let pinging = false;
    this.pinger = setInterval(() => {
      // skip the tick while the previous ping is still being sent
      if (pinging) {
        return;
      }

      pinging = true;
      this.ping()
        .catch(error => {
          this.host.emit('error', error);
        })
        .finally(() => {
          pinging = false;
        });
    }, this.host.options.pingInterval);
  }

  /**
   * Resolves with the value `match` returns for a packet, or rejects with the
   * error it returns. Rejects when the connection ends or the timeout passes.
   */
  private waitFor<T>(
    match: (packet: PacketType) => { value: T } | Error | undefined,
    timeout?: { ms: number; error: () => Error },
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const done = () => {
        this.socket.off('packet', onPacket);
        this.ended.signal.removeEventListener('abort', onEnded);
        clearTimeout(timer);
      };
      const onPacket = (packet: PacketType) => {
        const result = match(packet);
        if (result === undefined) {
          return;
        }

        done();
        if (result instanceof Error) {
          reject(result);
        } else {
          resolve(result.value);
        }
      };
      const onEnded = () => {
        done();
        reject(new ClientDisconnectedError());
      };
      const timer =
        timeout &&
        setTimeout(() => {
          done();
          reject(timeout.error());
        }, timeout.ms);

      if (!this.isOpen) {
        onEnded();
        return;
      }

      this.socket.on('packet', onPacket);
      this.ended.signal.addEventListener('abort', onEnded);
    });
  }

  private readonly onPacket = (packet: PacketType) => {
    const { channels, users } = this.host;

    const channelState = payloadOf(packet, ChannelState);
    if (channelState) {
      channels.syncChannelState(channelState);
    }

    const channelRemove = payloadOf(packet, ChannelRemove);
    if (channelRemove) {
      channels.removeChannel(channelRemove);
    }

    const userState = payloadOf(packet, UserState);
    if (userState) {
      users.syncUser(userState);
    }

    const userRemove = payloadOf(packet, UserRemove);
    if (userRemove) {
      users.removeUser(userRemove);
      if (userRemove.session === this.session) {
        this.teardown(userRemove.reason ?? 'unknown reason');
      }
    }

    const permissionQuery = payloadOf(packet, PermissionQuery);
    if (permissionQuery?.channelId !== undefined) {
      // the server sends a flush when ACLs change, for one channel only; every other
      // cached entry may be stale too
      if (permissionQuery.flush) {
        this.permissions.clear();
      }
      this.permissions.set(
        permissionQuery.channelId,
        new Permissions(permissionQuery.permissions ?? 0),
      );
    }

    const textMessage = payloadOf(packet, TextMessage);
    if (textMessage) {
      this.host.emit('textMessage', {
        sender:
          textMessage.actor === undefined
            ? undefined
            : users.bySession(textMessage.actor),
        message: textMessage.message,
        isPrivate:
          this.session !== undefined &&
          textMessage.session.includes(this.session),
      });
    }
  };

  private readonly onAudioPacket = ({ source }: { source: number }) => {
    const speaking = this.speaking.get(source);
    if (speaking) {
      speaking.timer.refresh();
      return;
    }

    const user = this.host.users.bySession(source);
    if (!user) {
      console.warn(`unknown session: ${source}`);
      return;
    }

    this.host.emit('speakingStateChange', { user, speaking: true });
    // if no packet comes for 40 milliseconds, the user stopped talking
    const timer = setTimeout(() => this.stopSpeaking(source), 40);
    this.speaking.set(source, { user, timer });
  };

  private stopSpeaking(session: number) {
    const speaking = this.speaking.get(session);
    if (!speaking) {
      return;
    }

    clearTimeout(speaking.timer);
    this.speaking.delete(session);
    this.host.emit('speakingStateChange', {
      user: speaking.user,
      speaking: false,
    });
  }

  private readonly onClose = () => this.teardown('connection closed');
}
