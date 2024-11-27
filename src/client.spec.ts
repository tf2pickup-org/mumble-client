import {
  Authenticate,
  Ping,
  ServerConfig,
  ServerSync,
  Version,
} from '@tf2pickup-org/mumble-protocol';
import { Subject } from 'rxjs';
import { Client } from './client';
import { MumbleSocket } from './mumble-socket';
import { PacketType } from './packet-type';
import { MockedObject } from 'vitest';

vi.mock('./mumble-socket', () => ({
  MumbleSocket: vi.fn().mockImplementation(() => ({
    packet: new Subject(),
    send: vi.fn().mockResolvedValue({}),
    end: vi.fn(),
  })),
}));

vi.mock('./tls-connect', () => ({
  tlsConnect: vi.fn().mockImplementation(() => {
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
    let socket: MockedObject<MumbleSocket> & {
      packet: Subject<PacketType>;
    };

    beforeEach(async () => {
      client.on('socketConnect', s => {
        socket = vi.mocked(s) as MockedObject<MumbleSocket> & {
          packet: Subject<PacketType>;
        };

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
              break;
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
