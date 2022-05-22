import { CommandTimeout } from '@/config';
import { MumbleSocket } from '@/mumble-socket';
import { filterPacket } from '@/rxjs-operators/filter-packet';
import { ChannelState } from '@proto/Mumble';
import { filter, race, take, timer } from 'rxjs';

export const linkChannels = async (
  socket: MumbleSocket,
  channelId: number,
  targetChannelId: number,
): Promise<void> => {
  return new Promise(resolve => {
    race(
      socket.packet.pipe(
        filterPacket(ChannelState),
        filter(channelSync => channelSync.channelId === channelId),
        take(1),
      ),
      timer(CommandTimeout),
    ).subscribe(() => resolve());
    socket.send(
      ChannelState,
      ChannelState.create({ channelId, linksAdd: [targetChannelId] }),
    );
  });
};
