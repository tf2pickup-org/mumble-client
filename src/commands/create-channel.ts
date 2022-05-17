import { PermissionDeniedError } from '@/errors';
import { MumbleSocket } from '@/mumble-socket';
import { filterPacket } from '@/rxjs-operators/filter-packet';
import { ChannelState, PermissionDenied } from '@proto/Mumble';
import { filter, race, take } from 'rxjs';

export const createChannel = async (
  socket: MumbleSocket,
  parentChannelId: number,
  channelName: string,
): Promise<number> =>
  new Promise((resolve, reject) => {
    race(
      socket.packet.pipe(
        filterPacket(ChannelState),
        filter(
          channelState =>
            channelState.parent === parentChannelId &&
            channelState.name === channelName,
        ),
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

    socket.send(
      ChannelState,
      ChannelState.create({ parent: parentChannelId, name: channelName }),
    );
  });
