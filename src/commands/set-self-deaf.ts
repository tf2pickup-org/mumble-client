import { CommandTimeout } from '@/config';
import { CommandTimedOutError } from '@/errors';
import { MumbleSocket } from '@/mumble-socket';
import { filterPacket } from '@/rxjs-operators/filter-packet';
import { UserState } from '@tf2pickup-org/mumble-protocol';
import { filter, lastValueFrom, map, take, throwError, timeout } from 'rxjs';

export const setSelfDeaf = async (
  socket: MumbleSocket,
  userSession: number,
  selfDeaf: boolean,
): Promise<boolean> => {
  const ret = lastValueFrom(
    socket.packet.pipe(
      filterPacket(UserState),
      filter(userState => userState.session === userSession),
      filter(userState => userState.selfDeaf !== undefined),
      take(1),
      map(userState => userState.selfDeaf!),
      timeout({
        first: CommandTimeout,
        with: () => throwError(() => new CommandTimedOutError('setSelfDeaf')),
      }),
    ),
  );
  await socket.send(
    UserState,
    UserState.create({ session: userSession, selfDeaf }),
  );
  return ret;
};
