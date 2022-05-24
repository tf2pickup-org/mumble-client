import { MumbleSocket } from '@/mumble-socket';
import { filterPacket } from '@/rxjs-operators/filter-packet';
import { ChannelState } from '@tf2pickup-org/mumble-protocol';
import { filter, take } from 'rxjs';

export const unlinkChannels = async (
  socket: MumbleSocket,
  channelId: number,
  targetChannelId: number,
): Promise<void> => {
  return new Promise(resolve => {
    socket.packet
      .pipe(
        filterPacket(ChannelState),
        filter(channelSync => channelSync.channelId === channelId),
        take(1),
      )
      .subscribe(() => resolve());
    socket.send(
      ChannelState,
      ChannelState.create({ channelId, linksRemove: [targetChannelId] }),
    );
  });
};
