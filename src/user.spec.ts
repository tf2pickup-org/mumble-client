import { UserState } from '@tf2pickup-org/mumble-protocol';
import { ChannelManager } from './channel-manager';
import { Client } from './client';
import { ClientDisconnectedError, NoSuchChannelError } from './errors';
import { MumbleSocket } from './mumble-socket';
import { Permissions } from './permissions';
import { MinusOneButUnsigned, User } from './user';

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
    client.socket = {} as MumbleSocket;
    client.channels = {
      byId: vi.fn(),
    } as unknown as ChannelManager;
    (client as { permissions: Map<number, Permissions> }).permissions =
      new Map();
    client.assertConnected = vi.fn().mockImplementation(() => {
      if (!client.socket) {
        throw new ClientDisconnectedError();
      }
    });
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
