import { Client } from '../src';
import { createCertificate } from './utils/create-certificate';
import { waitABit } from './utils/wait-a-bit';

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
      ...(await createCertificate()),
    });

    // client2 is unregistered
    client2 = new Client({
      host: 'localhost',
      port: 64738,
      username: 'client2',
      rejectUnauthorized: false,
      ...(await createCertificate()),
    });

    await client1.connect();
    await client2.connect();
    await waitABit(100);
  });

  afterAll(async () => {
    client1.assertConnected();
    if (client1.self.isRegistered) {
      await client1.self.deregister();
      expect(client1.self.isRegistered).toBe(false);
    }
    client1.disconnect();
    client2.assertConnected();
    if (client2.self.isRegistered) {
      await client2.self.deregister();
      expect(client2.self.isRegistered).toBe(false);
    }
    client2.disconnect();
  });

  beforeEach(async () => {
    client1.assertConnected();
    if (!client1.self.isRegistered) {
      await client1.self.register();
      expect(client1.self.isRegistered).toBe(true);
    }
  });

  afterEach(async () => {
    client2.assertConnected();
    if (client2.self.isRegistered) {
      await client2.self.deregister();
      expect(client2.self.isRegistered).toBe(false);
    }
  });

  // registers client2 and takes it offline; returns its registration as client1 sees it
  async function registerAndDisconnectClient2() {
    client2.assertConnected();
    expect(client2.self.userId).toBeUndefined();
    expect(client2.self.isRegistered).toBe(false);
    await client2.self.register();
    client2.disconnect();
    await waitABit(100);

    client1.assertConnected();
    const registeredUsers = await client1.fetchRegisteredUsers();
    const user = registeredUsers.find(user => user.name === 'client2');
    expect(user).toBeTruthy();
    return user!;
  }

  it('should register self and deregister', async () => {
    client2.assertConnected();
    expect(client2.self.userId).toBeUndefined();
    expect(client2.self.isRegistered).toBe(false);

    await client2.self.register();
    expect(client2.self.userId).toBeTruthy();
    expect(client2.self.isRegistered).toBe(true);

    const registeredUsers = await client2.fetchRegisteredUsers();
    const user = registeredUsers.find(user => user.name === 'client2');
    expect(user).toBeTruthy();
  });

  it('should rename', async () => {
    client1.assertConnected();
    await client1.self.rename('client1_new_name');
    expect(client1.self.name).toBe('client1_new_name');

    const registeredUsers = await client1.fetchRegisteredUsers();
    const user = registeredUsers.find(user => user.name === 'client1_new_name');
    expect(user).toBeTruthy();

    await client1.self.rename('client1');
  });

  it('should rename an offline user', async () => {
    const user = await registerAndDisconnectClient2();
    await client1.renameRegisteredUser(user.userId, 'client2_new_name');

    await client2.connect();
    client2.assertConnected();
    expect(client2.self.name).toEqual('client2_new_name');
    expect(client2.self.userId).toBeTruthy();
    expect(client2.self.isRegistered).toBe(true);
    await client2.self.rename('client2');
  });

  it('should unregister an offline user', async () => {
    const user = await registerAndDisconnectClient2();
    await client1.deregisterUser(user.userId);

    await client2.connect();
    client2.assertConnected();
    expect(client2.self.userId).toBeFalsy();
    expect(client2.self.isRegistered).toBe(false);
  });
});
