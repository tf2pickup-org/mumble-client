import { Client } from '../src';
import { createCertificate } from './utils/create-certificate';
import { waitABit } from './utils/wait-a-bit';

describe('sends text messages and fetches user stats (e2e)', () => {
  let superuser: Client;
  let client: Client;

  beforeAll(async () => {
    superuser = new Client({
      host: 'localhost',
      port: 64738,
      username: 'superuser',
      password: '123456',
      rejectUnauthorized: false,
    });
    client = new Client({
      host: 'localhost',
      port: 64738,
      username: 'messaged_client',
      rejectUnauthorized: false,
      ...(await createCertificate()),
    });
    await superuser.connect();
    await client.connect();
    await waitABit(100);
  });

  afterAll(() => {
    superuser.disconnect();
    client.disconnect();
  });

  it('should expose the certificate hash', () => {
    client.assertConnected();
    superuser.assertConnected();
    const other = superuser.users.bySession(client.session);
    expect(other?.hash).toMatch(/^[0-9a-f]{40}$/);
    expect(other?.hash).toEqual(client.self.hash);
  });

  it('should send and receive a private message', async () => {
    client.assertConnected();
    superuser.assertConnected();
    const received = new Promise(resolve =>
      client.once('textMessage', resolve),
    );
    await superuser.users.bySession(client.session)!.sendMessage('hi there');
    expect(await received).toEqual({
      sender: client.users.bySession(superuser.session),
      message: 'hi there',
      isPrivate: true,
    });
  });

  it('should send and receive a channel message', async () => {
    client.assertConnected();
    superuser.assertConnected();
    const received = new Promise(resolve =>
      client.once('textMessage', resolve),
    );
    await superuser.channels
      .byId(client.self.channelId)!
      .sendMessage('hi everyone');
    expect(await received).toEqual({
      sender: client.users.bySession(superuser.session),
      message: 'hi everyone',
      isPrivate: false,
    });
  });

  it('should fetch the address', async () => {
    client.assertConnected();
    superuser.assertConnected();
    const address = await superuser.users
      .bySession(client.session)!
      .fetchAddress();
    expect(address).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
  });

  it('should have the permissions', async () => {
    superuser.assertConnected();
    const permissions = await superuser.channels.byId(0)!.getPermissions();
    expect(permissions.canBan).toBe(true);
    expect(permissions.canSendTextMessage).toBe(true);
  });
});
