import { Channel, Client } from '../src';
import { waitABit } from './utils/wait-a-bit';

describe('Manages server as the super-user (e2e)', () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({
      host: 'localhost',
      port: 64738,
      username: 'superuser',
      password: '123456',
      rejectUnauthorized: false,
    });
    await client.connect();
    await waitABit(1000);
  });

  afterAll(async () => {
    await waitABit(1000);
    client.disconnect();
  });

  it('should create channels', async () => {
    let channelCreatedEventEmitted = false;
    client.once('channelCreate', (channel: Channel) => {
      expect(channel.name).toEqual('sub10');
      channelCreatedEventEmitted = true;
    });

    expect(client.user?.channel).toBeTruthy();
    const channel = client.user!.channel;
    expect(channel).toBeTruthy();
    const sub1 = await channel.createSubChannel('sub10');
    expect(sub1.parent).toEqual(channel.id);
    expect(channelCreatedEventEmitted).toBe(true);

    const sub2 = await sub1.createSubChannel('sub11');
    expect(sub2.parent).toEqual(sub1.id);
  });

  it('should remove channels', async () => {
    let channelRemoveEventEmitted = false;

    client.once('channelRemove', (channel: Channel) => {
      expect(channel.name).toEqual('sub11');
      channelRemoveEventEmitted = true;
    });

    const sub2 = client.channels.byName('sub11');
    await sub2?.remove();
    expect(client.channels.byName('sub11')).toBe(undefined);
    expect(channelRemoveEventEmitted).toBe(true);

    const sub1 = client.channels.byName('sub10');
    await sub1?.remove();
    expect(client.channels.byName('sub10')).toBe(undefined);
  });
});
