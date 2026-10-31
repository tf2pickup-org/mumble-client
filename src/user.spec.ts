import { UserState, UserStats } from '@tf2pickup-org/mumble-protocol';
import { ChannelManager } from './channel-manager';
import { Client } from './client';
import { InsufficientPermissionsError, NoSuchChannelError } from './errors';
import { Channel } from './channel';
import { Permissions } from './permissions';
import { formatAddress, MinusOneButUnsigned, User } from './user';

vi.mock('./client');

describe('User', () => {
  let user: User;
  let client: Client;

  beforeEach(() => {
    client = new Client({
      host: 'FAKE_HOST',
      port: 64738,
      username: 'FAKE_USERNAME',
    });
    client.channels = {
      byId: vi.fn(),
      find: vi.fn(),
    } as unknown as ChannelManager;
  });

  beforeEach(() => {
    user = new User(
      client,
      UserState.create({ session: 42, name: 'FAKE_USER' }) as UserState & {
        session: number;
      },
    );
  });

  it('should assign properties', () => {
    expect(user.session).toBe(42);
    expect(user.name).toEqual('FAKE_USER');
  });

  describe('syncState()', () => {
    it('should update name', () => {
      const changes = user.syncState(
        UserState.create({ name: 'NEW_USER_NAME' }),
      );
      expect(user.name).toEqual('NEW_USER_NAME');
      expect(changes).toEqual({
        name: {
          previousValue: 'FAKE_USER',
          currentValue: 'NEW_USER_NAME',
        },
      });
    });

    it('should update channelId', () => {
      const changes = user.syncState(UserState.create({ channelId: 30 }));
      expect(user.channelId).toBe(30);
      expect(changes).toEqual({
        channelId: {
          previousValue: 0,
          currentValue: 30,
        },
      });
    });

    it('should update userId to a value', () => {
      const changes = user.syncState(UserState.create({ userId: 5 }));
      expect(user.userId).toEqual(5);
      expect(changes).toEqual({
        userId: {
          previousValue: undefined,
          currentValue: 5,
        },
      });
    });

    it('should update userId to undefined when the magic number is passed', () => {
      const changes = user.syncState(
        UserState.create({ userId: MinusOneButUnsigned }),
      );
      expect(user.userId).toEqual(undefined);
      expect(changes).toEqual({
        userId: {
          previousValue: undefined,
          currentValue: MinusOneButUnsigned,
        },
      });
    });

    it('should update mute', () => {
      const changes = user.syncState(UserState.create({ mute: true }));
      expect(user.mute).toBe(true);
      expect(changes).toEqual({
        mute: {
          previousValue: false,
          currentValue: true,
        },
      });
    });

    it('should update deaf', () => {
      const changes = user.syncState(UserState.create({ deaf: true }));
      expect(user.deaf).toBe(true);
      expect(changes).toEqual({
        deaf: {
          previousValue: false,
          currentValue: true,
        },
      });
    });

    it('should update suppress', () => {
      const changes = user.syncState(UserState.create({ suppress: true }));
      expect(user.suppress).toBe(true);
      expect(changes).toEqual({
        suppress: {
          previousValue: false,
          currentValue: true,
        },
      });
    });

    it('should update selfMute', () => {
      const changes = user.syncState(UserState.create({ selfMute: true }));
      expect(user.selfMute).toBe(true);
      expect(changes).toEqual({
        selfMute: {
          previousValue: false,
          currentValue: true,
        },
      });
    });

    it('should update selfDeaf', () => {
      const changes = user.syncState(UserState.create({ selfDeaf: true }));
      expect(user.selfDeaf).toBe(true);
      expect(changes).toEqual({
        selfDeaf: {
          previousValue: false,
          currentValue: true,
        },
      });
    });

    it('should update hash', () => {
      const changes = user.syncState(UserState.create({ hash: 'abc' }));
      expect(user.hash).toEqual('abc');
      expect(changes).toEqual({
        hash: {
          previousValue: undefined,
          currentValue: 'abc',
        },
      });
    });
  });

  describe('fetchAddress()', () => {
    it('should return undefined when the server omits the address', async () => {
      vi.mocked(client.command).mockResolvedValue(UserStats.create());
      await expect(user.fetchAddress()).resolves.toBeUndefined();
    });

    it('should format the address', async () => {
      vi.mocked(client.command).mockResolvedValue(
        UserStats.create({
          address: new Uint8Array([
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 1, 2, 3, 4,
          ]),
        }),
      );
      await expect(user.fetchAddress()).resolves.toEqual('1.2.3.4');
    });
  });

  describe('moveToChannel()', () => {
    describe('when the user is already on desired channel', () => {
      beforeEach(() => {
        user.syncState(UserState.create({ channelId: 42 }));
      });

      it('should do nothing', async () => {
        await expect(user.moveToChannel(42)).resolves.not.toThrow();
      });
    });

    describe('when permissions are checked', () => {
      const withPermissions = (permissions: number) =>
        ({
          getPermissions: vi
            .fn()
            .mockResolvedValue(new Permissions(permissions)),
        }) as unknown as Channel;
      const enter = 0x4;
      const move = 0x20;

      beforeEach(() => {
        vi.mocked(client.command).mockResolvedValue(UserState.create());
      });

      it('should let the client move itself with Move but no Enter', async () => {
        vi.spyOn(client, 'session', 'get').mockReturnValue(42);
        vi.mocked(client.channels).byId.mockReturnValue(withPermissions(move));
        await expect(user.moveToChannel(7)).resolves.toBe(user);
      });

      it('should reject moving itself without Enter or Move', async () => {
        vi.spyOn(client, 'session', 'get').mockReturnValue(42);
        vi.mocked(client.channels).byId.mockReturnValue(withPermissions(0));
        await expect(user.moveToChannel(7)).rejects.toThrow(
          InsufficientPermissionsError,
        );
      });

      it('should move another user with Move on their channel only', async () => {
        vi.spyOn(client, 'session', 'get').mockReturnValue(1);
        vi.mocked(client.channels).byId.mockReturnValue(withPermissions(0));
        vi.mocked(client.channels).find.mockReturnValue(withPermissions(move));
        await expect(user.moveToChannel(7)).resolves.toBe(user);
      });

      it('should reject moving another user without Move on their channel', async () => {
        vi.spyOn(client, 'session', 'get').mockReturnValue(1);
        vi.mocked(client.channels).byId.mockReturnValue(withPermissions(enter));
        vi.mocked(client.channels).find.mockReturnValue(withPermissions(enter));
        await expect(user.moveToChannel(7)).rejects.toThrow(
          InsufficientPermissionsError,
        );
      });
    });

    describe('when the target channel does not exist', () => {
      beforeEach(() => {
        vi.mocked(client.channels).byId.mockReturnValue(undefined);
      });

      it('should throw', async () => {
        await expect(user.moveToChannel(42)).rejects.toThrow(
          NoSuchChannelError,
        );
      });
    });
  });
});

describe(formatAddress.name, () => {
  it('should format an IPv6 address', () => {
    const address = new Uint8Array(16);
    address.set([0x20, 0x01, 0x0d, 0xb8]);
    address[15] = 1;
    expect(formatAddress(address)).toEqual('2001:db8:0:0:0:0:0:1');
  });
});
