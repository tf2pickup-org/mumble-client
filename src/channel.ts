import { ChannelState } from '@proto/Mumble';
import { isEmpty } from 'lodash';
import { MumbleClient } from './mumble-client';
import { User } from './user';

export class Channel {
  readonly id: number;
  name: string;
  parent: number;
  users: User[] = [];

  constructor(
    public readonly client: MumbleClient,
    channelState: ChannelState,
  ) {
    this.id = channelState.channelId;
    this.name = channelState.name;
    this.parent = channelState.parent;
  }

  sync(channelState: ChannelState) {
    if (!isEmpty(channelState.name)) {
      this.name = channelState.name;
    }

    if (channelState.parent) {
      this.parent = channelState.parent;
    }
  }

  async createSubChannel(name: string): Promise<Channel> {
    return await this.client.createChannel(this.id, name);
  }

  async remove() {
    return await this.client.removeChannel(this.id);
  }
}
