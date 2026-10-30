import { tlsConnect } from './tls-connect';
import { MumbleSocket } from './mumble-socket';
import {
  ServerConfig,
  UserList,
  UserList_User,
  Version,
} from '@tf2pickup-org/mumble-protocol';
import { User } from './user';
import { ChannelManager } from './channel-manager';
import { UserManager } from './user-manager';
import { ClientOptions } from './client-options';
import { ClientDisconnectedError } from './errors';
import { Permissions } from './permissions';
import { TypedEventEmitter } from './typed-event-emitter';
import { Events } from './events';
import { CommandProps, Connection } from './connection';

const defaultOptions: Partial<ClientOptions> = {
  port: 64738,
  clientName: 'simple mumble bot',
  pingInterval: 10000,
};

interface ConnectedClient extends Client {
  socket: MumbleSocket;
  session: number;
  user: User;
  self: User;
}

export class Client extends TypedEventEmitter<Events, Events> {
  channels: ChannelManager = new ChannelManager(this);
  users: UserManager = new UserManager(this);
  readonly options: ClientOptions;

  private connection?: Connection;
  private connectAttempt = 0;

  constructor(options: ClientOptions) {
    super();
    this.options = { ...defaultOptions, ...options };
  }

  get socket(): MumbleSocket | undefined {
    return this.connection?.isOpen ? this.connection.socket : undefined;
  }

  get session(): number | undefined {
    return this.connection?.session;
  }

  get serverVersion(): Version | undefined {
    return this.connection?.serverVersion;
  }

  get serverConfig(): ServerConfig | undefined {
    return this.connection?.serverConfig;
  }

  get welcomeText(): string | undefined {
    return this.connection?.welcomeText;
  }

  /**
   * The currently logged-in user.
   * @deprecated Use Client.self
   */
  get user() {
    return this.self;
  }

  /**
   * The currently logged-in user.
   */
  get self() {
    if (!this.session) {
      return undefined;
    }

    return this.users.bySession(this.session);
  }

  /**
   * @returns true if the client is connected; false otherwise.
   */
  isConnected(): this is ConnectedClient {
    return !!this.socket;
  }

  /**
   * @throws ClientDisconnectedError if the client is not connected.
   */
  assertConnected(): asserts this is ConnectedClient {
    if (!this.socket) {
      throw new ClientDisconnectedError();
    }
  }

  /**
   * Establishes a connection to the provided Mumble server.
   * If the client is already connected, it disconnects first.
   */
  async connect(): Promise<this> {
    // taken before teardown, so that a connect() called from a 'disconnect'
    // listener supersedes this one
    const attempt = ++this.connectAttempt;
    this.connection?.teardown();
    const tlsSocket = await tlsConnect(
      this.options.host,
      this.options.port,
      this.options,
    );
    // superseded by a later connect() call
    if (attempt !== this.connectAttempt) {
      tlsSocket.end();
      throw new ClientDisconnectedError();
    }

    this.connection = new Connection(new MumbleSocket(tlsSocket), this);
    await this.connection.handshake();
    return this;
  }

  /**
   * Disconnects from the server.
   */
  disconnect(): this {
    this.connection?.teardown();
    return this;
  }

  /**
   * Wraps sending and receiving a packet in a convenient method.
   * Handles denied permissions response as well as command timeout.
   */
  async command<
    Send extends object,
    Return extends object,
    SendMore extends object[] = [],
  >(name: string, props: CommandProps<Send, Return, SendMore>) {
    this.assertConnected();
    return await this.connection!.command(name, props);
  }

  /**
   * Fetch the list of users registered with the server.
   */
  async fetchRegisteredUsers(): Promise<UserList_User[]> {
    const ret = await this.command('fetchRegisteredUsers', {
      sendPacket: [UserList, UserList.create()],
      expectPacket: [UserList, () => true],
    });
    return ret.users;
  }

  /**
   * Deregisters the user; the user does not have to be online.
   */
  async deregisterUser(userId: number): Promise<void> {
    await this.command('deregisterUser', {
      sendPackets: [
        [UserList, UserList.create({ users: [{ userId }] })],
        [UserList, UserList.create()],
      ],
      expectPacket: [UserList, () => true],
    });
  }

  /**
   * Rename registered user; the user does not have to be online.
   */
  async renameRegisteredUser(userId: number, name: string): Promise<void> {
    await this.command('renameRegisteredUser', {
      sendPackets: [
        [UserList, UserList.create({ users: [{ userId, name }] })],
        // we need to send another packet, so we can wait on the expected UserList packet
        // we cannot just listen for a UserState packet, as the user we are renaming
        // may be offline
        // unfortunately, this re-sends the entire list
        [UserList, UserList.create()],
      ],
      expectPacket: [UserList, () => true],
    });
  }

  /**
   * Permissions to the given channel, if the server has sent them.
   * @internal
   */
  cachedPermissions(channelId: number): Permissions | undefined {
    return this.connection?.permissions.get(channelId);
  }
}
