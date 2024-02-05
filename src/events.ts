import { Channel, ChannelChanges } from './channel';
import { MumbleSocket } from './mumble-socket';
import { User, UserChanges } from './user';

// FIXME This _has_ to be type alias instead of interface.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Events = {
  socketConnect: (socket: MumbleSocket) => void;
  connect: () => void;
  disconnect: (payload?: { reason?: string }) => void;

  channelCreate: (channel: Channel) => void;
  channelUpdate: (channel: Channel, changes: ChannelChanges) => void;
  channelRemove: (channel: Channel) => void;

  userCreate: (user: User) => void;
  userUpdate: (user: User, changes: UserChanges) => void;
  userRemove: (user: User) => void;
};
