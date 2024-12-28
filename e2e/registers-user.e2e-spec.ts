import { Client } from '../src';
import { waitABit } from './utils/wait-a-bit';
import { userRenameRegistered, userUnregister } from '../src/commands';
import { createCertificate as createCertificateCb } from 'pem';

interface MumbleCert {
  key: string;
  cert: Buffer;
}

const createMumbleCertificate = () =>
  new Promise<MumbleCert>((resolve, reject) => {
    createCertificateCb(
      {
        days: 1,
        selfSigned: true,
      },
      (error, result) => {
        if (error) {
          reject(new Error(error));
        } else {
          resolve({ key: result.clientKey, cert: result.certificate });
        }
      },
    );
  });

describe('registers a user', () => {
  let client1: Client;
  let client2: Client;

  beforeAll(async () => {
    // client1 is always registered
    client1 = new Client({
      host: 'localhost',
      port: 64738,
      username: 'client1',
      rejectUnauthorized: false,
      ...(await createMumbleCertificate()),
    });

    // client2 is unregistered
    client2 = new Client({
      host: 'localhost',
      port: 64738,
      username: 'client2',
      rejectUnauthorized: false,
      ...(await createMumbleCertificate()),
    });

    await client1.connect();
    await client2.connect();
    await waitABit(100);
  });

  afterAll(async () => {
    await waitABit(1000);
    client1.disconnect();
    client2.disconnect();
  });

  beforeEach(async () => {
    if (!client1.user!.isRegistered) {
      await client1.user!.register();
      expect(client1.user!.isRegistered).toBe(true);
    }
  });

  afterEach(async () => {
    if (client2.user!.isRegistered) {
      await client2.user!.deregister();
      expect(client2.user!.isRegistered).toBe(false);
    }
  });

  it('should register self and deregister', async () => {
    expect(client2.user!.userId).toBeUndefined();
    expect(client2.user!.isRegistered).toBe(false);

    await client2.user!.register();
    expect(client2.user!.userId).toBeTruthy();
    expect(client2.user!.isRegistered).toBe(true);

    const registeredUsers = await client2.fetchRegisteredUsers();
    const user = registeredUsers.find(user => user.name === 'client2');
    expect(user).toBeTruthy();
  });

  it('should rename', async () => {
    await client1.user!.rename('client1_new_name');
    expect(client1.user!.name).toBe('client1_new_name');

    const registeredUsers = await client1.fetchRegisteredUsers();
    const user = registeredUsers.find(user => user.name === 'client1_new_name');
    expect(user).toBeTruthy();

    await client1.user!.rename('client1');
  });

  it('should rename an offline user', async () => {
    expect(client2.user!.userId).toBeUndefined();
    expect(client2.user!.isRegistered).toBe(false);
    await client2.user!.register();
    client2.disconnect();
    await waitABit(100);

    // rename client2 while they are offline
    const registeredUsers = await client1.fetchRegisteredUsers();
    const user = registeredUsers.find(user => user.name === 'client2');
    expect(user).toBeTruthy();
    await userRenameRegistered(
      client1.socket!,
      user!.userId,
      'client2_new_name',
    );

    await client2.connect();
    expect(client2.user!.name).toEqual('client2_new_name');
    expect(client2.user!.userId).toBeTruthy();
    expect(client2.user!.isRegistered).toBe(true);

    await client2.user!.rename('client2');
  });

  it('should unregister an offline user', async () => {
    expect(client2.user!.userId).toBeUndefined();
    expect(client2.user!.isRegistered).toBe(false);
    await client2.user!.register();
    client2.disconnect();
    await waitABit(100);

    // deregister client2 while they are offline
    const registeredUsers = await client1.fetchRegisteredUsers();
    const user = registeredUsers.find(user => user.name === 'client2');
    expect(user).toBeTruthy();
    await userUnregister(client1.socket!, user!.userId);

    await client2.connect();
    expect(client2.user!.userId).toBeFalsy();
    expect(client2.user!.isRegistered).toBe(false);
  });
});
