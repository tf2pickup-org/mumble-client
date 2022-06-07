import { UserState } from '@tf2pickup-org/mumble-protocol';
import { Client } from './client';
import { Channel } from './channel';
import {
  ClientDisconnectedError,
  InsufficientPermissionsError,
  NoSuchChannelError,
} from './errors';
import { moveUserToChannel, setSelfDeaf, setSelfMute } from './commands';
import { Change } from './change';
import { EventNames } from './event-names';

export type UserChanges = {
  [P in keyof Omit<User, 'session'>]?: Change<User[P]>;
};

/**
 * Represents a single user connected to the server.
 */
export class User {
  readonly session: number;
  name?: string;
  channelId = 0;
  selfMute = false;
  selfDeaf = false;

  constructor(
    private readonly client: Client,
    userState: UserState & { session: number },
  ) {
    this.session = userState.session;
    this.name = userState.name;
    this.syncState(userState, false);
  }

  /**
   * A channel on which the user currently is.
   */
  get channel(): Channel {
    return this.client.channels.find(
      channel => channel.id === this.channelId,
    ) as Channel;
  }

  /**
   * @internal
   */
  syncState(userState: UserState, emitUpdate = true) {
    const changes: UserChanges = {};

    if (userState.name !== undefined) {
      changes.name = {
        previousValue: `${this.name}`,
        currentValue: `${userState.name}`,
      };
      this.name = userState.name;
    }

    if (userState.channelId !== undefined) {
      changes.channelId = {
        previousValue: this.channelId,
        currentValue: userState.channelId,
      };
      this.channelId = userState.channelId;
    }

    if (userState.selfMute !== undefined) {
      changes.selfMute = {
        previousValue: this.selfMute,
        currentValue: userState.selfMute,
      };
      this.selfMute = userState.selfMute;
    }

    if (userState.selfDeaf !== undefined) {
      changes.selfDeaf = {
        previousValue: this.selfDeaf,
        currentValue: userState.selfDeaf,
      };
      this.selfDeaf = userState.selfDeaf;
    }

    if (emitUpdate && Object.keys(changes).length > 0) {
      /**
       * Emitted when a user is updated.
       * @event Client#userUpdate
       * @property {User} user The user that was updated.
       * @property {UserChanges} changes What changes were made to the user.
       */
      this.client.emit(EventNames.userUpdate, this, changes);
    }
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
}
