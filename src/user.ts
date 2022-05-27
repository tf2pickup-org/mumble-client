import { UserState } from '@tf2pickup-org/mumble-protocol';
import { Client } from './client';
import { Channel } from './channel';
import {
  ClientDisconnectedError,
  InsufficientPermissionsError,
  NoSuchChannelError,
} from './errors';
import { moveUserToChannel, setSelfDeaf, setSelfMute } from './commands';

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
    this.syncState(userState);
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
  syncState(userState: UserState) {
    if (userState.name !== undefined) {
      this.name = userState.name;
    }

    if (userState.channelId !== undefined) {
      this.channelId = userState.channelId;
    }

    if (userState.selfMute !== undefined) {
      this.selfMute = userState.selfMute;
    }
    if (userState.selfDeaf !== undefined) {
      this.selfDeaf = userState.selfDeaf;
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
