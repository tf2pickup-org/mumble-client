import { Client } from '../src';
import { waitABit } from './utils/wait-a-bit';

describe('Joins a channel (e2e)', () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({
      host: 'localhost',
      port: 64738,
      username: 'tester',
      rejectUnauthorized: false,
    });
    await client.connect();
    await waitABit(100);
  });

  afterAll(async () => {
    await waitABit(100);
    client.disconnect();
  });

  it('should join a channel', async () => {
    const one = client.channels.byName('one')!;
    expect(one).toBeTruthy();
    await client.user?.moveToChannel(one.id);
    expect(client.user?.channel.id).toEqual(one.id);
  });
});
