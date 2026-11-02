import { Channel, Client } from '../../src';

/**
 * Creates a sub-channel and a sub-sub-channel in the client's channel, then
 * removes both, checking the channelCreate and channelRemove events.
 */
export function itCreatesAndRemovesChannels(
  getClient: () => Client,
  [name1, name2]: [string, string],
) {
  it('should create channels', async () => {
    const client: Client = getClient();
    let channelCreatedEventEmitted = false;
    client.once('channelCreate', (channel: Channel) => {
      expect(channel.name).toEqual(name1);
      channelCreatedEventEmitted = true;
    });

    client.assertConnected();
    expect(client.self.channel).toBeTruthy();
    const channel = client.self.channel;
    expect(channel).toBeTruthy();
    const sub1 = await channel.createSubChannel(name1);
    expect(sub1.parent).toEqual(channel.id);
    expect(channelCreatedEventEmitted).toBe(true);

    const sub2 = await sub1.createSubChannel(name2);
    expect(sub2.parent).toEqual(sub1.id);
  });

  it('should remove channels', async () => {
    const client: Client = getClient();
    let channelRemoveEventEmitted = false;

    client.once('channelRemove', (channel: Channel) => {
      expect(channel.name).toEqual(name2);
      channelRemoveEventEmitted = true;
    });

    const sub2 = client.channels.byName(name2);
    await sub2?.remove();
    expect(client.channels.byName(name2)).toBe(undefined);
    expect(channelRemoveEventEmitted).toBe(true);

    const sub1 = client.channels.byName(name1);
    await sub1?.remove();
    expect(client.channels.byName(name1)).toBe(undefined);
  });
}
