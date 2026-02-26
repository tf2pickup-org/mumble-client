# Audio Support Example

This document covers the full audio data extraction and sending capabilities of `@tf2pickup-org/mumble-client`.

## Receiving Audio

```typescript
import { Client, AudioCodec, FullAudioPacket } from '@tf2pickup-org/mumble-client';

const client = new Client({
  host: 'mumble://example.com',
  port: 64738,
  username: 'audio-bot',
});

await client.connect();

if (client.isConnected()) {
  const socket = client.socket;

  socket.fullAudioPacket.subscribe((packet: FullAudioPacket) => {
    console.log(`Audio from user ${packet.source}`);
    console.log(`Codec: ${AudioCodec[packet.codec]}`);
    console.log(`Sequence: ${packet.sequence}`);
    console.log(`Audio data length: ${packet.audioData.length} bytes`);
    console.log(`Is final packet: ${packet.hasTerminator}`);

    processAudio(packet.audioData, packet.codec);
  });
}

async function processAudio(encodedAudio: Buffer, codec: AudioCodec) {
  if (codec === AudioCodec.Opus) {
    const text = await transcribeOpus(encodedAudio);
    console.log('Transcribed:', text);
  }
}
```

## Sending Audio

```typescript
import { AudioCodec } from '@tf2pickup-org/mumble-client';

const opusFrames: Buffer[] = await generateOpusAudio();

for (let i = 0; i < opusFrames.length; i++) {
  await socket.sendAudio({
    data: opusFrames[i],
    codec: AudioCodec.Opus,
    target: 0,
    isTerminator: i === opusFrames.length - 1,
  });

  // Add delay matching frame duration (typically 20ms for Opus)
  await sleep(20);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

## Full Voice Chat Bot Example

```typescript
import { Client, AudioCodec, FullAudioPacket } from '@tf2pickup-org/mumble-client';

async function createVoiceChatBot() {
  const client = new Client({
    host: 'mumble://example.com',
    port: 64738,
    username: 'voice-assistant',
  });

  await client.connect();

  if (!client.isConnected()) {
    throw new Error('Failed to connect');
  }

  const socket = client.socket;

  socket.fullAudioPacket.subscribe(async (packet: FullAudioPacket) => {
    if (packet.codec !== AudioCodec.Opus) {
      console.warn('Only Opus codec supported');
      return;
    }

    if (packet.hasTerminator) {
      const text = await transcribeAudio(packet.audioData);
      console.log('User said:', text);

      const responseText = await generateResponse(text);
      console.log('Bot responds:', responseText);

      const audioFrames = await textToSpeech(responseText);

      for (let i = 0; i < audioFrames.length; i++) {
        await socket.sendAudio({
          data: audioFrames[i],
          codec: AudioCodec.Opus,
          target: 0,
          isTerminator: i === audioFrames.length - 1,
        });
        await sleep(20);
      }
    }
  });

  console.log('Voice chat bot ready!');
}

async function transcribeAudio(opus: Buffer): Promise<string> {
  return 'transcribed text';
}

async function generateResponse(text: string): Promise<string> {
  return 'bot response';
}

async function textToSpeech(text: string): Promise<Buffer[]> {
  return [];
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

## Audio Codec Notes

- **Opus** (recommended): Modern, efficient codec. Default for Mumble 1.2.4+
- **CELT Alpha/Beta**: Legacy codecs, less common
- **Speex**: Old codec, rarely used

Most modern Mumble servers use **Opus exclusively**.

## Audio Frame Timing

- Opus frames are typically **20ms** of audio
- Send frames at the same rate as their duration
- Set `isTerminator: true` on the last frame to signal end of transmission
