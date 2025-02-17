import { ChannelState } from '@tf2pickup-org/mumble-protocol';
import { Channel } from './channel';
import { ChannelManager } from './channel-manager';
import { Client } from './client';
import { MumbleSocket } from './mumble-socket';
import { Permissions } from './permissions';

vi.mock('./client');

describe('Channel', () => {
  let client: Client;

  beforeEach(() => {
    client = new Client({
      host: 'FAKE_HOST',
      port: 64738,
      username: 'FAKE_USERNAME',
    });
    client.socket = {} as MumbleSocket;
    client.channels = {
      byId: vi.fn().mockResolvedValue({}),
      byName: vi.fn().mockResolvedValue({}),
      byPath: vi.fn().mockResolvedValue({}),
      findAll: vi.fn().mockReturnValue([]),
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
          previousValue: 0,
          currentValue: 10,
        },
      });
    });
  });
});
