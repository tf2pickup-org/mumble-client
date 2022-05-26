import { ChannelState } from '@tf2pickup-org/mumble-protocol';
import { Client } from './client';
import {
  createChannel,
  fetchChannelPermissions,
  linkChannels,
  removeChannel,
  unlinkChannels,
} from './commands';
import { InsufficientPermissionsError, NoSuchChannelError } from './errors';
import { Permissions } from './permissions';
import { User } from './user';

export class Channel {
  readonly id: number;
  name?: string;
  parent?: number;
  temporary: boolean;
  private links: number[] = [];

  constructor(
    public readonly client: Client,
    channelState: ChannelState & { channelId: number },
  ) {
    this.id = channelState.channelId;
    this.name = channelState.name;
    this.parent = channelState.parent;
    this.links = [...channelState.links];
    this.temporary = channelState.temporary ?? false;
  }

  /**
   * @internal
   */
  syncState(channelState: ChannelState) {
    if (channelState.name !== undefined) {
      this.name = channelState.name;
    }

    if (channelState.parent !== undefined) {
      this.parent = channelState.parent;
    }

    if (channelState.temporary !== undefined) {
      this.temporary = channelState.temporary;
    }

    this.links = [
      ...new Set([
        ...this.links,
        ...channelState.links,
        ...channelState.linksAdd,
      ]),
    ].filter(l => !channelState.linksRemove.includes(l));
  }

  get users(): User[] {
    return this.client.users.findAll(user => user.channelId === this.id);
  }

  get subChannels(): Channel[] {
    return this.client.channels.findAll(channel => channel.parent === this.id);
  }

  get linkedChannels(): Channel[] {
    return this.links
      .map(ch => this.client.channels.byId(ch))
      .filter(ch => ch !== undefined) as Channel[];
  }

  async createSubChannel(name: string): Promise<Channel> {
    if (!this.client.socket) {
      throw new Error('no socket');
    }

    const permissions = await this.getPermissions();
    if (!permissions.canCreateChannel) {
      throw new InsufficientPermissionsError();
    }

    const newChannelId = await createChannel(this.client.socket, this.id, name);
    return this.client.channels.byId(newChannelId) as Channel;
  }

  async remove() {
    if (!this.client.socket) {
      throw new Error('no socket');
    }

    const permissions = await this.getPermissions();
    if (!permissions.canRemoveChannel) {
      throw new InsufficientPermissionsError();
    }

    await removeChannel(this.client.socket, this.id);
    return this;
  }

  async getPermissions(): Promise<Permissions> {
    if (this.client.permissions.has(this.id)) {
      return this.client.permissions.get(this.id) as Permissions;
    }

    if (!this.client.socket) {
      throw new Error('no socket');
    }

    return new Permissions(
      (await fetchChannelPermissions(this.client.socket, this.id))
        .permissions ?? 0,
    );
  }

  async link(otherChannel: Channel | number): Promise<this> {
    if (!this.client.socket) {
      throw new Error('no socket');
    }

    if (!(await this.getPermissions()).canLinkChannel) {
      throw new InsufficientPermissionsError();
    }

    const targetChannel =
      typeof otherChannel === 'number'
        ? this.client.channels.byId(otherChannel)
        : otherChannel;
    if (targetChannel === undefined) {
      throw new NoSuchChannelError(`${otherChannel}`);
    }

    if (!(await targetChannel.getPermissions()).canLinkChannel) {
      throw new InsufficientPermissionsError();
    }

    await linkChannels(this.client.socket, this.id, targetChannel.id);
    return this;
  }

  async unlink(otherChannel: Channel | number): Promise<this> {
    if (!this.client.socket) {
      throw new Error('no socket');
    }

    if (!(await this.getPermissions()).canLinkChannel) {
      throw new InsufficientPermissionsError();
    }

    const targetChannel =
      typeof otherChannel === 'number'
        ? this.client.channels.byId(otherChannel)
        : otherChannel;
    if (targetChannel === undefined) {
      throw new NoSuchChannelError(`${otherChannel}`);
    }

    if (!(await targetChannel.getPermissions()).canLinkChannel) {
      throw new InsufficientPermissionsError();
    }

    await unlinkChannels(this.client.socket, this.id, targetChannel.id);
    return this;
  }
}
