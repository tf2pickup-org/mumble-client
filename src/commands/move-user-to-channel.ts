import { CommandTimeout } from '../config';
import { CommandTimedOutError, PermissionDeniedError } from '../errors';
import { MumbleSocket } from '../mumble-socket';
import { filterPacket } from '../rxjs-operators/filter-packet';
import { PermissionDenied, UserState } from '@tf2pickup-org/mumble-protocol';
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

export const moveUserToChannel = async (
  socket: MumbleSocket,
  userSession: number,
  channelId: number,
): Promise<void> => {
  const ret = lastValueFrom(
    race(
      socket.packet.pipe(
        filterPacket(UserState),
        filter(
          userState =>
            userState.session === userSession &&
            userState.channelId === channelId,
        ),
        take(1),
        map(() => void 0),
        timeout({
          first: CommandTimeout,
          with: () =>
            throwError(() => new CommandTimedOutError('moveUserToChannel')),
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
    UserState,
    UserState.create({ session: userSession, channelId }),
  );
  return ret;
};
