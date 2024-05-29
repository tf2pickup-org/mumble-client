import { MumbleSocket } from '@/mumble-socket';
import { PermissionDenied, UserList } from '@tf2pickup-org/mumble-protocol';
import { concatMap, lastValueFrom, map, race, take, throwError, timeout } from 'rxjs';
import { filterPacket } from '@/rxjs-operators/filter-packet';
import { CommandTimedOutError, PermissionDeniedError } from '@';
import { CommandTimeout } from '@/config';

/**
 * 2^32 - 1
 * Returned by the murmur server as the userId upon successful deregistration
 */
export const MinusOneButUnsigned = 4294967295;

export const userUnregister = (socket: MumbleSocket, userId: number) => {
  return userRenameRegistered(socket, userId, undefined);
}

// renaming the user to an undefined name deletes the user registration
export const userRenameRegistered = async (
  socket: MumbleSocket,
  userId: number,
  name: string | undefined,
): Promise<void> => {
  const ret = lastValueFrom(
    race(
      socket.packet.pipe(
        filterPacket(UserList),
        take(1),
        map(() => void 0),
        timeout({
          first: CommandTimeout,
          with: () =>
            throwError(() => new CommandTimedOutError('userRenameRegistered')),
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
    UserList.create({users: [{ userId, name: name }]}),
  );

  // we need to send another packet, so we can wait on a UserList
  // we cannot just listen for a UserState packet, as the user we are renaming
  // may be offline
  // unfortunately, this re-sends the entire list
  await socket.send(
    UserList,
    UserList.create(),
  );

  return ret;
};