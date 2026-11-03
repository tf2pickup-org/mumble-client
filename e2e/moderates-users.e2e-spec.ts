import { Client } from '../src';
import { waitABit } from './utils/wait-a-bit';

describe('Moderates users (e2e)', () => {
  let superuser: Client;
  let target: Client;

  const targetSeenBySuperuser = () => {
    target.assertConnected();
    return superuser.users.bySession(target.session)!;
  };

  beforeAll(async () => {
    superuser = new Client({
      host: 'localhost',
      port: 64738,
      username: 'superuser',
      password: '123456',
      rejectUnauthorized: false,
    });
    target = new Client({
      host: 'localhost',
      port: 64738,
      username: 'moderated',
      rejectUnauthorized: false,
    });
    await superuser.connect();
    await target.connect();
    await waitABit(100);
  });

  afterAll(() => {
    superuser.disconnect();
    target.disconnect();
  });

  it('should mute and unmute', async () => {
    await targetSeenBySuperuser().setMute(true);
    await waitABit(100);
    expect(target.self?.mute).toBe(true);

    await targetSeenBySuperuser().setMute(false);
    await waitABit(100);
    expect(target.self?.mute).toBe(false);
  });

  it('should deafen, which also mutes', async () => {
    await targetSeenBySuperuser().setDeaf(true);
    await waitABit(100);
    expect(target.self?.deaf).toBe(true);
    expect(target.self?.mute).toBe(true);

    await targetSeenBySuperuser().setDeaf(false);
    await waitABit(100);
    expect(target.self?.deaf).toBe(false);
  });

  it('should kick', async () => {
    const disconnected = new Promise<{ reason?: string } | undefined>(resolve =>
      target.once('disconnect', resolve),
    );
    const session = targetSeenBySuperuser().session;

    await targetSeenBySuperuser().kick('bye');

    expect(await disconnected).toEqual({ reason: 'bye' });
    expect(superuser.users.bySession(session)).toBeUndefined();
  });

  it('should reject kicking without the Kick permission', async () => {
    const kicker = new Client({
      host: 'localhost',
      port: 64738,
      username: 'kicker',
      rejectUnauthorized: false,
    });
    await target.connect();
    await kicker.connect();
    await waitABit(100);

    target.assertConnected();
    await expect(
      kicker.users.bySession(target.session)!.kick(),
    ).rejects.toThrow();
    kicker.disconnect();
  });
});
