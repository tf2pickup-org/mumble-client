import { Observable, Subject } from 'rxjs';
import { TLSSocket } from 'tls';
import { messageTypeRegistry, UnknownMessage } from '@proto/typeRegistry';
import { packetName, packetType } from './packet-type-registry';

interface MumbleSocketReader {
  length: number;
  callback: (data: Buffer) => void;
}

export class MumbleSocket {
  private _packet = new Subject<UnknownMessage>();
  private buffers: Buffer[] = [];
  private length = 0;
  private readers: MumbleSocketReader[] = [];

  constructor(private readonly socket: TLSSocket) {
    this.socket.on('data', data => this.receiveData(data));
    this.readPrefix();
  }

  get packet(): Observable<UnknownMessage> {
    return this._packet.asObservable();
  }

  read(length: number, callback: MumbleSocketReader['callback']): void {
    this.readers.push({ length, callback });
    if (this.readers.length === 1) {
      this.flushReaders();
    }
  }

  async send(message: UnknownMessage): Promise<void> {
    const messageType = messageTypeRegistry.get(message.$type);
    if (!messageType) {
      throw new Error(`unknown message type (${message.$type})`);
    }

    const typeNumber = packetType(message.$type);
    if (typeNumber === undefined) {
      throw new Error(`unknown message type (${message.$type})`);
    }

    const payload = messageType.encode(message).finish();
    const prefix = Buffer.alloc(6);
    prefix.writeUint16BE(typeNumber, 0);
    prefix.writeUint32BE(payload.length, 2);
    await this.write(Buffer.concat([prefix, payload]));
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

    const reader = this.readers[0];
    if (this.length < reader.length) {
      return;
    }

    const buffer = Buffer.alloc(reader.length);
    let written = 0;

    while (written < reader.length) {
      const received = this.buffers[0];
      const remaining = reader.length - written;
      if (received.length <= remaining) {
        received.copy(buffer, written);
        written += received.length;
        this.buffers.splice(0, 1);
        this.length -= received.length;
      } else {
        received.copy(buffer, written, 0, remaining);
        written += remaining;
        this.buffers[0] = received.slice(remaining);
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
      const packetTypeName = packetName(type);
      if (packetTypeName) {
        const message = messageTypeRegistry.get(packetTypeName);
        if (message) {
          this._packet.next(message?.decode(data));
        } else {
          console.error(`Unrecognized packet type (${packetTypeName})`);
        }
      } else {
        console.error(`Unrecognized packet type (${type})`);
      }

      this.readPrefix();
    });
  }
}
