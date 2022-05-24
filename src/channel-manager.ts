import { ChannelRemove, ChannelState, PermissionQuery } from '@tf2pickup-org/mumble-protocol';
import { tap } from 'rxjs';
import { Channel } from './channel';
import { Client } from './client';
import { filterPacket } from './rxjs-operators/filter-packet';
import { MumbleSocket } from './mumble-socket';

export class ChannelManager {
  private _channels = new Map<number, Channel>();

  constructor(public readonly client: Client) {
    this.client.on('socketConnected', (socket: MumbleSocket) => {
      this._channels.clear();

      socket.packet
        .pipe(
          filterPacket(ChannelState),
          tap(channelState => this.syncChannelState(channelState)),
        )
        .subscribe();

      socket.packet
        .pipe(
          filterPacket(ChannelRemove),
          tap(channelRemove => this.removeChannel(channelRemove)),
        )
        .subscribe();

      socket.packet
        .pipe(
          filterPacket(PermissionQuery),
          tap(permissionQuery => this.syncChannelPermissions(permissionQuery)),
        )
        .subscribe();
    });
  }

  /**
   * Resolve the channel by the channel id.
   * @param channelId The id of the channel to find.
   */
  byId(channelId: number): Channel | undefined {
    return this._channels.get(channelId);
  }

  /**
   * Resolve the channel by its name.
   * @param channelName The name of the channel.
   */
  byName(channelName: string): Channel | undefined {
    for (const [, channel] of this._channels) {
      if (channel.name === channelName) {
        return channel;
      }
    }
  }

  /**
   * Resolve the channel by its full path.
   * @example
   * const channel = client.channels.byPath('tf2pickup-pl', '1234', 'RED');
   * @param channelPath The full path to the channel.
   */
  byPath(...channelPath: string[]): Channel | undefined {
    const byNameAndParent = (channelName: string, parent: number) => {
      for (const [, channel] of this._channels) {
        if (channel.name === channelName && channel.parent === parent) {
          return channel;
        }
      }
    };

    let lastParent = this.byId(0);
    for (const element of channelPath) {
      if (!lastParent) {
        return undefined;
      }

      lastParent = byNameAndParent(element, lastParent?.id);
    }

    return lastParent;
  }

  findAll(predicate: (Channel: Channel) => boolean): Channel[] {
    return Array.from(this._channels.values()).filter(predicate);
  }

  /**
   * @internal
   */
  private syncChannelState(channelState: ChannelState) {
    if (channelState.channelId === undefined) {
      return;
    }

    let channel = this.byId(channelState.channelId);
    if (!channel) {
      channel = new Channel(
        this.client,
        channelState as ChannelState & { channelId: number },
      );
      this._channels.set(channel.id, channel);
      /**
       * Emitted whenever a channel is created.
       * @event Client#channelCreate
       * @property {Channel} channel The channel that was created.
       */
      this.client.emit('channelCreate', channel);
    } else {
      channel.sync(channelState);
    }
  }

  /**
   * @internal
   */
  private syncChannelPermissions(permissionQuery: PermissionQuery) {
    if (permissionQuery.channelId === undefined) {
      return;
    }
    this.byId(permissionQuery.channelId)?.sync(permissionQuery);
  }

  /**
   * @internal
   */
  private removeChannel(channelRemove: ChannelRemove) {
    const channel = this.byId(channelRemove.channelId);
    if (channel) {
      this._channels.delete(channelRemove.channelId);
      /**
       * Emitted whenever a channel gets deleted.
       * @event Client#channelRemove
       * @property {Channel} channel The channel that was removed.
       */
      this.client.emit('channelRemove', channel);
    }
  }
}
