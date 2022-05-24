import { MumbleSocket } from '@/mumble-socket';
import { filterPacket } from '@/rxjs-operators/filter-packet';
import { PermissionQuery } from '@tf2pickup-org/mumble-protocol';
import { filter, take } from 'rxjs';

export const fetchChannelPermissions = async (
  socket: MumbleSocket,
  channelId: number,
): Promise<PermissionQuery> => {
  return new Promise(resolve => {
    socket.packet
      .pipe(
        filterPacket(PermissionQuery),
        filter(permissionQuery => permissionQuery.channelId === channelId),
        take(1),
      )
      .subscribe(resolve);
    socket.send(PermissionQuery, PermissionQuery.create({ channelId }));
  });
};
