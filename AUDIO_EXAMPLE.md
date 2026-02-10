# Full Audio Support Example

This fork adds full audio data extraction and sending capabilities to `@tf2pickup-org/mumble-client`.

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
  // Access the socket to subscribe to full audio packets
  const socket = client.socket;
  
  socket.fullAudioPacket.subscribe((packet: FullAudioPacket) => {
    console.log(`Audio from user ${packet.source}`);
    console.log(`Codec: ${AudioCodec[packet.codec]}`);
    console.log(`Sequence: ${packet.sequence}`);
    console.log(`Audio data length: ${packet.audioData.length} bytes`);
    console.log(`Is final packet: ${packet.hasTerminator}`);
    
    // Process the encoded audio data
    // For Opus codec, packet.audioData contains raw Opus frames
    // You can decode with an Opus decoder or pass to TTS/STT
    processAudio(packet.audioData, packet.codec);
  });
}

async function processAudio(encodedAudio: Buffer, codec: AudioCodec) {
  // Example: Send to Whisper STT (if it accepts Opus)
  // or decode to PCM first using an Opus decoder
  
  if (codec === AudioCodec.Opus) {
    // Send to your audio processing pipeline
    const text = await transcribeOpus(encodedAudio);
    console.log('Transcribed:', text);
  }
}
```

## Sending Audio

```typescript
import { AudioCodec } from '@tf2pickup-org/mumble-client';

// Assume you have Opus-encoded audio data
const opusFrames: Buffer[] = await generateOpusAudio();

for (let i = 0; i < opusFrames.length; i++) {
  const isLast = i === opusFrames.length - 1;
  
  await socket.sendAudio(
    opusFrames[i],
    AudioCodec.Opus,
    0,        // target: 0 = normal talking
    isLast    // terminator: true for last packet
  );
  
  // Add small delay between frames (e.g., 20ms for 20ms Opus frames)
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

  // Listen for incoming voice
  socket.fullAudioPacket.subscribe(async (packet: FullAudioPacket) => {
    if (packet.codec !== AudioCodec.Opus) {
      console.warn('Only Opus codec supported');
      return;
    }

    // Accumulate audio until terminator
    if (packet.hasTerminator) {
      // Complete speech received, process it
      const text = await transcribeAudio(packet.audioData);
      console.log('User said:', text);

      // Generate response
      const responseText = await generateResponse(text);
      console.log('Bot responds:', responseText);

      // Convert response to speech
      const audioFrames = await textToSpeech(responseText);

      // Send audio back
      for (let i = 0; i < audioFrames.length; i++) {
        await socket.sendAudio(
          audioFrames[i],
          AudioCodec.Opus,
          0,
          i === audioFrames.length - 1
        );
        await sleep(20);
      }
    }
  });

  console.log('Voice chat bot ready!');
}

// Integration stubs
async function transcribeAudio(opus: Buffer): Promise<string> {
  // Decode Opus to PCM, then send to Whisper
  // or use a service that accepts Opus directly
  return 'transcribed text';
}

async function generateResponse(text: string): Promise<string> {
  // Call your LLM/agent
  return 'bot response';
}

async function textToSpeech(text: string): Promise<Buffer[]> {
  // Generate Opus frames from TTS (e.g., Kokoro)
  // Return array of 20ms Opus frames
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
- Send frames at the same rate (20ms intervals)
- Set `hasTerminator=true` on the last frame to signal end of transmission

## Integration with OpenClaw

For OpenClaw voice chat extension:

```typescript
// In OpenClaw extension
socket.fullAudioPacket.subscribe(async (packet) => {
  // Convert Opus to WAV for Whisper STT
  const pcm = await decodeOpus(packet.audioData);
  const wav = pcmToWav(pcm, 48000, 1, 16);
  
  const text = await whisperTranscribe(wav);
  
  // Send to agent
  const response = await agentRespond(text);
  
  // Convert response to Opus for Mumble
  const opusFrames = await kokoroTTS(response); // if Kokoro outputs Opus
  
  for (const frame of opusFrames) {
    await socket.sendAudio(frame, AudioCodec.Opus);
  }
});
```
