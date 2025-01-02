import { Channel, Client } from '../src';
import { waitABit } from './utils/wait-a-bit';
import { loadUserCertificate } from './utils/load-user-certificate';

describe('Creates and removes channels (e2e)', () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({
      host: 'localhost',
      port: 64738,
      username: 'tester',
      rejectUnauthorized: false,
      ...(await loadUserCertificate()),
    });
    await client.connect();
    await waitABit(100);

    await client.user?.moveToChannel(client.channels.byName('one')!.id);
  });

  afterAll(async () => {
    await waitABit(100);
    client.disconnect();
  });

  it('should create channels', async () => {
    let channelCreatedEventEmitted = false;
    client.once('channelCreate', (channel: Channel) => {
      expect(channel.name).toEqual('sub1');
      channelCreatedEventEmitted = true;
    });

    client.assertConnected();
    expect(client.user.channel).toBeTruthy();
    const channel = client.user.channel;
    expect(channel).toBeTruthy();
    const sub1 = await channel.createSubChannel('sub1');
    expect(sub1.parent).toEqual(channel.id);
    expect(channelCreatedEventEmitted).toBe(true);

    const sub2 = await sub1.createSubChannel('sub2');
    expect(sub2.parent).toEqual(sub1.id);
  });

  it('should remove channels', async () => {
    let channelRemoveEventEmitted = false;

    client.once('channelRemove', (channel: Channel) => {
      expect(channel.name).toEqual('sub2');
      channelRemoveEventEmitted = true;
    });

    const sub2 = client.channels.byName('sub2');
    await sub2?.remove();
    expect(client.channels.byName('sub2')).toBe(undefined);
    expect(channelRemoveEventEmitted).toBe(true);

    const sub1 = client.channels.byName('sub1');
    await sub1?.remove();
    expect(client.channels.byName('sub1')).toBe(undefined);
  });
});
