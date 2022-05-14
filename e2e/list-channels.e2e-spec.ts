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

  it('should list subchannels', async () => {
    const subChannels = client.user?.channel.subChannels.map(
      channel => channel.name,
    );
    expect(subChannels?.includes('one')).toBe(true);
    expect(subChannels?.includes('two')).toBe(true);

    const two = client.channels.byName('two');
    expect(two?.subChannels[0].name).toEqual('three');
  });
});
