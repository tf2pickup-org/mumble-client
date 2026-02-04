import { Observable, Subject } from 'rxjs';
import { TLSSocket } from 'tls';
import { packetForType, packetType } from './packet-type-registry';
import { MessageType } from '@protobuf-ts/runtime';
import { UDPTunnel } from '@tf2pickup-org/mumble-protocol';
import { PacketType } from './packet-type';
import { readVarint } from './read-varint';

/**
 * Write varint to buffer
 * https://github.com/mumble-voip/mumble/blob/master/docs/dev/network-protocol/voice_data.md#variable-length-integer-encoding
 */
function writeVarint(value: number): Buffer {
  if (value < 0) {
    // Negative numbers: prefix with 0xF8 then recurse
    const positive = writeVarint(-value);
    return Buffer.concat([Buffer.from([0xf8]), positive]);
  }

  if (value < 0x80) {
    // 7-bit positive number
    return Buffer.from([value]);
  }

  if (value < 0x4000) {
    // 14-bit positive number
    const buf = Buffer.alloc(2);
    buf.writeUint16BE(value | 0x8000);
    return buf;
  }

  if (value < 0x200000) {
    // 21-bit positive number
    const buf = Buffer.alloc(3);
    buf.writeUint16BE((value >> 8) | 0xc000, 0);
    buf.writeUint8(value & 0xff, 2);
    return buf;
  }

  if (value < 0x10000000) {
    // 28-bit positive number
    const buf = Buffer.alloc(4);
    buf.writeUint32BE(value | 0xe0000000);
    return buf;
  }

  // 32-bit positive number
  const buf = Buffer.alloc(5);
  buf.writeUint8(0xf0, 0);
  buf.writeUint32BE(value, 1);
  return buf;
}

interface MumbleSocketReader {
  length: number;
  callback: (data: Buffer) => void;
}

interface AudioPacket {
  source: number; // Session ID of the source user
}

/**
 * Audio codec types from Mumble protocol
 * https://github.com/mumble-voip/mumble/blob/master/docs/dev/network-protocol/voice_data.md#packet-format
 */
export enum AudioCodec {
  CELTAlpha = 0,
  Ping = 1,
  Speex = 2,
  CELTBeta = 3,
  Opus = 4,
}

/**
 * Full audio packet with encoded voice data
 */
export interface FullAudioPacket {
  source: number;        // Session ID of speaker
  target: number;        // Audio target (0 = normal talking, 1-30 = whisper, 31 = loopback)
  codec: AudioCodec;     // Audio codec used
  sequence: number;      // Packet sequence number
  audioData: Buffer;     // Encoded audio payload (Opus/CELT/Speex)
  hasTerminator: boolean; // True if this is the last packet in transmission
}

export class MumbleSocket {
  private readonly _packet = new Subject<PacketType>();
  private readonly _audioPacket = new Subject<AudioPacket>();
  private readonly _fullAudioPacket = new Subject<FullAudioPacket>();
  private buffers: Buffer[] = [];
  private length = 0;
  private readers: MumbleSocketReader[] = [];
  private audioSequence = 0; // Track sequence number for outgoing audio

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

  /**
   * Observable that emits full audio packets with encoded voice data
   */
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

  /**
   * Send audio data to Mumble server
   * 
   * @param audioData - Encoded audio payload (Opus recommended)
   * @param codec - Audio codec used (default: Opus)
   * @param target - Audio target (0 = normal talking, 1-30 = whisper, 31 = loopback)
   * @param isTerminator - True if this is the last packet in the transmission
   * @returns Promise that resolves when packet is sent
   */
  async sendAudio(
    audioData: Buffer,
    codec: AudioCodec = AudioCodec.Opus,
    target: number = 0,
    isTerminator: boolean = false,
  ): Promise<void> {
    // Build audio packet
    // Format: [header][sequence][audio_frame_header][audio_data]
    
    // Header byte: [codec: 3 bits][target: 5 bits]
    const header = Buffer.alloc(1);
    header[0] = ((codec & 0b111) << 5) | (target & 0b00011111);

    // Sequence number (varint)
    const sequence = writeVarint(this.audioSequence++);

    // Audio frame header (depends on codec)
    let frameHeader: Buffer;
    
    if (codec === AudioCodec.Opus) {
      // Opus: 16-bit varint with length and terminator bit
      const length = audioData.length & 0x1fff;
      const terminatorBit = isTerminator ? 0x2000 : 0;
      const headerValue = length | terminatorBit;
      frameHeader = writeVarint(headerValue);
    } else {
      // CELT/Speex: Single byte with length and continuation bit
      const length = audioData.length & 0x7f;
      const continuationBit = isTerminator ? 0 : 0x80;
      frameHeader = Buffer.from([length | continuationBit]);
    }

    // Build complete packet
    const packet = Buffer.concat([header, sequence, frameHeader, audioData]);

    // Send via UDPTunnel
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
    const codec = (header >> 5) & 0b111;    // Top 3 bits
    const target = header & 0b00011111;      // Bottom 5 bits

    // Skip ping packets
    if (codec === AudioCodec.Ping) {
      return;
    }

    let offset = 1;

    // https://github.com/mumble-voip/mumble/blob/master/docs/dev/network-protocol/voice_data.md#encoded-audio-data-packet
    // Read session ID (varint)
    const sessionResult = readVarint(packet.subarray(offset));
    const source = sessionResult.value as number;
    offset += sessionResult.length;

    // Emit legacy audio packet for backward compatibility
    this._audioPacket.next({ source });

    // Only emit full audio for normal talking (can be extended to support whispers)
    if (target !== 0) {
      return;
    }

    // Read sequence number (varint)
    const seqResult = readVarint(packet.subarray(offset));
    const sequence = seqResult.value as number;
    offset += seqResult.length;

    // Parse audio payload based on codec
    let audioData: Buffer;
    let hasTerminator = false;

    if (codec === AudioCodec.Opus) {
      // Opus audio frame format
      // Header is 16-bit varint with length and terminator bit
      const headerResult = readVarint(packet.subarray(offset));
      const frameHeader = headerResult.value as number;
      offset += headerResult.length;

      const audioLength = frameHeader & 0x1fff;
      hasTerminator = (frameHeader & 0x2000) !== 0;

      if (offset + audioLength <= packet.length) {
        audioData = packet.subarray(offset, offset + audioLength);
        offset += audioLength;
      } else {
        // Invalid packet
        return;
      }
    } else {
      // CELT/Speex format (legacy)
      // Multiple frames, each prefixed with length byte
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

    // Emit full audio packet
    this._fullAudioPacket.next({
      source,
      target,
      codec,
      sequence,
      audioData,
      hasTerminator,
    });
  }
}
