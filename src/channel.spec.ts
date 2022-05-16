import { ChannelState, PermissionQuery } from '@proto/Mumble';
import { Channel } from './channel';
import { Client } from './client';
import { MumbleSocket } from './mumble-socket';

jest.mock('./client');
jest.mock('./commands', () => ({
  fetchChannelPermissions: jest
    .fn()
    .mockResolvedValue(PermissionQuery.create({ permissions: 0x1 | 0x40 })),
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

  describe('sync()', () => {
    let channel: Channel;

    beforeEach(() => {
      channel = new Channel(
        client,
        ChannelState.create({ channelId: 0 }) as ChannelState & {
          channelId: number;
        },
      );
    });

    it('should update name', () => {
      channel.sync(ChannelState.create({ name: 'NEW_CHANNEL_NAME' }));
      expect(channel.name).toEqual('NEW_CHANNEL_NAME');
    });

    it('should update parent', () => {
      channel.sync(ChannelState.create({ parent: 10 }));
      expect(channel.parent).toEqual(10);
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
      expect(client.createChannel).toHaveBeenCalledWith(7, 'SUBCHANNEL_NAME');
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
      expect(client.removeChannel).toHaveBeenCalledWith(7);
    });
  });
});
