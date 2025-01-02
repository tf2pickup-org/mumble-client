import { Client } from '../src';
import { waitABit } from './utils/wait-a-bit';
import { loadUserCertificate } from './utils/load-user-certificate';

describe('Links and unlinks channels (e2e)', () => {
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
  });

  afterAll(async () => {
    await waitABit(100);
    client.disconnect();
  });

  it('should link & unlink channels', async () => {
    const one = client.channels.byName('one')!;
    expect(one).toBeTruthy();
    expect(one.linkedChannels.length).toBe(0);
    const two = client.channels.byName('two')!;
    expect(two).toBeTruthy();
    expect(two.linkedChannels.length).toBe(0);

    await expect(one.link(two)).resolves.not.toThrow();
    expect(one.linkedChannels.map(l => l.id)).toEqual([two.id]);

    await waitABit(100);

    await expect(one.unlink(two)).resolves.not.toThrow();
    expect(one.linkedChannels).toEqual([]);
  });
});
