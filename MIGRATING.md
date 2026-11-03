# Migrating from 0.15 to 1.0

1.0 requires **Node.js 22 or newer**. The library has always been Node-only; now `engines` says so.

## `client.user` is gone

Use `client.self`, which has been available since 0.x.

```diff
- client.user.moveToChannel(lobby.id);
+ client.self.moveToChannel(lobby);
```

`moveToChannel()` now accepts a `Channel` as well as a channel ID.

## No more rxjs

`rxjs` is no longer a dependency. `client.socket.packet`, `audioPacket` and `fullAudioPacket` were Observables; the socket is now an event emitter.

For incoming audio, listen on the client instead. The listener stays attached across reconnects:

```diff
- client.socket.fullAudioPacket.subscribe(packet => handle(packet));
+ client.on('audio', packet => handle(packet));
```

The `audio` event carries normal talking (target 0) from other users. For anything else, listen on the socket directly:

```diff
- client.socket.packet
-   .pipe(filter(packet => packet.$type === TextMessage))
-   .subscribe(packet => handle(packet));
+ client.socket?.on('packet', packet => {
+   const message = payloadOf(packet, TextMessage);
+   if (message) handle(message);
+ });
```

`payloadOf` is exported from `@tf2pickup-org/mumble-client`. Text messages now have their own `textMessage` event, too.

To send audio, call `client.sendAudio()` instead of `client.socket.sendAudio()`; it takes the same options.

## User and channel state is readonly

`User` and `Channel` fields mirror the server's state. Assigning to them used to compile but changed nothing on the server; now it is a type error. Use the methods instead:

| Before                 | After                                    |
| ---------------------- | ---------------------------------------- |
| `user.channelId = id`  | `await user.moveToChannel(channel)`      |
| `user.selfMute = true` | `await client.self.setSelfMute(true)`    |
| `user.selfDeaf = true` | `await client.self.setSelfDeaf(true)`    |
| `user.name = 'x'`      | `await user.rename('x')` (registered)    |
| `user.userId = id`     | `await user.register()` / `deregister()` |

`Channel.name`, `parent` and `temporary` are readonly too, and so are `client.channels` and `client.users`. There is no channel rename yet.

When a user is deregistered, the `userUpdate` event now reports `changes.userId.currentValue` as `undefined` instead of `0xffffffff`.

## ACLs and registered users use the library's own types

`Channel.fetchAcl()`, `Channel.saveAcl()` and `Client.fetchRegisteredUsers()` used to expose protocol types, so a protocol update could break your code. They now use `Acl`, `AclGroup`, `AclEntry` and `RegisteredUser`.

```diff
  const acl = await channel.fetchAcl();
- acl.acls.push(entry);
+ acl.entries.push(entry);
  await channel.saveAcl(acl);
```

- ACL entries are in `entries` (it was `acls`).
- The protocol-only `channelId` and `query` fields are gone.
- `saveAcl()` takes an `Acl`, which needs both `groups` and `entries`. Pass back what `fetchAcl()` returned.

## `client.command()` is internal

It is no longer in the published types, and neither is `CommandProps`. If you used it for something the library doesn't cover, please [open an issue](https://github.com/tf2pickup-org/mumble-client/issues).
