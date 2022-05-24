import { Reject } from '@tf2pickup-org/mumble-protocol';

export class ConnectionRejectedError extends Error {
  constructor(public readonly reject: Reject) {
    super(reject.reason);
  }
}
