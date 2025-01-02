/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Client } from '../src';
import { waitABit } from './utils/wait-a-bit';

describe('Sets self-mute (e2e)', () => {
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

  it('should set self mute', async () => {
    client.assertConnected();
    await client.user.setSelfMute(true);
    expect(client.user.selfMute).toBe(true);
  });
});
