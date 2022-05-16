import { ChannelState, PermissionQuery } from '@proto/Mumble';
import { Client } from './client';
import { fetchChannelPermissions } from './commands';
import { InsufficientPermissionsError } from './errors';
import { Permissions } from './permissions';
import { User } from './user';

export class Channel {
  readonly id: number;
  name: string;
  parent?: number;
  private permissions?: Permissions;

  constructor(public readonly client: Client, channelState: ChannelState) {
    if (
      channelState.channelId === undefined ||
      channelState.name === undefined
    ) {
      throw new Error('invalid channelState');
    }
    this.id = channelState.channelId;
    this.name = channelState.name;
    this.parent = channelState.parent;
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

  async createSubChannel(name: string): Promise<Channel> {
    const permissions = await this.getPermissions();
    if (!permissions.canCreateChannel) {
      throw new InsufficientPermissionsError();
    }

    return await this.client.createChannel(this.id, name);
  }

  async remove() {
    const permissions = await this.getPermissions();
    if (!permissions.canRemoveChannel) {
      throw new InsufficientPermissionsError();
    }

    return await this.client.removeChannel(this.id);
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
}
