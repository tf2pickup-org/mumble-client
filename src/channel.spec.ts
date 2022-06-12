import { ChannelState, PermissionQuery } from '@tf2pickup-org/mumble-protocol';
import { Channel } from './channel';
import { ChannelManager } from './channel-manager';
import { Client } from './client';
import { createChannel, removeChannel } from './commands';
import { MumbleSocket } from './mumble-socket';
import { Permissions } from './permissions';

jest.mock('./client');
jest.mock('./commands', () => ({
  fetchChannelPermissions: jest
    .fn()
    .mockResolvedValue(PermissionQuery.create({ permissions: 0x1 | 0x40 })),
  createChannel: jest.fn().mockResolvedValue(8),
  removeChannel: jest.fn().mockResolvedValue(7),
}));

describe('Channel', () => {
  let client: jest.Mocked<Client>;

  beforeEach(() => {
    client = new Client({
      host: 'FAKE_HOST',
      port: 64738,
      username: 'FAKE_USERNAME',
    }) as jest.Mocked<Client>;
    client.socket = {} as MumbleSocket;
    client.channels = {
      byId: jest.fn().mockResolvedValue({}),
      byName: jest.fn().mockResolvedValue({}),
      byPath: jest.fn().mockResolvedValue({}),
      findAll: jest.fn().mockReturnValue([]),
    } as unknown as ChannelManager;
    (client as { permissions: Map<number, Permissions> }).permissions =
      new Map();
  });

  it('should assign properties', () => {
    const channel = new Channel(
      client,
      ChannelState.create({
        channelId: 7,
        name: 'FAKE_CHANNEL_NAME',
        parent: 6,
      }) as ChannelState & { channelId: number },
    );
    expect(channel.id).toBe(7);
    expect(channel.name).toEqual('FAKE_CHANNEL_NAME');
  });

  describe('syncState()', () => {
    let channel: Channel;

    beforeEach(() => {
      channel = new Channel(
        client,
        ChannelState.create({
          channelId: 0,
          name: 'FAKE_CHANNEL_NAME',
        }) as ChannelState & {
          channelId: number;
        },
      );
    });

    it('should update name', () => {
      const changes = channel.syncState(
        ChannelState.create({ name: 'NEW_CHANNEL_NAME' }),
      );
      expect(channel.name).toEqual('NEW_CHANNEL_NAME');
      expect(changes).toEqual({
        name: {
          previousValue: 'FAKE_CHANNEL_NAME',
          currentValue: 'NEW_CHANNEL_NAME',
        },
      });
    });

    it('should update parent', () => {
      const changes = channel.syncState(ChannelState.create({ parent: 10 }));
      expect(channel.parent).toEqual(10);
      expect(changes).toEqual({
        parent: {
          previousValue: undefined,
          currentValue: 10,
        },
      });
    });
  });

  describe('createSubChannel()', () => {
    let channel: Channel;

    beforeEach(() => {
      channel = new Channel(
        client,
        ChannelState.create({ channelId: 7 }) as ChannelState & {
          channelId: number;
        },
      );
    });

    it('should attempt to create channel', async () => {
      await channel.createSubChannel('SUBCHANNEL_NAME');
      expect(createChannel).toHaveBeenCalledWith(
        client.socket,
        7,
        'SUBCHANNEL_NAME',
      );
    });
  });

  describe('remove()', () => {
    let channel: Channel;

    beforeEach(() => {
      channel = new Channel(
        client,
        ChannelState.create({ channelId: 7 }) as ChannelState & {
          channelId: number;
        },
      );
    });

    it('should attempt to remove the channel', async () => {
      await channel.remove();
      expect(removeChannel).toHaveBeenCalledWith(client.socket, 7);
    });
  });
});
