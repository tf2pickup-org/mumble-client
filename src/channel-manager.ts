import { ChannelRemove, ChannelState } from '@proto/Mumble';
import EventEmitter from 'events';
import { filter, map, tap } from 'rxjs';
import { Channel } from './channel';
import { Client } from './client';

export class ChannelManager extends EventEmitter {
  private _channels = new Map<number, Channel>();

  constructor(public readonly client: Client) {
    super();
    this.client.connected.subscribe(socket => {
      this._channels.clear();

      socket.packet
        .pipe(
          filter(packet => packet.$type === ChannelState.$type),
          map(packet => packet as ChannelState),
          tap(channelState => this.syncChannel(channelState)),
        )
        .subscribe();

      socket.packet
        .pipe(
          filter(packet => packet.$type === ChannelRemove.$type),
          map(packet => packet as ChannelRemove),
          tap(channelRemove => this.removeChannel(channelRemove)),
        )
        .subscribe();
    });
  }

  byId(channelId: number): Channel | undefined {
    return this._channels.get(channelId);
  }

  byName(channelName: string): Channel | undefined {
    for (const [, channel] of this._channels) {
      if (channel.name === channelName) {
        return channel;
      }
    }
  }

  private syncChannel(channelState: ChannelState) {
    let channel = this.byId(channelState.channelId);
    if (!channel) {
      channel = new Channel(this.client, channelState);
      this._channels.set(channel.id, channel);
      this.emit('channelCreate', channel);
    } else {
      channel.sync(channelState);
    }
  }

  private removeChannel(channelRemove: ChannelRemove) {
    const channel = this.byId(channelRemove.channelId);
    if (channel) {
      this._channels.delete(channelRemove.channelId);
      this.emit('channelRemove', channel);
    }
  }
}
