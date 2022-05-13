import { ChannelState, PermissionQuery } from '@proto/Mumble';
import { isEmpty } from 'lodash';
import { Client } from './client';
import { User } from './user';

export class Channel {
  readonly id: number;
  name: string;
  parent: number;

  constructor(public readonly client: Client, channelState: ChannelState) {
    this.id = channelState.channelId;
    this.name = channelState.name;
    this.parent = channelState.parent;
  }

  /**
   * @internal
   */
  sync(channelState: ChannelState) {
    if (!isEmpty(channelState.name)) {
      this.name = channelState.name;
    }

    if (channelState.parent) {
      this.parent = channelState.parent;
    }
  }

  get users(): User[] {
    return this.client.users.findAll(user => user.channelId === this.id);
  }

  async createSubChannel(name: string): Promise<Channel> {
    return await this.client.createChannel(this.id, name);
  }

  async remove() {
    return await this.client.removeChannel(this.id);
  }

  async requestPermissions() {
    return this.client.socket?.send(
      PermissionQuery.fromPartial({ channelId: this.id }),
    );
  }
}
