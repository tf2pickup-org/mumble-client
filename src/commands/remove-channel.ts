import { PermissionDeniedError } from '@/errors';
import { MumbleSocket } from '@/mumble-socket';
import { filterPacket } from '@/rxjs-operators/filter-packet';
import { ChannelRemove, PermissionDenied } from '@proto/Mumble';
import { filter, race, take } from 'rxjs';

export const removeChannel = async (
  socket: MumbleSocket,
  channelId: number,
): Promise<number> =>
  new Promise((resolve, reject) => {
    race(
      socket.packet.pipe(
        filterPacket(ChannelRemove),
        filter(channelRemove => channelRemove.channelId === channelId),
        take(1),
      ),
      socket.packet.pipe(filterPacket(PermissionDenied), take(1)),
    ).subscribe(packet => {
      if (PermissionDenied.is(packet)) {
        reject(new PermissionDeniedError(packet));
      } else {
        resolve(packet.channelId as number);
      }
    });

    socket.send(ChannelRemove, ChannelRemove.create({ channelId }));
  });
