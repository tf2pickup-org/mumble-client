import {
  concatMap,
  debounceTime,
  exhaustMap,
  filter,
  groupBy,
  interval,
  lastValueFrom,
  race,
  Subject,
  switchMap,
  take,
  takeUntil,
  throwError,
  throwIfEmpty,
  timeout,
  zip,
} from 'rxjs';
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
  UserRemove,
  UserState,
  Version,
} from '@tf2pickup-org/mumble-protocol';
import { MessageType } from '@protobuf-ts/runtime';
import { platform, release } from 'os';
import { Client } from './client';
import { MumbleSocket } from './mumble-socket';
import { Permissions } from './permissions';
import { filterPacket } from './rxjs-operators/filter-packet';
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

  private readonly ended = new Subject<void>();
  private isEnded = false;
  private isReady = false;

  constructor(
    readonly socket: MumbleSocket,
    private readonly host: ConnectionHost,
  ) {
    const packet = socket.packet.pipe(takeUntil(this.ended));
    host.channels.clear();
    host.users.clear();

    packet.pipe(filterPacket(ChannelState)).subscribe(channelState => {
      host.channels.syncChannelState(channelState);
    });
    packet.pipe(filterPacket(ChannelRemove)).subscribe(channelRemove => {
      host.channels.removeChannel(channelRemove);
    });
    packet.pipe(filterPacket(UserState)).subscribe(userState => {
      host.users.syncUser(userState);
    });
    packet.pipe(filterPacket(UserRemove)).subscribe(userRemove => {
      host.users.removeUser(userRemove);
      if (userRemove.session === this.session) {
        this.teardown(userRemove.reason ?? 'unknown reason');
      }
    });
    packet
      .pipe(
        filterPacket(PermissionQuery),
        filter(permissionQuery => permissionQuery.channelId !== undefined),
      )
      .subscribe(permissionQuery => {
        this.permissions.set(
          permissionQuery.channelId!,
          new Permissions(permissionQuery.permissions ?? 0),
        );
      });
    // the packet observable completes when the server closes the connection
    socket.packet.subscribe({
      complete: () => this.teardown('connection closed'),
    });

    socket.audioPacket
      .pipe(
        takeUntil(this.ended),
        groupBy(packet => packet.source),
      )
      .subscribe(group => {
        const user = host.users.bySession(group.key);
        if (!user) {
          console.warn(`unknown session: ${group.key}`);
          return;
        }

        let speaking = false;

        group.pipe(filter(() => !speaking)).subscribe(() => {
          speaking = true;
          host.emit('speakingStateChange', { user, speaking });
        });

        // if no packet comes for 40 milliseconds, the user stopped talking
        group.pipe(debounceTime(40)).subscribe(() => {
          speaking = false;
          host.emit('speakingStateChange', { user, speaking });
        });
      });
  }

  get isOpen(): boolean {
    return !this.isEnded;
  }

  /**
   * Authenticates and waits for the server to sync.
   * Tears the connection down if the handshake fails.
   */
  async handshake(): Promise<void> {
    const synced = lastValueFrom(
      race(
        zip(
          this.socket.packet.pipe(filterPacket(ServerSync), take(1)),
          this.socket.packet.pipe(filterPacket(ServerConfig), take(1)),
          this.socket.packet.pipe(filterPacket(Version), take(1)),
        ),
        this.socket.packet.pipe(
          filterPacket(Reject),
          switchMap(reject =>
            throwError(() => new ConnectionRejectedError(reject)),
          ),
        ),
      ).pipe(
        takeUntil(this.ended),
        // completes without a value when the connection ends first, e.g. when
        // the server drops it without a Reject packet (mumble 1.6.x on failed
        // superuser auth)
        throwIfEmpty(() => new ClientDisconnectedError()),
      ),
    );

    let serverSync: ServerSync, serverConfig: ServerConfig, version: Version;
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
    if (this.isEnded) {
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
    if (this.isEnded) {
      throw new ClientDisconnectedError();
    }

    const ret = lastValueFrom(
      race(
        this.socket.packet.pipe(
          filterPacket(props.expectPacket[0]),
          filter(props.expectPacket[1]),
          take(1),
          timeout({
            first: CommandTimeout,
            with: () => throwError(() => new CommandTimedOutError(name)),
          }),
        ),
        this.socket.packet.pipe(
          filterPacket(PermissionDenied),
          filter(pd => pd.session === this.session),
          take(1),
          concatMap(pd => throwError(() => new PermissionDeniedError(pd))),
        ),
      ).pipe(
        takeUntil(this.ended),
        throwIfEmpty(() => new ClientDisconnectedError()),
      ),
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
    if (this.isEnded) {
      return;
    }

    this.isEnded = true;
    this.ended.next();
    this.ended.complete();
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
    interval(this.host.options.pingInterval)
      .pipe(
        takeUntil(this.ended),
        exhaustMap(() =>
          this.ping().catch(error => {
            this.host.emit('error', error);
          }),
        ),
      )
      .subscribe();
  }
}
