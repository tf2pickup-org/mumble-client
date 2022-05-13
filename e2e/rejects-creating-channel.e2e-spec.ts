import { Channel, Client } from '@';

describe('Rejects creating channel when there are insufficient permissions (e2e)', () => {
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

  it('should throw an error when attempting to create a new channel', async () => {
    const channel = client.user?.channel;
    await expect(channel?.createSubChannel('test')).rejects.toThrow();

    const one = client.channels.byName('one');
    expect(one).toBeTruthy();
    await client.user?.moveToChannel((one as Channel).id);
    await expect(channel?.createSubChannel('test')).rejects.toThrow();
  });
});
