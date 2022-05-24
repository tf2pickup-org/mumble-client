import { PermissionDeniedError } from '@/errors';
import { MumbleSocket } from '@/mumble-socket';
import { filterPacket } from '@/rxjs-operators/filter-packet';
import { PermissionDenied, UserState } from '@tf2pickup-org/mumble-protocol';
import { filter, race, take } from 'rxjs';

export const moveUserToChannel = async (
  socket: MumbleSocket,
  userSession: number,
  channelId: number,
): Promise<void> =>
  new Promise((resolve, reject) => {
    race(
      socket.packet.pipe(
        filterPacket(UserState),
        filter(
          userState =>
            userState.session === userSession &&
            userState.channelId === channelId,
        ),
      ),
      socket.packet.pipe(filterPacket(PermissionDenied), take(1)),
    ).subscribe(packet => {
      if (PermissionDenied.is(packet)) {
        reject(new PermissionDeniedError(packet));
      } else {
        resolve();
      }
    });

    socket.send(
      UserState,
      UserState.create({ session: userSession, channelId }),
    );
  });
