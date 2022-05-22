import { CommandTimeout } from '@/config';
import { CommandTimedOutError, PermissionDeniedError } from '@/errors';
import { MumbleSocket } from '@/mumble-socket';
import { filterPacket } from '@/rxjs-operators/filter-packet';
import { ChannelState, PermissionDenied } from '@proto/Mumble';
import { filter, race, take, timer } from 'rxjs';

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
      timer(CommandTimeout),
    ).subscribe(packet => {
      if (PermissionDenied.is(packet)) {
        reject(new PermissionDeniedError(packet));
      } else if (ChannelState.is(packet)) {
        resolve(packet.channelId as number);
      } else {
        reject(new CommandTimedOutError('createChannel'));
      }
    });

    socket.send(
      ChannelState,
      ChannelState.create({ parent: parentChannelId, name: channelName }),
    );
  });
