import { UserState } from '@tf2pickup-org/mumble-protocol';
import { ChannelManager } from './channel-manager';
import { Client } from './client';
import { ClientDisconnectedError, NoSuchChannelError } from './errors';
import { MumbleSocket } from './mumble-socket';
import { Permissions } from './permissions';
import { User } from './user';

jest.mock('./client');

describe('User', () => {
  let user: User;
  let client: jest.Mocked<Client>;

  beforeEach(() => {
    client = new Client({
      host: 'FAKE_HOST',
      port: 64738,
      username: 'FAKE_USER',
    }) as jest.Mocked<Client>;
    client.socket = {} as MumbleSocket;
    client.channels = {
      byId: jest.fn(),
    } as unknown as ChannelManager;
    (client as { permissions: Map<number, Permissions> }).permissions =
      new Map();
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
    describe('when the client is disconnected', () => {
      beforeEach(() => {
        client.socket = undefined;
      });

      it('should throw', async () => {
        await expect(user.moveToChannel(30)).rejects.toThrow(
          ClientDisconnectedError,
        );
      });
    });

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
        (client.channels as jest.Mocked<ChannelManager>).byId.mockReturnValue(
          undefined,
        );
      });

      it('should throw', async () => {
        await expect(user.moveToChannel(42)).rejects.toThrow(
          NoSuchChannelError,
        );
      });
    });
  });
});
