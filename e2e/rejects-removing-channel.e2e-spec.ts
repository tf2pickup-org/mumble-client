import { Client } from '@';

describe('Rejects removing channel when there are insufficient permissions (e2e)', () => {
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

  it('should throw an error when attempting to remove the channel', async () => {
    const one = client.channels.byName('one');
    expect(one).toBeTruthy();
    await expect(one?.remove()).rejects.toThrow();
  });
});
