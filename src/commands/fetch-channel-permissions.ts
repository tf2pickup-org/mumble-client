import { MumbleSocket } from '@/mumble-socket';
import { PermissionQuery } from '@proto/Mumble';
import { filter, take } from 'rxjs';

export const fetchChannelPermissions = async (
  socket: MumbleSocket,
  channelId: number,
): Promise<PermissionQuery> => {
  return new Promise(resolve => {
    socket.packet
      .pipe(
        filter(PermissionQuery.is),
        filter(permissionQuery => permissionQuery.channelId === channelId),
        take(1),
      )
      .subscribe(resolve);
    socket.send(PermissionQuery, PermissionQuery.create({ channelId }));
  });
};
