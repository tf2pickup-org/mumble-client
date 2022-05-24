import { PermissionDenied, PermissionDenied_DenyType } from '@tf2pickup-org/mumble-protocol';

const toString = (permissionDenied: PermissionDenied): string => {
  switch (permissionDenied.type) {
    case PermissionDenied_DenyType.Text:
      return permissionDenied.reason ?? 'unknown reason';

    case PermissionDenied_DenyType.Permission:
      return 'permission denied';

    case PermissionDenied_DenyType.SuperUser:
      return 'cannot modify SuperUser';

    case PermissionDenied_DenyType.ChannelName:
      return 'invalid channel name';

    case PermissionDenied_DenyType.TextTooLong:
      return 'text message too long';

    case PermissionDenied_DenyType.H9K:
      return 'the flux capacitor was spelled wrong';

    case PermissionDenied_DenyType.TemporaryChannel:
      return 'operation not permitted in temporary channel';

    case PermissionDenied_DenyType.MissingCertificate:
      return 'operation requires certificate';

    case PermissionDenied_DenyType.UserName:
      return 'invalid username';

    case PermissionDenied_DenyType.ChannelFull:
      return 'channel is full';

    case PermissionDenied_DenyType.NestingLimit:
      return 'channels are nested too deeply';

    case PermissionDenied_DenyType.ChannelCountLimit:
      return 'maximum channel count reached';

    case PermissionDenied_DenyType.ChannelListenerLimit:
      return 'amount of listener objects for this channel has been reached';

    case PermissionDenied_DenyType.UserListenerLimit:
      return 'amount of listener proxies for the user has been reached';

    default:
      return 'unknown reason';
  }
};

export class PermissionDeniedError extends Error {
  constructor(public readonly permissionDenied: PermissionDenied) {
    super(`permission denied (${toString(permissionDenied)})`);
  }
}
