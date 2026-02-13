import {
  Authenticate,
  PermissionDenied,
  Ping,
  ServerConfig,
  ServerSync,
  UserList,
  UserState,
  Version,
} from '@tf2pickup-org/mumble-protocol';
import { Subject } from 'rxjs';
import { Client } from './client';
import { MumbleSocket } from './mumble-socket';
import { PacketType } from './packet-type';
import { MockedObject } from 'vitest';
import { CommandTimedOutError, PermissionDeniedError } from './errors';

vi.mock('./mumble-socket', () => ({
  MumbleSocket: vi.fn().mockImplementation(function () {
    return {
      packet: new Subject(),
      audioPacket: new Subject(),
      send: vi.fn().mockResolvedValue({}),
      end: vi.fn(),
    };
  }),
}));

vi.mock('./tls-connect', () => ({
  tlsConnect: vi.fn().mockImplementation(() => {
    return Promise.resolve({});
  }),
}));

type MockSocket = MockedObject<MumbleSocket> & {
  packet: Subject<PacketType>;
};

function setupMockSocket(
  client: Client,
  options?: { respondToPing?: boolean },
): { getSocket: () => MockSocket } {
  const respondToPing = options?.respondToPing ?? true;
  let socket: MockSocket;

  client.on('socketConnect', s => {
    socket = vi.mocked(s) as MockSocket;

    socket.send.mockImplementation(type => {
      switch (type.typeName) {
        case Authenticate.typeName:
          socket.packet.next({
            type: 0,
            typeName: Version.typeName,
            payload: Version.create({
              versionV1: 66790,
              versionV2: BigInt(66790),
              release: '1.4.230',
              os: 'Linux',
              osVersion: 'Ubuntu 20.04.4 LTS [x64]',
            }),
          });
          socket.packet.next({
            type: 5,
            typeName: ServerSync.typeName,
            payload: ServerSync.create({
              session: 2,
              maxBandwidth: 558000,
              welcomeText: '',
              permissions: BigInt(134744846),
            }),
          });
          socket.packet.next({
            type: 24,
            typeName: ServerConfig.typeName,
            payload: ServerConfig.create({
              allowHtml: true,
              messageLength: 5000,
              imageMessageLength: 131072,
              maxUsers: 100,
            }),
          });
          break;

        case Ping.typeName:
          if (respondToPing) {
            socket.packet.next({
              type: 3,
              typeName: Ping.typeName,
              payload: Ping.create({
                timestamp: BigInt(0),
                good: 0,
                late: 0,
                lost: 0,
                resync: 0,
              }),
            });
          }
          break;
      }

      return Promise.resolve();
    });
  });

  return {
    getSocket: () => socket!,
  };
}

describe(Client.name, () => {
  let client: Client;

  beforeEach(() => {
    client = new Client({
      host: 'FAKE_HOST',
      port: 64738,
      username: 'FAKE_USER',
    });
  });

  it('should create client', () => {
    expect(client).toBeTruthy();
  });

  describe('when connected', () => {
    let socket: MockSocket;

    beforeEach(async () => {
      const mock = setupMockSocket(client);
      await client.connect();
      socket = mock.getSocket();
    });

    afterEach(() => {
      client.disconnect();
    });

    it('should create socket', () => {
      expect(client.socket).toBeTruthy();
    });

    describe('disconnect()', () => {
      it('should end the socket', () => {
        const socket = client.socket;
        client.disconnect();
        expect(socket?.end).toHaveBeenCalled();
      });
    });

    describe('command()', () => {
      let response: Promise<unknown>;

      beforeEach(() => {
        vi.useFakeTimers();

        response = client.command('moveUserToChannel', {
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

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should handle valid response', async () => {
        socket.packet.next({
          type: 9,
          typeName: UserState.typeName,
          payload: UserState.create({
            session: 2,
            channelId: 77,
          }),
        });
        expect(socket.send).toHaveBeenCalledWith(
          UserState,
          UserState.create({ session: 2, channelId: 77 }),
        );
        expect(await response).toBeTruthy();
      });

      it('should handle timeout', async () => {
        expect(socket.send).toHaveBeenCalledWith(
          UserState,
          UserState.create({ session: 2, channelId: 77 }),
        );

        vi.runAllTimers();
        await expect(response).rejects.toThrow(CommandTimedOutError);
      });

      it('should handle denied permissions', async () => {
        socket.packet.next({
          type: 12,
          typeName: PermissionDenied.typeName,
          payload: PermissionDenied.create({
            session: 2,
          }),
        });

        expect(socket.send).toHaveBeenCalledWith(
          UserState,
          UserState.create({ session: 2, channelId: 77 }),
        );

        await expect(response).rejects.toThrow(PermissionDeniedError);
      });

      it('should send many packets', async () => {
        const response = client.command('deregisterUser', {
          sendPackets: [
            [UserList, UserList.create({ users: [{ userId: 24 }] })],
            [UserList, UserList.create()],
          ],
          expectPacket: [UserList, () => true],
        });
        socket.packet.next({
          type: 18,
          typeName: UserList.typeName,
          payload: UserList.create(),
        });
        await response;
        expect(socket.send).toHaveBeenCalledWith(UserList, {
          users: [{ userId: 24 }],
        });
        expect(socket.send).toHaveBeenCalledWith(UserList, { users: [] });
      });
    });
  });

  describe('pinger', () => {
    let socket: MockSocket;

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      client.disconnect();
      vi.useRealTimers();
    });

    it('should emit error when ping fails', async () => {
      const mock = setupMockSocket(client, { respondToPing: false });
      await client.connect();
      socket = mock.getSocket();

      const pingError = new Error('socket not writable');
      socket.send.mockRejectedValue(pingError);

      const errorHandler = vi.fn();
      client.on('error', errorHandler);

      await vi.advanceTimersByTimeAsync(10001);

      expect(errorHandler).toHaveBeenCalledWith(pingError);
    });

    it('should stop pinging after disconnect', async () => {
      const mock = setupMockSocket(client, { respondToPing: false });
      await client.connect();
      socket = mock.getSocket();

      socket.send.mockClear();
      client.disconnect();

      await vi.advanceTimersByTimeAsync(10001);

      expect(socket.send).not.toHaveBeenCalled();
    });
  });
});
