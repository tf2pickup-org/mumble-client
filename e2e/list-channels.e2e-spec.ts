import { Client } from '@';

describe('List channels (e2e)', () => {
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

  it('should list channels', async () => {
    const channels = client.channels
      .findAll(() => true)
      .map(channel => channel.name);
    expect(channels).toEqual(['Root', 'one', 'two', 'three']);
  });
});
