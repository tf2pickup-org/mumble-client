import { Observable, Subject } from 'rxjs';
import { TLSSocket } from 'tls';
import { packetForType, packetType } from './packet-type-registry';
import { MessageType } from '@protobuf-ts/runtime';
import { UDPTunnel } from '@tf2pickup-org/mumble-protocol';
import { PacketType } from './packet-type';
import { readVarint } from './read-varint';

interface MumbleSocketReader {
  length: number;
  callback: (data: Buffer) => void;
}

interface AudioPacket {
  source: number; // Session ID of the source user
}

export class MumbleSocket {
  private readonly _packet = new Subject<PacketType>();
  private readonly _audioPacket = new Subject<AudioPacket>();
  private buffers: Buffer[] = [];
  private length = 0;
  private readers: MumbleSocketReader[] = [];

  constructor(private readonly socket: TLSSocket) {
    this.socket.on('data', (data: Buffer) => {
      this.receiveData(data);
    });
    this.readPrefix();
  }

  get packet(): Observable<PacketType> {
    return this._packet.asObservable();
  }

  get audioPacket(): Observable<AudioPacket> {
    return this._audioPacket.asObservable();
  }

  read(length: number, callback: MumbleSocketReader['callback']): void {
    this.readers.push({ length, callback });
    if (this.readers.length === 1) {
      this.flushReaders();
    }
  }

  async send<T extends object>(
    message: MessageType<T>,
    payload: T,
  ): Promise<void> {
    const typeNumber = packetType(message);
    if (typeNumber === undefined) {
      throw new Error(`unknown message type (${message.typeName})`);
    }

    const encoded = message.toBinary(payload);
    const prefix = Buffer.alloc(6);
    prefix.writeUint16BE(typeNumber, 0);
    prefix.writeUint32BE(encoded.length, 2);
    await this.write(Buffer.concat([prefix, encoded]));
  }

  write(buffer: Buffer | Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket.writable) {
        this.socket.write(buffer, err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } else {
        reject(new Error('socket not writable'));
      }
    });
  }

  end() {
    this.socket.end();
  }

  private receiveData(data: Buffer) {
    this.buffers.push(data);
    this.length += data.length;
    this.flushReaders();
  }

  private flushReaders() {
    if (this.readers.length === 0) {
      return;
    }

    const reader = this.readers[0]!;
    if (this.length < reader.length) {
      return;
    }

    const buffer = Buffer.alloc(reader.length);
    let written = 0;

    while (written < reader.length) {
      const received = this.buffers[0]!;
      const remaining = reader.length - written;
      if (received.length <= remaining) {
        received.copy(buffer, written);
        written += received.length;
        this.buffers.splice(0, 1);
        this.length -= received.length;
      } else {
        received.copy(buffer, written, 0, remaining);
        written += remaining;
        this.buffers[0] = received.subarray(remaining);
        this.length -= remaining;
      }
    }

    this.readers.splice(0, 1);
    reader.callback(buffer);
  }

  private readPrefix() {
    this.read(6, prefix => {
      const type = prefix.readUint16BE(0);
      const length = prefix.readUint32BE(2);
      this.readPacket(type, length);
    });
  }

  private readPacket(type: number, length: number) {
    this.read(length, data => {
      const message = packetForType(type);
      if (message) {
        switch (message.typeName) {
          case UDPTunnel.typeName:
            this.decodeAudio(data);
            break;

          default:
            this._packet.next({
              type,
              typeName: message.typeName,
              payload: message.fromBinary(data),
            });
        }
      } else {
        console.error(`Unrecognized packet type (${type})`);
      }

      this.readPrefix();
    });
  }

  private decodeAudio(packet: Buffer) {
    if (packet.length < 1) {
      return;
    }

    // https://github.com/mumble-voip/mumble/blob/master/docs/dev/network-protocol/voice_data.md#packet-format
    const target = 0b000111111 & packet[0]!;
    // 0 is normal talking
    if (target !== 0) {
      return;
    }

    // https://github.com/mumble-voip/mumble/blob/master/docs/dev/network-protocol/voice_data.md#encoded-audio-data-packet
    const { value } = readVarint(packet.subarray(1));
    this._audioPacket.next({ source: value as number });
  }
}
