import { ACL } from '@tf2pickup-org/mumble-protocol';
import { Channel, Client } from '../src';
import { createCertificate } from './utils/create-certificate';
import { waitABit } from './utils/wait-a-bit';

const move = 0x20;
const enter = 0x4;

describe('moves another user with Move but no Enter (e2e)', () => {
  let superuser: Client;
  let mover: Client;
  let target: Client;
  let parent: Channel;
  let locked: Channel;

  beforeAll(async () => {
    superuser = new Client({
      host: 'localhost',
      port: 64738,
      username: 'superuser',
      password: '123456',
      rejectUnauthorized: false,
    });
    mover = new Client({
      host: 'localhost',
      port: 64738,
      username: 'mover',
      rejectUnauthorized: false,
      ...(await createCertificate()),
    });
    target = new Client({
      host: 'localhost',
      port: 64738,
      username: 'move_target',
      rejectUnauthorized: false,
      ...(await createCertificate()),
    });
    await superuser.connect();
    await mover.connect();
    await target.connect();
    await waitABit(100);

    superuser.assertConnected();
    mover.assertConnected();
    target.assertConnected();
    parent = await superuser.channels.byId(0)!.createSubChannel('move-test');
    locked = await parent.createSubChannel('locked');

    // the mover is not registered, so it is matched by its certificate hash
    await parent.saveAcl(
      ACL.create({
        inheritAcls: true,
        acls: [
          {
            applyHere: true,
            applySubs: true,
            inherited: false,
            group: `$${mover.self.hash}`,
            grant: move,
            deny: 0,
          },
        ],
      }),
    );
    // the server silently drops messages over its rate limit (a burst of 5,
    // then 1 per second by default)
    await waitABit(3000);
    await locked.saveAcl(
      ACL.create({
        inheritAcls: true,
        acls: [
          {
            applyHere: true,
            applySubs: true,
            inherited: false,
            group: 'all',
            grant: 0,
            deny: enter,
          },
        ],
      }),
    );

    await superuser.users.bySession(target.session)!.moveToChannel(parent.id);
    await waitABit(100);
  }, 10000);

  afterAll(async () => {
    mover.disconnect();
    target.disconnect();
    await parent.remove();
    superuser.disconnect();
  });

  it('should not let the mover enter the locked channel itself', async () => {
    mover.assertConnected();
    const permissions = await mover.channels.byId(locked.id)!.getPermissions();
    expect(permissions.canJoinChannel).toBe(false);
  });

  it('should move the target into the locked channel', async () => {
    mover.assertConnected();
    target.assertConnected();
    await mover.users.bySession(target.session)!.moveToChannel(locked.id);
    await waitABit(100);
    expect(target.self.channelId).toBe(locked.id);
  });
});
