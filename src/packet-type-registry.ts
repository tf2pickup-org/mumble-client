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

const packetTypeForName = new Map<string, number>([
  [Version.$type, 0],
  [UDPTunnel.$type, 1],
  [Authenticate.$type, 2],
  [Ping.$type, 3],
  [Reject.$type, 4],
  [ServerSync.$type, 5],
  [ChannelRemove.$type, 6],
  [ChannelState.$type, 7],
  [UserRemove.$type, 8],
  [UserState.$type, 9],
  [BanList.$type, 10],
  [TextMessage.$type, 11],
  [PermissionDenied.$type, 12],
  [ACL.$type, 13],
  [QueryUsers.$type, 14],
  [CryptSetup.$type, 15],
  [ContextActionModify.$type, 16],
  [ContextAction.$type, 17],
  [UserList.$type, 18],
  [VoiceTarget.$type, 19],
  [PermissionQuery.$type, 20],
  [CodecVersion.$type, 21],
  [UserStats.$type, 22],
  [RequestBlob.$type, 23],
  [ServerConfig.$type, 24],
  [SuggestConfig.$type, 25],
]);

const packetNameForType = new Map<number, string>();
for (const [key, value] of packetTypeForName.entries()) {
  packetNameForType.set(value, key);
}

export const packetName = (type: number) => {
  return packetNameForType.get(type);
};

export const packetType = (name: string) => {
  return packetTypeForName.get(name);
};
