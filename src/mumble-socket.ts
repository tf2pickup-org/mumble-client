import { Observable, Subject } from 'rxjs';
import { TLSSocket } from 'tls';
import { packetForType, packetType } from './packet-type-registry';
import { MessageType } from '@protobuf-ts/runtime';
import { UDPTunnel } from '@tf2pickup-org/mumble-protocol';
import { PacketType } from './packet-type';
import { readVarint } from './read-varint';
import { writeVarint } from './write-varint';

interface MumbleSocketReader {
  length: number;
  callback: (data: Buffer) => void;
}

interface AudioPacket {
  source: number; // Session ID of the source user
}

// https://github.com/mumble-voip/mumble/blob/master/docs/dev/network-protocol/voice_data.md#packet-format
export enum AudioCodec {
  CELTAlpha = 0,
  Ping = 1,
  Speex = 2,
  CELTBeta = 3,
  Opus = 4,
}

export interface FullAudioPacket {
  source: number; // Session ID of speaker
  target: number; // Audio target (0 = normal talking, 1-30 = whisper, 31 = loopback)
  codec: AudioCodec;
  sequence: number;
  audioData: Buffer; // Encoded audio payload (Opus/CELT/Speex)
  hasTerminator: boolean; // True if this is the last packet in the transmission
}

export interface SendAudioOptions {
  data: Buffer;
  codec?: AudioCodec;
  target?: number;
  isTerminator?: boolean;
}

export class MumbleSocket {
  private readonly _packet = new Subject<PacketType>();
  private readonly _audioPacket = new Subject<AudioPacket>();
  private readonly _fullAudioPacket = new Subject<FullAudioPacket>();
  private buffers: Buffer[] = [];
  private length = 0;
  private readers: MumbleSocketReader[] = [];
  private audioSequence = 0;

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

  get fullAudioPacket(): Observable<FullAudioPacket> {
    return this._fullAudioPacket.asObservable();
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

  // https://github.com/mumble-voip/mumble/blob/master/docs/dev/network-protocol/voice_data.md#packet-format
  async sendAudio({
    data,
    codec = AudioCodec.Opus,
    target = 0,
    isTerminator = false,
  }: SendAudioOptions): Promise<void> {
    // Header byte: [codec: 3 bits][target: 5 bits]
    const header = Buffer.alloc(1);
    header[0] = ((codec & 0b111) << 5) | (target & 0b00011111);

    const sequence = writeVarint(this.audioSequence++);

    let frameHeader: Buffer;
    if (codec === AudioCodec.Opus) {
      // https://github.com/mumble-voip/mumble/blob/master/docs/dev/network-protocol/voice_data.md#opus-audio-data
      // 13-bit length (0x1fff) with terminator flag at bit 13 (0x2000)
      const frameHeaderValue = (data.length & 0x1fff) | (isTerminator ? 0x2000 : 0);
      frameHeader = writeVarint(frameHeaderValue);
    } else {
      // https://github.com/mumble-voip/mumble/blob/master/docs/dev/network-protocol/voice_data.md#celt-and-speex-audio-data
      // 7-bit length (0x7f) with continuation flag at bit 7 (0x80)
      const continuationBit = isTerminator ? 0 : 0x80;
      frameHeader = Buffer.from([(data.length & 0x7f) | continuationBit]);
    }

    const packet = Buffer.concat([header, sequence, frameHeader, data]);

    const typeNumber = packetType(UDPTunnel);
    if (typeNumber === undefined) {
      throw new Error('UDPTunnel packet type not found');
    }

    const prefix = Buffer.alloc(6);
    prefix.writeUint16BE(typeNumber, 0);
    prefix.writeUint32BE(packet.length, 2);
    await this.write(Buffer.concat([prefix, packet]));
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
    const header = packet[0]!;
    const codec = (header >> 5) & 0b111; // top 3 bits
    const target = header & 0b00011111; // bottom 5 bits

    if (codec === AudioCodec.Ping) {
      return;
    }

    let offset = 1;

    // https://github.com/mumble-voip/mumble/blob/master/docs/dev/network-protocol/voice_data.md#encoded-audio-data-packet
    const sessionResult = readVarint(packet.subarray(offset));
    const source = sessionResult.value as number;
    offset += sessionResult.length;

    // Emit legacy packet for backward compatibility
    this._audioPacket.next({ source });

    // Only parse full audio for normal talking (target 0)
    if (target !== 0) {
      return;
    }

    const seqResult = readVarint(packet.subarray(offset));
    const sequence = seqResult.value as number;
    offset += seqResult.length;

    let audioData: Buffer;
    let hasTerminator = false;

    if (codec === AudioCodec.Opus) {
      // https://github.com/mumble-voip/mumble/blob/master/docs/dev/network-protocol/voice_data.md#opus-audio-data
      // 13-bit length (0x1fff) with terminator flag at bit 13 (0x2000)
      const frameHeaderResult = readVarint(packet.subarray(offset));
      const frameHeader = frameHeaderResult.value as number;
      offset += frameHeaderResult.length;

      const audioLength = frameHeader & 0x1fff;
      hasTerminator = (frameHeader & 0x2000) !== 0;

      if (offset + audioLength > packet.length) {
        return;
      }

      audioData = packet.subarray(offset, offset + audioLength);
    } else {
      // https://github.com/mumble-voip/mumble/blob/master/docs/dev/network-protocol/voice_data.md#celt-and-speex-audio-data
      // 7-bit length (0x7f) with continuation flag at bit 7 (0x80)
      const frames: Buffer[] = [];

      while (offset < packet.length) {
        const frameHeader = packet[offset]!;
        offset++;

        const frameLength = frameHeader & 0x7f;
        const continuation = (frameHeader & 0x80) !== 0;

        if (frameLength > 0 && offset + frameLength <= packet.length) {
          frames.push(packet.subarray(offset, offset + frameLength));
          offset += frameLength;
        }

        if (!continuation) {
          hasTerminator = true;
          break;
        }
      }

      audioData = Buffer.concat(frames);
    }

    this._fullAudioPacket.next({ source, target, codec, sequence, audioData, hasTerminator });
  }
}
