import { PermissionDenied } from '@proto/Mumble';

export class PermissionDeniedError extends Error {
  constructor(public readonly permissionDenied: PermissionDenied) {
    let reason = 'permission denied';
    if (permissionDenied.reason) {
      reason = permissionDenied.reason;
    }
    super(reason);
  }
}
