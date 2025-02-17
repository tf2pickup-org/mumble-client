import { ChannelRemove, ChannelState } from '@tf2pickup-org/mumble-protocol';
import { tap } from 'rxjs';
import { Channel } from './channel';
import { Client } from './client';
import { filterPacket } from './rxjs-operators/filter-packet';
import { MumbleSocket } from './mumble-socket';

/**
 * A manager of channels.
 */
export class ChannelManager {
  private readonly _channels = new Map<number, Channel>();

  constructor(public readonly client: Client) {
    this.client.on('socketConnect', (socket: MumbleSocket) => {
      this._channels.clear();

      socket.packet
        .pipe(
          filterPacket(ChannelState),
          tap(channelState => {
            this.syncChannelState(channelState);
          }),
        )
        .subscribe();

      socket.packet
        .pipe(
          filterPacket(ChannelRemove),
          tap(channelRemove => {
            this.removeChannel(channelRemove);
          }),
        )
        .subscribe();
    });
  }

  get root() {
    return this.byId(0);
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
    return undefined;
  }

  /**
   * Resolve the channel by its full path.
   * @example
   * ```ts
   * const channel = client.channels.byPath('tf2pickup-pl', '1234', 'RED');
   * ```
   * @param channelPath The full path to the channel.
   */
  byPath(...channelPath: string[]): Channel | undefined {
    const byNameAndParent = (channelName: string, parent: number) => {
      for (const [, channel] of this._channels) {
        if (channel.name === channelName && channel.parent === parent) {
          return channel;
        }
      }
      return undefined;
    };

    let lastParent = this.byId(0);
    for (const element of channelPath) {
      if (!lastParent) {
        return undefined;
      }

      lastParent = byNameAndParent(element, lastParent.id);
    }

    return lastParent;
  }

  /**
   * Find the first channel that meets the condition specified by the predicate function.
   * @param predicate The predicate function.
   * @returns First channel that passes the predicate test, or undefined if no channel was found.
   */
  find(predicate: (channel: Channel) => boolean): Channel | undefined {
    return Array.from(this._channels.values()).find(predicate);
  }

  /**
   * Find all channels that meet the condition specified in the predicate function.
   * @param predicate The predicate function.
   * @returns List of all channels passing the predicate.
   */
  findAll(predicate: (channel: Channel) => boolean): Channel[] {
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
      const changes = channel.syncState(channelState);
      if (Object.keys(changes).length > 0) {
        /**
         * Emitted when a channel is updated.
         * @event Client#channelUpdate
         * @property {Channel} channel The channel that was updated.
         * @property {ChannelChanges} changes What changes were made to the channel.
         */
        this.client.emit('channelUpdate', channel, changes);
      }
    }
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
