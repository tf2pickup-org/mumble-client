import { AudioCodec, Client, FullAudioPacket } from '../src';
import { waitABit } from './utils/wait-a-bit';

describe('Sends and receives audio (e2e)', () => {
  let speaker: Client;
  let listener: Client;

  beforeAll(async () => {
    speaker = new Client({
      host: 'localhost',
      port: 64738,
      username: 'speaker',
      rejectUnauthorized: false,
    });
    listener = new Client({
      host: 'localhost',
      port: 64738,
      username: 'listener',
      rejectUnauthorized: false,
    });
    await speaker.connect();
    await listener.connect();
    await waitABit(100);
  });

  afterAll(async () => {
    speaker.disconnect();
    listener.disconnect();
  });

  it('should deliver a frame to the other client', async () => {
    const received = new Promise<FullAudioPacket>(resolve =>
      listener.once('audio', resolve),
    );
    const data = Buffer.from([0xf8, 0xff, 0xfe]);
    await speaker.sendAudio({
      data,
      codec: AudioCodec.Opus,
      isTerminator: true,
    });

    const packet = await received;
    expect(packet.source).toEqual(speaker.session);
    expect(packet.codec).toEqual(AudioCodec.Opus);
    expect(packet.audioData).toEqual(data);
    expect(packet.hasTerminator).toBe(true);
  });
});
