# Mumble client

A Node.js client for Mumble voice servers, used by tf2pickup.org bots to manage channels and users.

## Language

**Connection**:
One TLS link to a Mumble server, from opening the socket to its teardown. A Client has at most one live Connection; connecting again replaces it.
_Avoid_: socket (the transport only), session

**Session**:
The numeric id the server assigns to each connected user, including the Client's own user.
_Avoid_: connection, user id

**User id**:
The id of a registered user, stable across Connections; unregistered users have none.
_Avoid_: session

**Handshake**:
The opening exchange of a Connection, ending when the server has sent its sync, config and version, or rejected the Client.
_Avoid_: login, auth

**Teardown**:
The end of a Connection, whether the server removed the Client, the socket closed, or the Client disconnected or reconnected.
_Avoid_: close (the transport event)
