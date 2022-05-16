import { Client } from '@';
import { ConnectionRejectedError } from '@/errors';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { waitABit } from './utils/wait-a-bit';

describe('Logs in with a certificate (e2e)', () => {
  let client: Client;

  beforeAll(async () => {
    const key = (await readFile(join(__dirname, 'tester-key.pem'))).toString();
    const cert = (
      await readFile(join(__dirname, 'tester-cert.pem'))
    ).toString();

    client = new Client({
      host: 'localhost',
      port: 64738,
      username: 'tester',
      key,
      cert,
      rejectUnauthorized: false,
    });
    await client.connect();
    await waitABit(1000);
  });

  afterAll(async () => {
    await waitABit(1000);
    client.disconnect();
  });

  it('should grab a registered username', async () => {
    expect(client.user?.name).toEqual('registered-tester');
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
