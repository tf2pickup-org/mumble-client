import { Client } from '../src';
import { itCreatesAndRemovesChannels } from './utils/it-creates-and-removes-channels';
import { waitABit } from './utils/wait-a-bit';
import { loadUserCertificate } from './utils/load-user-certificate';

describe('Creates and removes channels (e2e)', () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({
      host: 'localhost',
      port: 64738,
      username: 'tester',
      rejectUnauthorized: false,
      ...(await loadUserCertificate()),
    });
    await client.connect();
    await waitABit(100);

    await client.self?.moveToChannel(client.channels.byName('one')!.id);
  });

  afterAll(async () => {
    await waitABit(100);
    client.disconnect();
  });

  itCreatesAndRemovesChannels(() => client, ['sub1', 'sub2']);
});
