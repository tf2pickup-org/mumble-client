import { UserState, UserStats } from '@tf2pickup-org/mumble-protocol';
import { Client } from './client';
import { Channel } from './channel';
import {
  InsufficientPermissionsError,
  UserNotRegisteredError,
  NoSuchChannelError,
} from './errors';
import { Change } from './change';
import { syncProperty } from './sync-property';

type UserWritableProps = Pick<
  User,
  | 'name'
  | 'channelId'
  | 'mute'
  | 'deaf'
  | 'suppress'
  | 'selfMute'
  | 'selfDeaf'
  | 'hash'
>;

export type UserChanges = {
  [P in keyof UserWritableProps]?: Change<User[P]>;
};

/**
 * 2^32 - 1
 * Returned by the murmur server as the userId upon successful deregistration
 */
export const MinusOneButUnsigned = 0xffffffff;

/**
 * Represents a single user connected to the server.
 */
export class User {
  readonly session: number;
  name?: string;
  channelId = 0;
  private _userId: number | undefined; // undefined userId means the user is not registered
  mute = false;
  deaf = false;
  suppress = false;
  selfMute = false;
  selfDeaf = false;
  /**
   * SHA1 hash of the user's certificate; undefined if they connected without one.
   */
  hash?: string;

  constructor(
    private readonly client: Client,
    userState: UserState & { session: number },
  ) {
    this.session = userState.session;
    this.syncState(userState);
  }

  /**
   * A channel on which the user currently is.
   */
  get channel(): Channel {
    return this.client.channels.find(channel => channel.id === this.channelId)!;
  }

  /**
   * A registered userId; undefined for unregistered users.
   */
  get userId(): number | undefined {
    return this._userId;
  }

  set userId(userId: number | undefined) {
    // -1 is returned to signal successful user registration deletion
    this._userId = userId === MinusOneButUnsigned ? undefined : userId;
  }

  get isRegistered(): boolean {
    return this.userId !== undefined;
  }

  /**
   * @internal
   */
  syncState(userState: UserState): UserChanges {
    const changes: UserChanges = {
      ...syncProperty(this, 'name', userState.name),
      ...syncProperty(this, 'channelId', userState.channelId),
      ...syncProperty(this, 'userId', userState.userId),
      ...syncProperty(this, 'mute', userState.mute),
      ...syncProperty(this, 'deaf', userState.deaf),
      ...syncProperty(this, 'suppress', userState.suppress),
      ...syncProperty(this, 'selfMute', userState.selfMute),
      ...syncProperty(this, 'selfDeaf', userState.selfDeaf),
      ...syncProperty(this, 'hash', userState.hash),
    };
    return changes;
  }

  /**
   * Move the user to the given channel.
   * @param channelId The ID of the target channel.
   * @returns This user.
   */
  async moveToChannel(channelId: number): Promise<this> {
    if (this.channelId === channelId) {
      return this;
    }

    const channel = this.client.channels.byId(channelId);
    if (!channel) {
      throw new NoSuchChannelError(channelId);
    }

    // mirrors the server: moving yourself needs Enter or Move on the target;
    // moving someone else needs Move on their current channel, plus Move on
    // the target or the user's own Enter there, which only the server knows
    if (this.session === this.client.session) {
      const permissions = await channel.getPermissions();
      if (!permissions.canJoinChannel && !permissions.canMove) {
        throw new InsufficientPermissionsError();
      }
    } else if (!(await this.channel.getPermissions()).canMove) {
      throw new InsufficientPermissionsError();
    }

    await this.client.command('moveUserToChannel', {
      sendPacket: [
        UserState,
        UserState.create({ session: this.session, channelId }),
      ],
      expectPacket: [
        UserState,
        userState =>
          userState.session === this.session &&
          userState.channelId === channelId,
      ],
    });
    return this;
  }

  /**
   * Set self-mute of the user to the given value. Note: this call is valid only
   * for the client's user.
   * @param selfMute The selfMute property.
   * @returns This user.
   */
  async setSelfMute(selfMute: boolean): Promise<this> {
    await this.client.command('setSelfMute', {
      sendPacket: [
        UserState,
        UserState.create({ session: this.session, selfMute }),
      ],
      expectPacket: [UserState, ({ session }) => session === this.session],
    });

    return this;
  }

  /**
   * Set self-deaf of the user to the given value. Note: this call is valid only
   * for the client's user.
   * @param selfDeaf The selfDeaf property.
   * @returns This user.
   */
  async setSelfDeaf(selfDeaf: boolean): Promise<this> {
    await this.client.command('setSelfDeaf', {
      sendPacket: [
        UserState,
        UserState.create({ session: this.session, selfDeaf }),
      ],
      expectPacket: [UserState, ({ session }) => session === this.session],
    });
    return this;
  }

  /**
   * Registers the user.
   * @returns This user.
   */
  async register(): Promise<this> {
    await this.client.command('registerUser', {
      sendPacket: [
        UserState,
        UserState.create({ session: this.session, userId: 0 }),
      ],
      expectPacket: [UserState, ({ session }) => session === this.session],
    });

    return this;
  }

  /**
   * De-registers the user if the user is registered.
   * @returns This user.
   */
  async deregister(): Promise<this> {
    if (this.userId === undefined) {
      throw new UserNotRegisteredError();
    }

    await this.client.deregisterUser(this.userId);
    return this;
  }

  /**
   * Renames a registered user.
   * @returns This user.
   */
  async rename(name: string): Promise<this> {
    if (this.userId === undefined) {
      throw new UserNotRegisteredError();
    }

    await this.client.renameRegisteredUser(this.userId, name);
    return this;
  }

  /**
   * Fetch the user's IP address. The server sends it only if the client has
   * the Ban permission on the root channel, or if the user is the client itself.
   * @returns The address (IPv4 addresses in dotted notation), or undefined.
   */
  async fetchAddress(): Promise<string | undefined> {
    const stats = await this.client.command('fetchUserStats', {
      sendPacket: [UserStats, UserStats.create({ session: this.session })],
      expectPacket: [UserStats, ({ session }) => session === this.session],
    });
    return stats.address?.length ? formatAddress(stats.address) : undefined;
  }

  /**
   * Send a private text message to the user.
   * @param message The message; the server accepts HTML.
   * @returns This user.
   */
  async sendMessage(message: string): Promise<this> {
    await this.client.sendTextMessage({ session: [this.session] }, message);
    return this;
  }
}

/**
 * Formats the 16-byte address the server sends.
 * @internal
 */
export function formatAddress(address: Uint8Array): string {
  const isV4Mapped =
    address.subarray(0, 10).every(b => b === 0) &&
    address[10] === 0xff &&
    address[11] === 0xff;
  if (isV4Mapped) {
    return Array.from(address.subarray(12)).join('.');
  }

  // ponytail: not zero-compressed; normalize before comparing with other sources
  const view = new DataView(address.buffer, address.byteOffset, 16);
  return Array.from({ length: 8 }, (_, i) =>
    view.getUint16(i * 2).toString(16),
  ).join(':');
}
