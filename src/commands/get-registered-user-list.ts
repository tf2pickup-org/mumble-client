import { MumbleSocket } from '@/mumble-socket';
import { concatMap, lastValueFrom, race, take, throwError, timeout } from 'rxjs';
import { filterPacket } from '@/rxjs-operators/filter-packet';
import { PermissionDenied, UserList } from '@tf2pickup-org/mumble-protocol';
import { CommandTimedOutError, PermissionDeniedError } from '@';
import { CommandTimeout } from '@/config';

export const getRegisteredUserList = async (
  socket: MumbleSocket,
): Promise<UserList> => {
  const ret = lastValueFrom(
    race(
      socket.packet.pipe(
        filterPacket(UserList),
        take(1),
        timeout({
          first: CommandTimeout,
          with: () =>
            throwError(() => new CommandTimedOutError('getRegisteredUserList')),
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
    UserList,
    UserList.create(),
  );

  return ret;
};
