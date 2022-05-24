import { tlsConnect } from './tls-connect';
import { MumbleSocket } from './mumble-socket';
import { delay, exhaustMap, interval, map, race, take, tap, zip } from 'rxjs';
import {
  Authenticate,
  Ping,
  Reject,
  ServerConfig,
  ServerSync,
  Version,
} from '@tf2pickup-org/mumble-protocol';
import { User } from './user';
import { ChannelManager } from './channel-manager';
import { UserManager } from './user-manager';
import EventEmitter from 'events';
import { encodeMumbleVersion } from './encode-mumble-version';
import { ClientOptions } from './client-options';
import { ConnectionRejectedError } from './errors';
import { filterPacket } from './rxjs-operators/filter-packet';

const defaultOptions: Partial<ClientOptions> = {
  port: 64738,
  pingInterval: 10000,
};

export class Client extends EventEmitter {
  channels: ChannelManager = new ChannelManager(this);
  users: UserManager = new UserManager(this);
  serverVersion?: Version;
  serverConfig?: ServerConfig;
  user?: User;
  socket?: MumbleSocket;
  welcomeText?: string;
  readonly options: ClientOptions;

  constructor(options: ClientOptions) {
    super();
    this.options = { ...defaultOptions, ...options };
  }

  async connect(): Promise<this> {
    this.socket = new MumbleSocket(
      await tlsConnect(this.options.host, this.options.port, this.options),
    );
    this.emit('socketConnected', this.socket);

    const initialize: Promise<this> = new Promise((resolve, reject) =>
      race(
        zip(
          (this.socket as MumbleSocket).packet.pipe(
            filterPacket(ServerSync),
            take(1),
          ),
          (this.socket as MumbleSocket).packet.pipe(
            filterPacket(ServerConfig),
            take(1),
          ),
          (this.socket as MumbleSocket).packet.pipe(
            filterPacket(Version),
            take(1),
          ),
          (this.socket as MumbleSocket).packet.pipe(
            filterPacket(Ping),
            take(1),
          ),
        ).pipe(
          // Add one second delay before resolving the promise for good.
          // The issue is, in case of rejected connect, the mumble server will
          // send all the same packets (version, serverConfig, etc.) and send the
          // Reject packet at the very end.
          // FIXME Find a way to detect rejected connection without adding a delay
          delay(1000),
          tap(([serverSync, serverConfig, version]) => {
            if (serverSync.session) {
              this.user = this.users.bySession(serverSync.session);
            }
            this.welcomeText = serverSync.welcomeText;
            this.serverVersion = version;
            this.serverConfig = serverConfig;
            this.emit('connect');
            this.startPinger();
          }),
          map(([serverSync]) => serverSync),
        ),
        (this.socket as MumbleSocket).packet.pipe(filterPacket(Reject)),
      ).subscribe(message => {
        if (Reject.is(message)) {
          reject(new ConnectionRejectedError(message));
        } else {
          resolve(this);
        }
      }),
    );

    await this.authenticate();
    await this.sendVersion();
    this.ping();
    return await initialize;
  }

  disconnect(): this {
    this.emit('disconnect');
    this.socket?.end();
    this.socket = undefined;
    return this;
  }

  /**
   * @internal
   */
  private async sendVersion(): Promise<void> {
    const version = encodeMumbleVersion({
      major: 1,
      minor: 4,
      patch: 230,
    });
    return await this.socket?.send(
      Version,
      Version.create({
        release: 'simple mumble bot',
        version,
      }),
    );
  }

  /**
   * @internal
   */
  private async authenticate(): Promise<void> {
    return await this.socket?.send(
      Authenticate,
      Authenticate.create({ username: this.options.username }),
    );
  }

  /**
   * @internal
   */
  private async ping() {
    return await this.socket?.send(Ping, Ping.create());
  }

  /**
   * @internal
   */
  private startPinger() {
    const subscription = interval(this.options.pingInterval)
      .pipe(exhaustMap(() => this.ping()))
      .subscribe();
    this.on('disconnect', () => subscription.unsubscribe());
  }
}
