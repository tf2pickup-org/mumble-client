import { MumbleSocket } from '@/mumble-socket';
import { PermissionQuery } from '@proto/Mumble';
import { filter, map, take } from 'rxjs';

export const fetchChannelPermissions = async (
  socket: MumbleSocket,
  channelId: number,
): Promise<PermissionQuery> => {
  return new Promise(resolve => {
    socket.packet
      .pipe(
        filter(packet => packet.$type === PermissionQuery.$type),
        map(packet => packet as PermissionQuery),
        filter(permissionQuery => permissionQuery.channelId === channelId),
        take(1),
      )
      .subscribe(resolve);
    socket.send(PermissionQuery.fromPartial({ channelId }));
  });
};
