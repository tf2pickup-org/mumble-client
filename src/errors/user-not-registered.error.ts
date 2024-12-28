export class UserNotRegisteredError extends Error {
  constructor() {
    super(`user is not registered`);
  }
}
