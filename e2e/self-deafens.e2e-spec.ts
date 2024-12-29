/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Client } from '../src';
import { waitABit } from './utils/wait-a-bit';

describe('Sets self-deaf (e2e)', () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({
      host: 'localhost',
      port: 64738,
      username: 'tester',
      rejectUnauthorized: false,
    });
    await client.connect();
    await waitABit(1000);
  });

  afterAll(async () => {
    await waitABit(1000);
    client.disconnect();
  });

  it('should set self deaf', async () => {
    client.assertConnected();
    await client.user.setSelfDeaf(true);
    expect(client.user.selfDeaf).toBe(true);
  });
});
