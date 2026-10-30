import { PermissionQuery } from '@tf2pickup-org/mumble-protocol';
import { Client } from './client';
import { MumbleSocket } from './mumble-socket';
import { FakeMumbleSocket } from './__mocks__/fake-mumble-socket';
import { ClientDisconnectedError } from './errors';

vi.mock('./mumble-socket');

vi.mock('./tls-connect', () => ({
  tlsConnect: vi.fn().mockImplementation(() => {
    return Promise.resolve({ end: vi.fn() });
  }),
}));

describe(Client.name, () => {
  let client: Client;
  let sockets: FakeMumbleSocket[];
  let events: string[];

  beforeEach(() => {
    sockets = [];
    vi.mocked(MumbleSocket).mockImplementation(function () {
      const socket = new FakeMumbleSocket();
      sockets.push(socket);
      return socket.asMumbleSocket();
    });

    client = new Client({
      host: 'FAKE_HOST',
      port: 64738,
      username: 'FAKE_USER',
    });
    events = [];
    client.on('connect', () => events.push('connect'));
    client.on('disconnect', () => events.push('disconnect'));
  });

  afterEach(() => {
    client.disconnect();
  });

  it('should not be connected initially', () => {
    expect(client.isConnected()).toBe(false);
  });

  it('should not emit disconnect when not connected', () => {
    client.disconnect();
    expect(events).toEqual([]);
  });

  describe('when connected', () => {
    beforeEach(async () => {
      await client.connect();
    });

    it('should expose the connection state', () => {
      expect(client.isConnected()).toBe(true);
      expect(client.socket).toBe(sockets[0]);
      expect(client.session).toBe(2);
      expect(events).toEqual(['connect']);
    });

    it('should end the socket on disconnect()', () => {
      client.disconnect();
      client.disconnect();
      expect(sockets[0]!.end).toHaveBeenCalled();
      expect(client.isConnected()).toBe(false);
      expect(events).toEqual(['connect', 'disconnect']);
    });

    it('should disconnect when the server closes the connection', () => {
      sockets[0]!.close();
      expect(client.isConnected()).toBe(false);
      expect(events).toEqual(['connect', 'disconnect']);
    });

    it('should reconnect when connecting again', async () => {
      await client.connect();
      expect(sockets[0]!.end).toHaveBeenCalled();
      expect(client.socket).toBe(sockets[1]);
      expect(events).toEqual(['connect', 'disconnect', 'connect']);
    });

    it('should forget cached permissions on reconnect', async () => {
      sockets[0]!.receive(
        PermissionQuery,
        PermissionQuery.create({ channelId: 5, permissions: 0x1 }),
      );
      expect(client.cachedPermissions(5)).toBeDefined();
      await client.connect();
      expect(client.cachedPermissions(5)).toBeUndefined();
    });

    it('should not stack listeners on reconnect', async () => {
      const listeners = client.listenerCount('disconnect');
      await client.connect();
      await client.connect();
      expect(client.listenerCount('disconnect')).toBe(listeners);
    });
  });

  it('should reject a handshake superseded by another connect()', async () => {
    vi.mocked(MumbleSocket).mockImplementationOnce(function () {
      const socket = new FakeMumbleSocket();
      socket.respondToHandshake = false;
      sockets.push(socket);
      return socket.asMumbleSocket();
    });

    const first = client.connect();
    await vi.waitFor(() => expect(sockets).toHaveLength(1));
    await client.connect();

    await expect(first).rejects.toThrow(ClientDisconnectedError);
    expect(client.socket).toBe(sockets[1]);
    expect(events).toEqual(['connect']);
  });

  it('should reject a connect() superseded before the socket opens', async () => {
    const first = client.connect();
    await client.connect();
    await expect(first).rejects.toThrow(ClientDisconnectedError);
    expect(sockets).toHaveLength(1);
  });
});
