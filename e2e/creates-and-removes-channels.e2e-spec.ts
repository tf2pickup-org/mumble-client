import { Channel, Client } from '@';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { waitABit } from './utils/wait-a-bit';

describe('Creates and removes channels (e2e)', () => {
  let client: Client;

  beforeAll(async () => {
    const key = (await readFile(join(__dirname, 'tester-key.pem'))).toString();
    const cert = (
      await readFile(join(__dirname, 'tester-cert.pem'))
    ).toString();

    client = new Client({
      host: 'localhost',
      port: 64738,
      username: 'tester',
      key,
      cert,
      rejectUnauthorized: false,
    });
    await client.connect();
    await waitABit(1000);

    await client.user?.moveToChannel(
      (client.channels.byName('one') as Channel).id,
    );
  });

  afterAll(async () => {
    await waitABit(1000);
    client.disconnect();
  });

  it('should create channels', async () => {
    let channelCreatedEventEmitted = false;
    client.once('channelCreate', (channel: Channel) => {
      expect(channel.name).toEqual('sub1');
      channelCreatedEventEmitted = true;
    });

    const channel = client.user?.channel as Channel;
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
      expect(channel.name).toEqual('sub1');
      channelRemoveEventEmitted = true;
    });

    const channel = client.channels.byName('sub1');
    await channel?.remove();
    expect(client.channels.byName('sub1')).toBe(undefined);
    expect(channelRemoveEventEmitted).toBe(true);
  });
});
