import { Reject } from '@proto/Mumble';

export class ConnectionRejectedError extends Error {
  constructor(public readonly reject: Reject) {
    super(reject.reason);
  }
}
