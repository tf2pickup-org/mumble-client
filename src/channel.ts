import { ChannelState, PermissionQuery } from '@proto/Mumble';
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
  private permissions?: Permissions;
  private links: number[] = [];

  constructor(
    public readonly client: Client,
    channelState: ChannelState & { channelId: number },
  ) {
    this.id = channelState.channelId;
    this.name = channelState.name;
    this.parent = channelState.parent;
    this.links = [...channelState.links];
  }

  /**
   * @internal
   */
  sync(message: unknown) {
    if (ChannelState.is(message)) {
      if (message.name !== undefined) {
        this.name = message.name;
      }

      if (message.parent !== undefined) {
        this.parent = message.parent;
      }

      this.links = [
        ...new Set([...this.links, ...message.links, ...message.linksAdd]),
      ].filter(l => !message.linksRemove.includes(l));
    } else if (PermissionQuery.is(message)) {
      if (message.permissions !== undefined) {
        this.permissions = new Permissions(message.permissions);
      }
    }
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
    if (this.permissions) {
      return this.permissions;
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
