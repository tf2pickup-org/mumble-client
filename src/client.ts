import { tlsConnect } from './tls-connect';
import { MumbleSocket } from './mumble-socket';
import {
  exhaustMap,
  filter,
  interval,
  lastValueFrom,
  map,
  race,
  take,
  tap,
} from 'rxjs';
import {
  Authenticate,
  ChannelRemove,
  ChannelState,
  PermissionDenied,
  permissionDenied_DenyTypeToJSON,
  Ping,
  ServerSync,
  UserState,
  Version,
} from '@proto/Mumble';
import { User } from './user';
import { isEmpty, merge } from 'lodash';
import { ChannelManager } from './channel-manager';
import { Channel } from './channel';
import { UserManager } from './user-manager';
import EventEmitter from 'events';
import { encodeMumbleVersion } from './encode-mumble-version';
import { ClientOptions } from './client-options';

const defaultOptions: Partial<ClientOptions> = {
  port: 64738,
  pingInterval: 10000,
};

export class Client extends EventEmitter {
  channels: ChannelManager = new ChannelManager(this);
  users: UserManager = new UserManager(this);
  serverVersion?: Version;
  user?: User;
  socket?: MumbleSocket;
  readonly options: ClientOptions;

  constructor(options: ClientOptions) {
    super();
    this.options = merge({}, defaultOptions, options);
  }

  async connect(): Promise<this> {
    this.socket = new MumbleSocket(
      await tlsConnect(this.options.host, this.options.port, this.options),
    );
    this.emit('socketConnected', this.socket);

    this.socket.packet
      .pipe(filter(packet => packet.$type === Version.$type))
      .subscribe(version => (this.serverVersion = version as Version));

    const initialized = lastValueFrom(
      this.socket.packet.pipe(
        filter(packet => packet.$type === ServerSync.$type),
        map(packet => packet as ServerSync),
        tap(packet => {
          this.user = this.users.bySession(packet.session);
        }),
        take(1),
        tap(() => this.emit('connected')),
        map(() => this),
      ),
    );

    await this.authenticate();
    await this.sendVersion();
    this.startPinger();
    return await initialized;
  }

  disconnect(): this {
    this.socket?.end();
    return this;
  }

  async createChannel(parent: number, name: string): Promise<Channel> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('no socket'));
        return;
      }

      race(
        this.socket.packet.pipe(
          filter(packet => packet.$type === ChannelState.$type),
          map(packet => packet as ChannelState),
          filter(
            channelState =>
              channelState.parent === parent && channelState.name === name,
          ),
          take(1),
        ),
        this.socket.packet.pipe(
          filter(message => message.$type === PermissionDenied.$type),
          map(message => message as PermissionDenied),
          take(1),
        ),
      ).subscribe(packet => {
        if (packet.$type === PermissionDenied.$type) {
          const reason = isEmpty(packet.reason)
            ? permissionDenied_DenyTypeToJSON(packet.type)
            : packet.reason;
          reject(new Error(`failed to create channel (${reason})`));
        } else {
          const channel = this.channels.byId(packet.channelId);
          if (channel) {
            resolve(channel);
          }
        }
      });

      this.socket.send(ChannelState.fromPartial({ parent, name }));
    });
  }

  async removeChannel(channelId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('no socket'));
        return;
      }

      race(
        this.socket.packet.pipe(
          filter(packet => packet.$type === ChannelRemove.$type),
          map(packet => packet as ChannelRemove),
          filter(channelRemove => channelRemove.channelId === channelId),
          take(1),
        ),
        this.socket.packet.pipe(
          filter(message => message.$type === PermissionDenied.$type),
          map(message => message as PermissionDenied),
          take(1),
        ),
      ).subscribe(packet => {
        if (packet.$type === PermissionDenied.$type) {
          const reason = isEmpty(packet.reason)
            ? permissionDenied_DenyTypeToJSON(packet.type)
            : packet.reason;
          reject(new Error(`failed to remove channel (${reason})`));
        } else {
          resolve();
        }
      });

      this.socket.send(ChannelRemove.fromPartial({ channelId }));
    });
  }

  async moveUserToChannel(
    userSession: number,
    channelId: number,
  ): Promise<User> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('no socket'));
        return;
      }

      const user = this.users.bySession(userSession);
      if (!user) {
        reject(new Error(`no such user (session=${userSession})`));
        return;
      }

      if (user.channelId === channelId) {
        resolve(user);
        return;
      }

      race(
        this.socket.packet.pipe(
          filter(packet => packet.$type === UserState.$type),
          map(packet => packet as UserState),
          filter(
            userState =>
              userState.session === userSession &&
              userState.channelId === channelId,
          ),
        ),
        this.socket.packet.pipe(
          filter(message => message.$type === PermissionDenied.$type),
          map(message => message as PermissionDenied),
          take(1),
        ),
      ).subscribe(packet => {
        if (packet.$type === PermissionDenied.$type) {
          const reason = isEmpty(packet.reason)
            ? permissionDenied_DenyTypeToJSON(packet.type)
            : packet.reason;
          reject(new Error(`failed to remove channel (${reason})`));
        } else {
          const user = this.users.bySession(userSession);
          if (user) {
            resolve(user);
          }
        }
      });

      this.socket.send(
        UserState.fromPartial({ session: userSession, channelId }),
      );
    });
  }

  private async sendVersion(): Promise<void> {
    const version = encodeMumbleVersion({
      major: 1,
      minor: 4,
      patch: 230,
    });
    return await this.socket?.send(
      Version.fromPartial({
        release: 'simple mumble bot',
        version,
      }),
    );
  }

  private async authenticate(): Promise<void> {
    return await this.socket?.send(
      Authenticate.fromPartial({ username: this.options.username }),
    );
  }

  private async ping() {
    return await this.socket?.send(Ping.fromPartial({}));
  }

  private startPinger() {
    interval(this.options.pingInterval)
      .pipe(exhaustMap(() => this.ping()))
      .subscribe();
  }
}
