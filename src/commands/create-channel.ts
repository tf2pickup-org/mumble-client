import { CommandTimeout } from '@/config';
import { CommandTimedOutError, PermissionDeniedError } from '@/errors';
import { MumbleSocket } from '@/mumble-socket';
import { filterPacket } from '@/rxjs-operators/filter-packet';
import { ChannelState, PermissionDenied } from '@tf2pickup-org/mumble-protocol';
import {
  concatMap,
  filter,
  lastValueFrom,
  map,
  race,
  take,
  throwError,
  timeout,
} from 'rxjs';

export const createChannel = async (
  socket: MumbleSocket,
  parentChannelId: number,
  channelName: string,
): Promise<number> => {
  const ret = lastValueFrom(
    race(
      socket.packet.pipe(
        filterPacket(ChannelState),
        filter(
          channelState =>
            channelState.parent === parentChannelId &&
            channelState.name === channelName,
        ),
        take(1),
        map(channelState => channelState.channelId!),
        timeout({
          first: CommandTimeout,
          with: () =>
            throwError(() => new CommandTimedOutError('createChannel')),
        }),
      ),
      socket.packet.pipe(
        filterPacket(PermissionDenied),
        take(1),
        concatMap(permissionDenied =>
          throwError(() => new PermissionDeniedError(permissionDenied)),
        ),
      ),
    ),
  );

  await socket.send(
    ChannelState,
    ChannelState.create({ parent: parentChannelId, name: channelName }),
  );
  return ret;
};
