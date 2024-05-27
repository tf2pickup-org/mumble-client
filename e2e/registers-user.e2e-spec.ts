/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Client } from '@';
import { waitABit } from './utils/wait-a-bit';
import { readFile } from 'fs/promises';
import { join } from 'path';

describe('registers a user', () => {
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

  it('should register self', async () => {
    await client.user!.register();
    await waitABit(200);
    expect(client.user!.userId).toBeTruthy()

    await client.user!.renameRegistered("TESTER_NEW_NAME");
    await waitABit(200);
    expect(client.user!.name === "TESTER_NEW_NAME");

    await client.user!.deregister();
    await waitABit(200);
    expect(client.user!.userId).toBeFalsy()
  });
});
