import { MumbleSocket } from '@/mumble-socket';
import { concatMap, lastValueFrom, map, race, take, throwError, timeout } from 'rxjs';
import { filterPacket } from '@/rxjs-operators/filter-packet';
import { PermissionDenied, UserList, UserList_User } from '@tf2pickup-org/mumble-protocol';
import { CommandTimedOutError, NoRegisteredUserError, PermissionDeniedError } from '@';
import { CommandTimeout } from '@/config';

export const getRegisteredUser = async (
  socket: MumbleSocket,
  name: string,
): Promise<UserList_User> => {
  const ret = lastValueFrom(
    race(
      socket.packet.pipe(
        filterPacket(UserList),
        take(1),
        map(userList => userList.users.find(u => u.name === name)),
        map(userListUser => {
          if (!userListUser) {
            throwError(() => new NoRegisteredUserError())
          }
          return userListUser!;
        }),
        timeout({
          first: CommandTimeout,
          with: () =>
            throwError(() => new CommandTimedOutError('userRegisterDelete')),
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
