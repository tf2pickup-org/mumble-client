import {
  PermissionDenied,
  PermissionQuery,
  Ping,
  Reject,
  UserList,
  UserRemove,
  UserState,
} from '@tf2pickup-org/mumble-protocol';
import { Connection, ConnectionHost } from './connection';
import { FakeMumbleSocket } from './__mocks__/fake-mumble-socket';
import { ChannelManager } from './channel-manager';
import { UserManager } from './user-manager';
import { Client } from './client';
import {
  ClientDisconnectedError,
  CommandTimedOutError,
  ConnectionRejectedError,
  PermissionDeniedError,
} from './errors';

function makeHost() {
  const host = {
    emit: vi.fn(),
    options: {
      host: 'FAKE_HOST',
      port: 64738,
      username: 'FAKE_USER',
      pingInterval: 10000,
    },
  } as unknown as ConnectionHost & { emit: ReturnType<typeof vi.fn> };
  host.channels = new ChannelManager(host as unknown as Client);
  host.users = new UserManager(host as unknown as Client);
  return host;
}

describe(Connection.name, () => {
  let host: ReturnType<typeof makeHost>;
  let socket: FakeMumbleSocket;
  let connection: Connection;

  const disconnectEmits = () =>
    host.emit.mock.calls.filter(([event]) => event === 'disconnect');

  beforeEach(() => {
    host = makeHost();
    socket = new FakeMumbleSocket();
    connection = new Connection(socket.asMumbleSocket(), host);
  });

  afterEach(() => {
    connection.teardown();
  });

  describe('handshake()', () => {
    it('should store server state and emit connect', async () => {
      await connection.handshake();
      expect(connection.session).toBe(2);
      expect(connection.serverVersion?.release).toEqual('1.4.230');
      expect(connection.serverConfig?.maxUsers).toBe(100);
      expect(host.emit).toHaveBeenCalledWith('connect');
    });

    it('should reject when the server rejects the client', async () => {
      socket.respondToHandshake = false;
      const handshake = connection.handshake();
      socket.receive(Reject, Reject.create({ reason: 'wrong password' }));
      await expect(handshake).rejects.toThrow(ConnectionRejectedError);
      expect(connection.isOpen).toBe(false);
      expect(socket.end).toHaveBeenCalled();
      expect(disconnectEmits()).toHaveLength(0);
    });

    it('should reject when the server closes the connection', async () => {
      // mumble 1.6.x drops the TLS connection on failed superuser auth
      socket.respondToHandshake = false;
      const handshake = connection.handshake();
      socket.close();
      await expect(handshake).rejects.toThrow(ClientDisconnectedError);
      expect(disconnectEmits()).toHaveLength(0);
    });

    it('should reject when torn down', async () => {
      socket.respondToHandshake = false;
      const handshake = connection.handshake();
      connection.teardown();
      await expect(handshake).rejects.toThrow(ClientDisconnectedError);
      expect(disconnectEmits()).toHaveLength(0);
    });
  });

  describe('when connected', () => {
    beforeEach(async () => {
      await connection.handshake();
    });

    it('should emit disconnect once when the server closes the connection', () => {
      socket.close();
      connection.teardown();
      expect(connection.isOpen).toBe(false);
      expect(disconnectEmits()).toEqual([
        ['disconnect', { reason: 'connection closed' }],
      ]);
    });

    it('should tear down when the server removes the client', () => {
      socket.receive(
        UserRemove,
        UserRemove.create({ session: 2, reason: 'kicked' }),
      );
      expect(connection.isOpen).toBe(false);
      expect(socket.end).toHaveBeenCalled();
      expect(disconnectEmits()).toEqual([['disconnect', { reason: 'kicked' }]]);
    });

    it('should not tear down when another user is removed', () => {
      socket.receive(UserRemove, UserRemove.create({ session: 3 }));
      expect(connection.isOpen).toBe(true);
    });

    it('should emit disconnect without a reason on teardown', () => {
      connection.teardown();
      expect(disconnectEmits()).toEqual([['disconnect', undefined]]);
      expect(socket.end).toHaveBeenCalled();
    });

    it('should feed the registries', () => {
      socket.receive(UserState, UserState.create({ session: 3, name: 'bob' }));
      expect(host.users.bySession(3)?.name).toEqual('bob');
    });

    it('should stop feeding the registries after teardown', () => {
      connection.teardown();
      socket.receive(UserState, UserState.create({ session: 3, name: 'bob' }));
      expect(host.users.bySession(3)).toBeUndefined();
    });

    it('should cache permissions', () => {
      socket.receive(
        PermissionQuery,
        PermissionQuery.create({ channelId: 5, permissions: 0x1 }),
      );
      expect(connection.permissions.get(5)?.permissions).toBe(0x1);
    });

    describe('command()', () => {
      let response: Promise<unknown>;

      beforeEach(() => {
        vi.useFakeTimers();
        response = connection.command('moveUserToChannel', {
          sendPacket: [
            UserState,
            UserState.create({ session: 2, channelId: 77 }),
          ],
          expectPacket: [
            UserState,
            userState => userState.session === 2 && userState.channelId === 77,
          ],
        });
      });

      afterEach(async () => {
        connection.teardown();
        await response.catch(() => undefined);
        vi.useRealTimers();
      });

      it('should send the packet', () => {
        expect(socket.send).toHaveBeenCalledWith(
          UserState,
          UserState.create({ session: 2, channelId: 77 }),
        );
      });

      it('should handle valid response', async () => {
        socket.receive(
          UserState,
          UserState.create({ session: 2, channelId: 77 }),
        );
        expect(await response).toBeTruthy();
      });

      it('should handle timeout', async () => {
        vi.runAllTimers();
        await expect(response).rejects.toThrow(CommandTimedOutError);
      });

      it('should handle denied permissions', async () => {
        socket.receive(
          PermissionDenied,
          PermissionDenied.create({ session: 2 }),
        );
        await expect(response).rejects.toThrow(PermissionDeniedError);
      });

      it('should reject on teardown', async () => {
        connection.teardown();
        await expect(response).rejects.toThrow(ClientDisconnectedError);
      });

      it('should reject when the server closes the connection', async () => {
        socket.close();
        await expect(response).rejects.toThrow(ClientDisconnectedError);
      });
    });

    it('should send many packets', async () => {
      const response = connection.command('deregisterUser', {
        sendPackets: [
          [UserList, UserList.create({ users: [{ userId: 24 }] })],
          [UserList, UserList.create()],
        ],
        expectPacket: [UserList, () => true],
      });
      socket.receive(UserList, UserList.create());
      await response;
      expect(socket.send).toHaveBeenCalledWith(UserList, {
        users: [{ userId: 24 }],
      });
      expect(socket.send).toHaveBeenCalledWith(UserList, { users: [] });
    });

    it('should reject commands after teardown', async () => {
      connection.teardown();
      await expect(
        connection.command('fetchRegisteredUsers', {
          sendPacket: [UserList, UserList.create()],
          expectPacket: [UserList, () => true],
        }),
      ).rejects.toThrow(ClientDisconnectedError);
    });
  });

  describe('pinger', () => {
    beforeEach(async () => {
      vi.useFakeTimers();
      socket.respondToPing = false;
      await connection.handshake();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should ping periodically', async () => {
      socket.send.mockClear();
      await vi.advanceTimersByTimeAsync(10001);
      expect(socket.send).toHaveBeenCalledWith(Ping, Ping.create());
    });

    it('should emit error when ping fails', async () => {
      const pingError = new Error('socket not writable');
      socket.send.mockRejectedValue(pingError);
      await vi.advanceTimersByTimeAsync(10001);
      expect(host.emit).toHaveBeenCalledWith('error', pingError);
    });

    it('should stop pinging after teardown', async () => {
      socket.send.mockClear();
      connection.teardown();
      await vi.advanceTimersByTimeAsync(10001);
      expect(socket.send).not.toHaveBeenCalled();
    });
  });
});
