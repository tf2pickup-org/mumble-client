import { filter, takeWhile } from 'rxjs';
import { UserState } from '@tf2pickup-org/mumble-protocol';
import { Client } from './client';
import { Channel } from './channel';
import { InsufficientPermissionsError, NoSuchChannelError } from './errors';
import { filterPacket } from './rxjs-operators/filter-packet';
import { moveUserToChannel, setUserSelfMute } from './commands';

export class User {
  readonly session: number;
  name?: string;
  channelId: number;
  selfMute: boolean;
  selfDeaf: boolean;

  constructor(
    private readonly client: Client,
    userState: UserState & { session: number },
  ) {
    this.session = userState.session;
    this.name = userState.name;
    this.channelId = userState.channelId ?? 0;
    this.selfMute = userState.selfMute ?? false;
    this.selfDeaf = userState.selfDeaf ?? false;
  }

  get channel(): Channel {
    return this.client.channels.findAll(
      channel => channel.id === this.channelId,
    )[0];
  }

  /**
   * @internal
   */
  sync(userState: UserState) {
    if (userState.name !== undefined) {
      this.name = userState.name;
    }

    if (
      userState.channelId !== undefined &&
      this.channelId !== userState.channelId
    ) {
      this.channelId = userState.channelId;
    }

    if (userState.selfMute !== undefined) {
      this.selfMute = userState.selfMute;
    }
    if (userState.selfDeaf !== undefined) {
      this.selfDeaf = userState.selfDeaf;
    }
  }

  async moveToChannel(channelId: number): Promise<this> {
    if (!this.client.socket) {
      throw new Error('no socket');
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

  async setSelfMute(selfMute: boolean): Promise<this> {
    if (!this.client.socket) {
      throw new Error('no socket');
    }

    await setUserSelfMute(this.client.socket, this.session, selfMute);
    return this;
  }

  setSelfDeaf(selfDeaf: boolean): Promise<void> {
    return new Promise(resolve => {
      this.client.socket?.packet
        .pipe(
          filterPacket(UserState),
          filter(userState => userState.session === this.session),
          takeWhile(userState => userState.selfDeaf === selfDeaf, true),
        )
        .subscribe(() => resolve());

      this.client.socket?.send(
        UserState,
        UserState.create({ session: this.session, selfDeaf }),
      );
    });
  }
}
