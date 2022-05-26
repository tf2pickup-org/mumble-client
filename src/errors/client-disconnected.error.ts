export class ClientDisconnectedError extends Error {
  constructor() {
    super('client disconnected');
  }
}
