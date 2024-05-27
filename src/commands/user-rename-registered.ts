import { CommandTimeout } from '@/config';
import { CommandTimedOutError, NoRegisteredUserError, PermissionDeniedError } from '@/errors';
import { MumbleSocket } from '@/mumble-socket';
import { filterPacket } from '@/rxjs-operators/filter-packet';
import { PermissionDenied, UserList} from '@tf2pickup-org/mumble-protocol';
import {
  concatMap,
  lastValueFrom,
  map,
  race,
  take,
  throwError,
  timeout,
} from 'rxjs';

// renaming the user to an undefined name deletes the user registration
export const userRenameRegistered = async (
  socket: MumbleSocket,
  userId: number,
  name: string | undefined,
): Promise<void> => {
  return await socket.send(
    UserList,
    UserList.create({users: [{ userId, name: name }]}),
  );
};

export const userRenameRegisteredByName = async (
  socket: MumbleSocket,
  oldName: string,
  newName: string | undefined,
): Promise<void> => {
  const ret = lastValueFrom(
    race(
      socket.packet.pipe(
        filterPacket(UserList),
        take(1),
        map(userList => userList.users.find(u => u.name === oldName)),
        map(userListUser => {
          if (!userListUser) {
            throwError(() => new NoRegisteredUserError())
          }
          return userListUser!;
        }),
        map(async userListUser => {
          console.log(userListUser);
          await socket.send(
            UserList,
            UserList.create({users: [{ ...userListUser, name: newName }]}),
          );
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
