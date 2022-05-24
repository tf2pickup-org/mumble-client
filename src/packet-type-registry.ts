import {
  ACL,
  Authenticate,
  BanList,
  ChannelRemove,
  ChannelState,
  CodecVersion,
  ContextAction,
  ContextActionModify,
  CryptSetup,
  PermissionDenied,
  PermissionQuery,
  Ping,
  QueryUsers,
  Reject,
  RequestBlob,
  ServerConfig,
  ServerSync,
  SuggestConfig,
  TextMessage,
  UDPTunnel,
  UserList,
  UserRemove,
  UserState,
  UserStats,
  Version,
  VoiceTarget,
} from '@tf2pickup-org/mumble-protocol';
import { MessageType } from '@protobuf-ts/runtime';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMessage = MessageType<any>;

// https://buildmedia.readthedocs.org/media/pdf/mumble-protocol/latest/mumble-protocol.pdf
const packetForPacketType = new Map<number, AnyMessage>([
  [0, Version],
  [1, UDPTunnel],
  [2, Authenticate],
  [3, Ping],
  [4, Reject],
  [5, ServerSync],
  [6, ChannelRemove],
  [7, ChannelState],
  [8, UserRemove],
  [9, UserState],
  [10, BanList],
  [11, TextMessage],
  [12, PermissionDenied],
  [13, ACL],
  [14, QueryUsers],
  [15, CryptSetup],
  [16, ContextActionModify],
  [17, ContextAction],
  [18, UserList],
  [19, VoiceTarget],
  [20, PermissionQuery],
  [21, CodecVersion],
  [22, UserStats],
  [23, RequestBlob],
  [24, ServerConfig],
  [25, SuggestConfig],
]);

const packetTypeForPacket = new Map<AnyMessage, number>();
for (const [key, value] of packetForPacketType.entries()) {
  packetTypeForPacket.set(value, key);
}

/**
 * @internal
 */
export const packetForType = (type: number) => {
  return packetForPacketType.get(type);
};

/**
 * @internal
 */
export const packetType = (packet: AnyMessage) => {
  return packetTypeForPacket.get(packet);
};
