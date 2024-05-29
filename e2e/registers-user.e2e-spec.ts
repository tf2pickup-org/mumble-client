/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Client } from '@';
import { waitABit } from './utils/wait-a-bit';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { userRenameRegistered, userUnregister } from '@/commands';

describe('registers a user', () => {
  let client1: Client;
  let client2: Client;

  beforeAll(async () => {
    const key = (await readFile(join(__dirname, 'tester-key.pem'))).toString();
    const cert = (
      await readFile(join(__dirname, 'tester-cert.pem'))
    ).toString();

    client1 = new Client({
      host: 'localhost',
      port: 64738,
      username: 'tester',
      key,
      cert,
      rejectUnauthorized: false,
    });

    client2 = new Client({
      host: 'localhost',
      port: 64738,
      username: 'tester_no_cert',
      rejectUnauthorized: false,
    });

    await client1.connect();
    await client2.connect();
    await waitABit(1000);
  });

  afterAll(async () => {
    await waitABit(1000);
    client1.disconnect();
    client2.disconnect();
  });

  it('should register self and deregister', async () => {
    await client1.user!.register();
    expect(client1.user!.userId).toBeTruthy();

    await client1.user!.renameRegistered("TESTER_NEW_NAME");
    expect(client1.user!.name === "TESTER_NEW_NAME");

    await client1.user!.deregister();
    expect(client1.user!.userId).toBeFalsy()
  });

  it('should register self and deregister by name', async () => {
    await client1.user!.register();
    expect(client1.user!.userId).toBeTruthy()

    await client1.user!.renameRegistered("TESTER_NEW_NAME2");
    expect(client1.user!.name === "TESTER_NEW_NAME2");

    // should work for any user, not just self
    const userListUser = await client1.getRegisteredUserByName("TESTER_NEW_NAME2");

    // reset name
    await client1.user!.renameRegistered("tester");
    expect(client1.user!.name === "tester");

    await userUnregister(client1.socket!, userListUser.userId);
    expect(client1.user!.userId).toBeFalsy()
  });

  // this test requires the unregistered user to have permissions to register someone else
  it('should rename/deregister an offline user', async () => {
    // register client1
    client2.users.findAll(u => u.name == "tester").map(u => u.register());

    // disconnect
    client1.disconnect();
    await waitABit(200);

    // rename client1 while client1 is offline
    let userListUser1 = await client2.getRegisteredUserByName("tester");
    await userRenameRegistered(client2.socket!, userListUser1.userId, "tester_new");

    await client1.connect();

    expect(client1.user!.name).toEqual("tester_new");
    expect(client1.user?.userId).toBeTruthy();

    // reset name
    await client1.user!.renameRegistered("tester");
    expect(client1.user!.name === "tester");

    client1.disconnect();
    await waitABit(200);

    // deregister client1 while client1 is offline
    await userUnregister(client2.socket!, userListUser1.userId);

    await client1.connect();

    expect(client1.user?.userId).toBeFalsy();
  });
});
