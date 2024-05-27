import { CommandTimeout } from '@/config';
import { CommandTimedOutError, PermissionDeniedError } from '@/errors';
import { MumbleSocket } from '@/mumble-socket';
import { filterPacket } from '@/rxjs-operators/filter-packet';
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

export const userRegister = async (
  socket: MumbleSocket,
  userSession: number,
): Promise<number> => {
  const ret = lastValueFrom(
    race(
      socket.packet.pipe(
        filterPacket(UserState),
        filter(
          userState =>
            userState.session === userSession
        ),
        filter(userState => userState.userId !== undefined),
        take(1),
        map(userState => userState.userId!),
        timeout({
          first: CommandTimeout,
          with: () =>
            throwError(() => new CommandTimedOutError('userRegister')),
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

  // send userId = 0 in order to trigger a register
  // https://github.com/mumble-voip/mumble/blob/master/src/mumble/ServerHandler.cpp#L987
  await socket.send(
    UserState,
    UserState.create({ session: userSession, userId: 0 }),
  );

  return ret;
};
