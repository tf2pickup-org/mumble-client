import { CommandTimeout } from '@/config';
import { CommandTimedOutError } from '@/errors';
import { MumbleSocket } from '@/mumble-socket';
import { filterPacket } from '@/rxjs-operators/filter-packet';
import { PermissionQuery } from '@tf2pickup-org/mumble-protocol';
import { filter, lastValueFrom, take, throwError, timeout } from 'rxjs';

export const fetchChannelPermissions = async (
  socket: MumbleSocket,
  channelId: number,
): Promise<PermissionQuery> => {
  const ret = lastValueFrom(
    socket.packet.pipe(
      filterPacket(PermissionQuery),
      filter(permissionQuery => permissionQuery.channelId === channelId),
      take(1),
      timeout({
        first: CommandTimeout,
        with: () =>
          throwError(() => new CommandTimedOutError('fetchChannelPermissions')),
      }),
    ),
  );

  // Send TWO PermissionQuery packets; if we send only one, the mumble server might not respond,
  // causing the command to time out.
  // I have no idea what is going on here, but I'm either dumb or mumble server is bugged as heck.
  [0, 1].forEach(() =>
    socket.send(PermissionQuery, PermissionQuery.create({ channelId })),
  );
  return ret;
};
