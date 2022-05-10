import { ChannelState } from '@proto/Mumble';
import { Channel } from './channel';
import { Client } from './client';

jest.mock('./client');

describe('Channel', () => {
  let client: jest.Mocked<Client>;

  beforeEach(() => {
    client = new Client({
      host: 'FAKE_HOST',
      port: 64738,
      username: 'FAKE_USERNAME',
    }) as jest.Mocked<Client>;
  });

  it('should assign properties', () => {
    const channel = new Channel(
      client,
      ChannelState.fromPartial({
        channelId: 7,
        name: 'FAKE_CHANNEL_NAME',
        parent: 6,
      }),
    );
    expect(channel.id).toBe(7);
    expect(channel.name).toEqual('FAKE_CHANNEL_NAME');
  });

  describe('sync()', () => {
    let channel: Channel;

    beforeEach(() => {
      channel = new Channel(client, ChannelState.fromPartial({}));
    });

    it('should update name', () => {
      channel.sync(ChannelState.fromPartial({ name: 'NEW_CHANNEL_NAME' }));
      expect(channel.name).toEqual('NEW_CHANNEL_NAME');
    });

    it('should update parent', () => {
      channel.sync(ChannelState.fromPartial({ parent: 10 }));
      expect(channel.parent).toEqual(10);
    });
  });

  describe('createSubChannel()', () => {
    let channel: Channel;

    beforeEach(() => {
      channel = new Channel(client, ChannelState.fromPartial({ channelId: 7 }));
    });

    it('should attempt to create channel', async () => {
      await channel.createSubChannel('SUBCHANNEL_NAME');
      expect(client.createChannel).toHaveBeenCalledWith(7, 'SUBCHANNEL_NAME');
    });
  });

  describe('remove()', () => {
    let channel: Channel;

    beforeEach(() => {
      channel = new Channel(client, ChannelState.fromPartial({ channelId: 7 }));
    });

    it('should attempt to remove the channel', async () => {
      await channel.remove();
      expect(client.removeChannel).toHaveBeenCalledWith(7);
    });
  });
});
