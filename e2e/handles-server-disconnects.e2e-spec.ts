import { Client } from '../src';
import { waitABit } from './utils/wait-a-bit';

describe('Handles server disconnects (e2e)', () => {
  let client1: Client;
  let client2: Client;

  beforeAll(async () => {
    client1 = new Client({
      host: 'localhost',
      port: 64738,
      username: 'tester',
      rejectUnauthorized: false,
    });

    client2 = new Client({
      host: 'localhost',
      port: 64738,
      username: 'tester',
      rejectUnauthorized: false,
    });

    await client1.connect();
    await waitABit(1000);
  });

  afterAll(async () => {
    await waitABit(1000);
    client1.disconnect();
    client2.disconnect();
  });

  it('should handle error', { timeout: 60 * 1000 }, async () => {
    let wasDisconnected = false;
    client1.on('disconnect', () => (wasDisconnected = true));

    await waitABit(5000);

    await client2.connect(); // will cause client1 to get disconnected
    await waitABit(5000);
    expect(wasDisconnected).toBe(true);
  });
});
