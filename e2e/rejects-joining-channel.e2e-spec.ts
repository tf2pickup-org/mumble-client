import { Channel, Client } from '@';

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
  });

  afterAll(() => {
    client.disconnect();
  });

  it('should throw an error when attempting to join a channel', async () => {
    // channel 'three' has all permissions denied for all users
    const three = client.channels.byName('three');
    expect(three).toBeTruthy();
    await expect(
      client.user?.moveToChannel((three as Channel).id),
    ).rejects.toThrow();
  });
});
