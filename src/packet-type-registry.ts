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
} from '@proto/Mumble';
import { MessageType } from '@protobuf-ts/runtime';

const packetTypeForName = new Map<MessageType<any>, number>([
  [Version, 0],
  [UDPTunnel, 1],
  [Authenticate, 2],
  [Ping, 3],
  [Reject, 4],
  [ServerSync, 5],
  [ChannelRemove, 6],
  [ChannelState, 7],
  [UserRemove, 8],
  [UserState, 9],
  [BanList, 10],
  [TextMessage, 11],
  [PermissionDenied, 12],
  [ACL, 13],
  [QueryUsers, 14],
  [CryptSetup, 15],
  [ContextActionModify, 16],
  [ContextAction, 17],
  [UserList, 18],
  [VoiceTarget, 19],
  [PermissionQuery, 20],
  [CodecVersion, 21],
  [UserStats, 22],
  [RequestBlob, 23],
  [ServerConfig, 24],
  [SuggestConfig, 25],
]);

const packetNameForType = new Map<number, MessageType<any>>();
for (const [key, value] of packetTypeForName.entries()) {
  packetNameForType.set(value, key);
}

export const packetForType = (type: number) => {
  return packetNameForType.get(type);
};

export const packetType = (packet: MessageType<any>) => {
  return packetTypeForName.get(packet);
};
