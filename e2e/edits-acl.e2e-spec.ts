import { Client } from '../src';
import { waitABit } from './utils/wait-a-bit';

describe('Edits ACL (e2e)', () => {
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

  it('should edit', async () => {
    client.assertConnected();
    const channel = await client.user.channel.createSubChannel('test');
    const acls = await channel.fetchAcl();
    acls.inheritAcls = false;
    acls.acls = [
      {
        applyHere: true,
        applySubs: true,
        inherited: false,
        userId: 2,
        grant: 0x4,
        deny: 0x8,
      },
    ];
    await channel.saveAcl(acls);
    await waitABit(100);
    await channel.remove();
  });
});
