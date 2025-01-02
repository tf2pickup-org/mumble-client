import { Client } from '../src';
import { waitABit } from './utils/wait-a-bit';

describe('Rejects moving to a channel when there are insufficient permissions (e2e)', () => {
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

  it('should throw an error when attempting to join a channel', async () => {
    client.assertConnected();

    // channel 'three' has all permissions denied for all users
    const three = client.channels.byName('three');
    expect(three).toBeTruthy();
    await expect(client.user.moveToChannel(three!.id)).rejects.toThrow();
  });
});
