import { ChannelState, PermissionQuery } from '@proto/Mumble';
import { UnknownMessage } from '@proto/typeRegistry';
import { isEmpty } from 'lodash';
import { Client } from './client';
import { fetchChannelPermissions } from './commands';
import { InsufficientPermissionsError } from './errors';
import { Permissions } from './permissions';
import { User } from './user';

export class Channel {
  readonly id: number;
  name: string;
  parent: number;
  private permissions?: Permissions;

  constructor(public readonly client: Client, channelState: ChannelState) {
    this.id = channelState.channelId;
    this.name = channelState.name;
    this.parent = channelState.parent;
  }

  /**
   * @internal
   */
  sync(message: UnknownMessage) {
    switch (message.$type) {
      case ChannelState.$type: {
        const channelState = message as ChannelState;

        if (!isEmpty(channelState.name)) {
          this.name = channelState.name;
        }

        if (channelState.parent) {
          this.parent = channelState.parent;
        }
        break;
      }

      case PermissionQuery.$type: {
        const permissionQuery = message as PermissionQuery;
        this.permissions = new Permissions(permissionQuery.permissions);
        break;
      }
    }
  }

  get users(): User[] {
    return this.client.users.findAll(user => user.channelId === this.id);
  }

  async createSubChannel(name: string): Promise<Channel> {
    const permissions = await this.getPermissions();
    if (!permissions.canCreateChannel) {
      throw new InsufficientPermissionsError();
    }

    return await this.client.createChannel(this.id, name);
  }

  async remove() {
    return await this.client.removeChannel(this.id);
  }

  async getPermissions(): Promise<Permissions> {
    if (this.permissions) {
      return this.permissions;
    }

    if (!this.client.socket) {
      throw new Error('no socket');
    }

    this.permissions = new Permissions(
      (await fetchChannelPermissions(this.client.socket, this.id)).permissions,
    );
    return this.permissions;
  }
}
