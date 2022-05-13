import { Channel, Client } from '@';

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
  });

  afterAll(() => {
    client.disconnect();
  });

  it('should join a channel', async () => {
    const one = client.channels.byName('one') as Channel;
    expect(one).toBeTruthy();
    await client.user?.moveToChannel(one.id);
    expect(client.user?.channel.id).toEqual(one.id);
  });
});
