import { UserState } from '@tf2pickup-org/mumble-protocol';
import { Client } from './client';
import { Channel } from './channel';
import {
  ClientDisconnectedError,
  InsufficientPermissionsError,
  NoRegisteredUserError,
  NoSuchChannelError,
} from './errors';
import { moveUserToChannel, setSelfDeaf, setSelfMute, userRegister, userRenameRegistered } from './commands';
import { Change } from './change';
import { syncProperty, syncPropertyWithMapper } from './sync-property';

type UserWritableProps = Pick<
  User,
  'name' | 'channelId' | 'mute' | 'deaf' | 'suppress' | 'selfMute' | 'selfDeaf'
>;

export type UserChanges = {
  [P in keyof UserWritableProps]?: Change<User[P]>;
};

/**
 * Represents a single user connected to the server.
 */
export class User {
  readonly session: number;
  name?: string;
  channelId = 0;
  userId?: number; // null userid means the user is not registered
  mute = false;
  deaf = false;
  suppress = false;
  selfMute = false;
  selfDeaf = false;

  constructor(
    private readonly client: Client,
    userState: UserState & { session: number },
  ) {
    this.session = userState.session;
    this.name = userState.name;
    this.syncState(userState);
  }

  /**
   * A channel on which the user currently is.
   */
  get channel(): Channel {
    return this.client.channels.find(channel => channel.id === this.channelId)!;
  }

  /**
   * @internal
   */
  syncState(userState: UserState): UserChanges {
    const changes: UserChanges = {
      ...syncProperty(this, 'name', userState.name),
      ...syncProperty(this, 'channelId', userState.channelId),
      // -1 is returned to signal successful user registration deletion
      ...syncPropertyWithMapper(this, 'userId', (v) => v === 4294967295 ? undefined : v , userState.userId),
      ...syncProperty(this, 'mute', userState.mute),
      ...syncProperty(this, 'deaf', userState.deaf),
      ...syncProperty(this, 'suppress', userState.suppress),
      ...syncProperty(this, 'selfMute', userState.selfMute),
      ...syncProperty(this, 'selfDeaf', userState.selfDeaf),
    };
    return changes;
  }

  /**
   * Move the user to the given channel.
   * @param channelId The ID of the target channel.
   * @returns This user.
   */
  async moveToChannel(channelId: number): Promise<this> {
    if (!this.client.socket) {
      throw new ClientDisconnectedError();
    }

    if (this.channelId === channelId) {
      return this;
    }

    const channel = this.client.channels.byId(channelId);
    if (!channel) {
      throw new NoSuchChannelError(channelId);
    }

    if (!(await channel.getPermissions()).canJoinChannel) {
      throw new InsufficientPermissionsError();
    }

    await moveUserToChannel(this.client.socket, this.session, channelId);
    return this;
  }

  /**
   * Set self-mute of the user to the given value. Note: this call is valid only
   * for the client's user.
   * @param selfMute The selfMute property.
   * @returns This user.
   */
  async setSelfMute(selfMute: boolean): Promise<this> {
    if (!this.client.socket) {
      throw new ClientDisconnectedError();
    }

    await setSelfMute(this.client.socket, this.session, selfMute);
    return this;
  }

  /**
   * Set self-deaf of the user to the given value. Note: this call is valid only
   * for the client's user.
   * @param selfDeaf The selfDeaf property.
   * @returns This user.
   */
  async setSelfDeaf(selfDeaf: boolean): Promise<this> {
    if (!this.client.socket) {
      throw new ClientDisconnectedError();
    }

    await setSelfDeaf(this.client.socket, this.session, selfDeaf);
    return this;
  }

  /**
   * Registers the user.
   * @returns This user.
   */
  async register(): Promise<this> {
    if (!this.client.socket) {
      throw new ClientDisconnectedError();
    }

    await userRegister(this.client.socket, this.session);
    return this;
  }

  /**
   * De-registers the user if the user is registered.
   * @returns This user.
   */
  async deregister(): Promise<this> {
    if (!this.client.socket) {
      throw new ClientDisconnectedError();
    }

    if (!this.userId) {
      throw new NoRegisteredUserError();
    }

    await userRenameRegistered(this.client.socket, this.userId, undefined);
    return this;
  }

  /**
   * Renames a registered user.
   * @returns This user.
   */
  async renameRegistered(name: string): Promise<this> {
    if (!this.client.socket) {
      throw new ClientDisconnectedError();
    }

    if (!this.userId) {
      throw new NoRegisteredUserError();
    }

    await userRenameRegistered(this.client.socket, this.userId, name);
    return this;
  }
}
