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

export const unlinkChannels = async (
  socket: MumbleSocket,
  channelId: number,
  targetChannelId: number,
): Promise<void> => {
  const ret = lastValueFrom(
    race(
      socket.packet.pipe(
        filterPacket(ChannelState),
        filter(channelSync => channelSync.channelId === channelId),
        take(1),
        map(() => void 0),
        timeout({
          first: CommandTimeout,
          with: () =>
            throwError(() => new CommandTimedOutError('unlinkChannels')),
        }),
      ),
      socket.packet.pipe(
        filterPacket(PermissionDenied),
        filter(permissionDenied => permissionDenied.channelId === channelId),
        take(1),
        concatMap(permissionDenied =>
          throwError(() => new PermissionDeniedError(permissionDenied)),
        ),
      ),
    ),
  );
  await socket.send(
    ChannelState,
    ChannelState.create({ channelId, linksRemove: [targetChannelId] }),
  );
  return ret;
};
