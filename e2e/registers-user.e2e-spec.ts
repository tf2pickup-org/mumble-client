/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Client } from '@';
import { waitABit } from './utils/wait-a-bit';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { getRegisteredUser, userRenameRegistered } from '@/commands';

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

  it('should register self and deregister', async () => {
    await client.user!.register();
    expect(client.user!.userId).toBeTruthy()

    await client.user!.renameRegistered("TESTER_NEW_NAME");
    expect(client.user!.name === "TESTER_NEW_NAME");

    await client.user!.deregister();
    expect(client.user!.userId).toBeFalsy()
  });

  it('should register self and deregister by name', async () => {
    await client.user!.register();
    expect(client.user!.userId).toBeTruthy()

    await client.user!.renameRegistered("TESTER_NEW_NAME2");
    expect(client.user!.name === "TESTER_NEW_NAME2");

    const user = await getRegisteredUser(client.socket!, "TESTER_NEW_NAME2");
    await userRenameRegistered(client.socket!, user.userId, undefined);
    expect(client.user!.userId).toBeFalsy()
  });
});
