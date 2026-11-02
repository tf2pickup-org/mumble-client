import { Client } from '../src';
import { itCreatesAndRemovesChannels } from './utils/it-creates-and-removes-channels';
import { waitABit } from './utils/wait-a-bit';

describe('Manages server as the super-user (e2e)', () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({
      host: 'localhost',
      port: 64738,
      username: 'superuser',
      password: '123456',
      rejectUnauthorized: false,
    });
    await client.connect();
    await waitABit(100);
  });

  afterAll(async () => {
    await waitABit(100);
    client.disconnect();
  });

  itCreatesAndRemovesChannels(() => client, ['sub10', 'sub11']);
});
