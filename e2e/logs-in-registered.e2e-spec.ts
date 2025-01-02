import { Client } from '../src';
import { ConnectionRejectedError } from '../src/errors';
import { waitABit } from './utils/wait-a-bit';
import { loadUserCertificate } from './utils/load-user-certificate';

describe('Logs in with a certificate (e2e)', () => {
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
    await waitABit(1000);
  });

  afterAll(async () => {
    await waitABit(1000);
    client.disconnect();
  });

  it('should grab a registered username', async () => {
    client.assertConnected();
    expect(client.user.name).toEqual('registered-tester');
  });

  it('should reject connections gracefully', async () => {
    const client2 = new Client({
      host: 'localhost',
      port: 64738,
      username: 'registered-tester',
      rejectUnauthorized: false,
    });
    await expect(client2.connect()).rejects.toThrow(ConnectionRejectedError);
  });
});
