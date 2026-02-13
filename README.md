<h1 align="center">mumble-client</h1>

<p align="center">A simple mumble client for managing mumble servers</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@tf2pickup-org/mumble-client">
    <img src="https://img.shields.io/npm/v/@tf2pickup-org/mumble-client" alt="Latest release">
  </a>
  <a href="https://github.com/tf2pickup-org/mumble-client/actions?query=workflow%3Atest">
    <img src="https://github.com/tf2pickup-org/mumble-client/actions/workflows/test.yml/badge.svg" alt="Test status">
  </a>
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT license">
  </a>
</p>

## Features

- Connect to any Mumble server over TLS
- Manage channels: create, remove, link/unlink, fetch ACLs
- Manage users: move, mute/deafen, register/deregister, rename
- Query channel permissions
- Event-driven architecture with full TypeScript support
- Automatic keep-alive pinging

## Installation

```bash
npm i @tf2pickup-org/mumble-client
```

## Quick start

```typescript
import { Client } from '@tf2pickup-org/mumble-client';

const client = new Client({
  host: 'mumble.example.com',
  port: 64738,
  username: 'my-bot',
  rejectUnauthorized: false,
});

await client.connect();
console.log(`Connected! Welcome message: ${client.welcomeText}`);
console.log(`Logged in as ${client.self?.name}`);

// ... do work ...

client.disconnect();
```

## Examples

### Connect with a password and access tokens

```typescript
const client = new Client({
  host: 'mumble.example.com',
  port: 64738,
  username: 'my-bot',
  password: 'server-password',
  tokens: ['token-for-acl-group'],
  clientName: 'my-awesome-bot',
  rejectUnauthorized: false,
});

await client.connect();
```

### List all channels

```typescript
import { type Channel } from '@tf2pickup-org/mumble-client';

function printChannel(channel: Channel, level = 0) {
  if (channel.name) {
    console.log(' '.repeat(level * 2) + channel.name);
  }

  for (const subChannel of channel.subChannels) {
    printChannel(subChannel, level + 1);
  }
}

printChannel(client.channels.root);
```

### Find a channel

```typescript
// by name
const lobby = client.channels.byName('Lobby');

// by path (from root)
const redTeam = client.channels.byPath('Match 1', 'RED');

// by custom predicate
const tempChannels = client.channels.findAll(ch => ch.temporary);
```

### Create and manage channels

```typescript
const root = client.channels.root;

// create a sub-channel under root
const matchChannel = await root.createSubChannel('Match 1');

// create team channels
const red = await matchChannel.createSubChannel('RED');
const blu = await matchChannel.createSubChannel('BLU');

// link two channels together
await red.link(blu);

// unlink them
await red.unlink(blu);

// remove a channel (and all its sub-channels)
await matchChannel.remove();
```

### Move users between channels

```typescript
const user = client.users.byName('PlayerOne');
const targetChannel = client.channels.byName('RED');

if (user && targetChannel) {
  await user.moveToChannel(targetChannel.id);
}
```

### Mute/deafen yourself

```typescript
// self-mute
await client.self.setSelfMute(true);

// self-deafen
await client.self.setSelfDeaf(true);

// unmute
await client.self.setSelfMute(false);
```

### Register and manage users

```typescript
// register the currently logged-in user
await client.self.register();

// fetch all registered users from the server
const registeredUsers = await client.fetchRegisteredUsers();
for (const user of registeredUsers) {
  console.log(`${user.userId}: ${user.name}`);
}

// rename a registered user (does not need to be online)
await client.renameRegisteredUser(userId, 'NewName');

// deregister a user (does not need to be online)
await client.deregisterUser(userId);
```

### Check channel permissions

```typescript
const channel = client.channels.byName('Lobby');
if (channel) {
  const permissions = await channel.getPermissions();
  console.log('Can join:', permissions.canJoinChannel);
  console.log('Can create sub-channels:', permissions.canCreateChannel);
  console.log('Can remove:', permissions.canRemoveChannel);
  console.log('Can link:', permissions.canLinkChannel);
}
```

### Listen to events

```typescript
// user connected
client.on('userCreate', user => {
  console.log(`${user.name} connected`);
});

// user disconnected
client.on('userRemove', user => {
  console.log(`${user.name} disconnected`);
});

// user state changed (e.g. moved channel, muted, etc.)
client.on('userUpdate', (user, changes) => {
  if (changes.channelId) {
    const from = client.channels.byId(changes.channelId.previousValue);
    const to = client.channels.byId(changes.channelId.currentValue);
    console.log(`${user.name} moved from ${from?.name} to ${to?.name}`);
  }
});

// channel created
client.on('channelCreate', channel => {
  console.log(`Channel created: ${channel.name}`);
});

// channel removed
client.on('channelRemove', channel => {
  console.log(`Channel removed: ${channel.name}`);
});

// speaking state changes
client.on('speakingStateChange', ({ user, speaking }) => {
  console.log(`${user.name} ${speaking ? 'started' : 'stopped'} speaking`);
});

// disconnected from server
client.on('disconnect', payload => {
  console.log(`Disconnected: ${payload?.reason ?? 'unknown reason'}`);
});
```

### Error handling

```typescript
import {
  Client,
  ConnectionRejectedError,
  PermissionDeniedError,
  NoSuchChannelError,
} from '@tf2pickup-org/mumble-client';

try {
  await client.connect();
} catch (error) {
  if (error instanceof ConnectionRejectedError) {
    console.error('Connection rejected by server');
  }
}

try {
  await client.channels.root.createSubChannel('test');
} catch (error) {
  if (error instanceof PermissionDeniedError) {
    console.error('Insufficient permissions to create channel');
  }
}
```

## API overview

### `Client`

The main entry point. Connects to the server and provides access to channels, users, and events.

| Property / Method | Description |
|---|---|
| `channels` | `ChannelManager` instance for finding channels |
| `users` | `UserManager` instance for finding users |
| `self` | The currently logged-in `User` |
| `welcomeText` | Server welcome message |
| `serverVersion` | Server version info |
| `connect()` | Connect to the Mumble server |
| `disconnect()` | Disconnect from the server |
| `isConnected()` | Returns `true` if connected |
| `fetchRegisteredUsers()` | Fetch all registered users |
| `deregisterUser(userId)` | Deregister a user by ID |
| `renameRegisteredUser(userId, name)` | Rename a registered user |

### `ChannelManager`

| Method | Description |
|---|---|
| `root` | The root channel |
| `byId(channelId)` | Find channel by ID |
| `byName(name)` | Find channel by name |
| `byPath(...path)` | Find channel by path segments |
| `find(predicate)` | Find first matching channel |
| `findAll(predicate)` | Find all matching channels |

### `Channel`

| Property / Method | Description |
|---|---|
| `id` | Channel ID |
| `name` | Channel name |
| `temporary` | Whether the channel is temporary |
| `users` | Users currently in this channel |
| `subChannels` | Direct sub-channels |
| `linkedChannels` | Linked channels |
| `createSubChannel(name)` | Create a sub-channel |
| `remove()` | Remove this channel |
| `link(channel)` | Link with another channel |
| `unlink(channel)` | Unlink from another channel |
| `getPermissions()` | Fetch permissions for this channel |
| `fetchAcl()` | Fetch the channel ACL |
| `saveAcl(acl)` | Save the channel ACL |

### `UserManager`

| Method | Description |
|---|---|
| `bySession(session)` | Find user by session ID |
| `byName(name)` | Find user by name |
| `findAll(predicate)` | Find all matching users |

### `User`

| Property / Method | Description |
|---|---|
| `session` | Session ID |
| `name` | Username |
| `channel` | Current channel |
| `channelId` | Current channel ID |
| `isRegistered` | Whether the user is registered |
| `mute` / `deaf` / `suppress` | Server mute/deaf/suppress state |
| `selfMute` / `selfDeaf` | Self-mute/deaf state |
| `moveToChannel(channelId)` | Move user to a channel |
| `setSelfMute(mute)` | Set self-mute state |
| `setSelfDeaf(deaf)` | Set self-deaf state |
| `register()` | Register the user |
| `deregister()` | Deregister the user |
| `rename(name)` | Rename a registered user |

### `Permissions`

| Property / Method | Description |
|---|---|
| `canJoinChannel` | Can join/enter the channel |
| `canCreateChannel` | Can create sub-channels |
| `canRemoveChannel` | Can remove channels |
| `canLinkChannel` | Can link channels |
| `canSelfRegister` | Can self-register |
| `canRegister` | Can register other users |

### Events

| Event | Payload | Description |
|---|---|---|
| `connect` | — | Client connected successfully |
| `disconnect` | `{ reason?: string }` | Client disconnected |
| `channelCreate` | `Channel` | A channel was created |
| `channelUpdate` | `Channel, ChannelChanges` | A channel was updated |
| `channelRemove` | `Channel` | A channel was removed |
| `userCreate` | `User` | A user connected |
| `userUpdate` | `User, UserChanges` | A user's state changed |
| `userRemove` | `User` | A user disconnected |
| `speakingStateChange` | `{ user: User, speaking: boolean }` | A user started/stopped speaking |

### `ClientOptions`

Extends Node.js `tls.ConnectionOptions`.

| Option | Type | Default | Description |
|---|---|---|---|
| `host` | `string` | — | Server hostname |
| `port` | `number` | `64738` | Server port |
| `username` | `string` | — | Username for authentication |
| `password` | `string?` | — | Server or user password |
| `tokens` | `string[]?` | `[]` | Access tokens for server ACL groups |
| `clientName` | `string?` | `'simple mumble bot'` | Client name sent to the server |
| `pingInterval` | `number?` | `10000` | Keep-alive ping interval in ms |

Since `ClientOptions` extends `tls.ConnectionOptions`, you can pass any TLS option such as `rejectUnauthorized`, `cert`, `key`, `ca`, etc.

## License

[MIT](https://opensource.org/licenses/MIT)
