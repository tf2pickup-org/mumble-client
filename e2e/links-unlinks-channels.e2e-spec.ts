import { Channel, Client } from '@';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { waitABit } from './utils/wait-a-bit';

describe('Links and unlinks channels (e2e)', () => {
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
  });

  afterAll(async () => {
    await waitABit(1000);
    client.disconnect();
  });

  it('should link & unlink channels', async () => {
    const one = client.channels.byName('one') as Channel;
    expect(one).toBeTruthy();
    expect(one.linkedChannels.length).toBe(0);
    const two = client.channels.byName('two') as Channel;
    expect(two).toBeTruthy();
    expect(two.linkedChannels.length).toBe(0);

    await expect(one.link(two)).resolves.not.toThrow();
    expect(one.linkedChannels.map(l => l.id)).toEqual([two.id]);

    await waitABit(1000);

    await expect(one.unlink(two)).resolves.not.toThrow();
    expect(one.linkedChannels).toEqual([]);
  });
});
