import {
  Authenticate,
  Ping,
  ServerConfig,
  ServerSync,
  Version,
} from '@proto/Mumble';
import { Subject } from 'rxjs';
import { Client } from './client';
import { encodeMumbleVersion } from './encode-mumble-version';
import { MumbleSocket } from './mumble-socket';

jest.mock('./mumble-socket', () => ({
  MumbleSocket: jest.fn().mockImplementation(() => ({
    packet: new Subject(),
    send: jest.fn().mockResolvedValue({}),
    end: jest.fn(),
  })),
}));

jest.mock('./tls-connect', () => ({
  tlsConnect: jest.fn().mockImplementation(() => {
    return Promise.resolve({});
  }),
}));

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
    let socket: jest.Mocked<MumbleSocket> & { packet: Subject<unknown> };

    beforeEach(async () => {
      client.on('socketConnected', s => {
        socket = s;

        socket.send.mockImplementation(message => {
          if (Authenticate.is(message)) {
            socket.packet.next(
              Version.create({
                version: encodeMumbleVersion({
                  major: 1,
                  minor: 4,
                  patch: 230,
                }),
              }),
            );
            socket.packet.next(ServerSync.create({ session: 1234 }));
            socket.packet.next(ServerConfig.create({ welcomeText: 'TESTING' }));
          } else if (Ping.is(message)) {
            socket.packet.next(
              Ping.create({ timestamp: BigInt(new Date().getDate()) }),
            );
          }

          return Promise.resolve();
        });
      });
      const connect = client.connect();
      return connect;
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
  });
});
