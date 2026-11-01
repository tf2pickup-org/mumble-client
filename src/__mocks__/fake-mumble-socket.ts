import {
  Authenticate,
  Ping,
  ServerConfig,
  ServerSync,
  Version,
} from '@tf2pickup-org/mumble-protocol';
import { MessageType } from '@protobuf-ts/runtime';
import { EventEmitter } from 'node:events';
import { MumbleSocket } from '../mumble-socket';
import { PacketType } from '../packet-type';
import { packetType } from '../packet-type-registry';

/**
 * A MumbleSocket stand-in that answers the handshake like a real server
 * (session 2) and lets tests push packets in.
 */
export class FakeMumbleSocket extends EventEmitter {
  respondToHandshake = true;
  respondToPing = true;

  readonly send = vi.fn(async (type: MessageType<object>) => {
    if (type.typeName === Authenticate.typeName && this.respondToHandshake) {
      this.receive(Version, Version.create({ release: '1.4.230' }));
      this.receive(ServerSync, ServerSync.create({ session: 2 }));
      this.receive(ServerConfig, ServerConfig.create({ maxUsers: 100 }));
    } else if (type.typeName === Ping.typeName && this.respondToPing) {
      this.receive(Ping, Ping.create());
    }
  });

  readonly end = vi.fn();

  receive<T extends object>(type: MessageType<T>, payload: T) {
    const packet: PacketType = {
      type: packetType(type)!,
      typeName: type.typeName,
      payload,
    };
    this.emit('packet', packet);
  }

  /** Simulates the server closing the TLS connection. */
  close() {
    this.emit('close');
  }

  asMumbleSocket(): MumbleSocket {
    return this as unknown as MumbleSocket;
  }
}
