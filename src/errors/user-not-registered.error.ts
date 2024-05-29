export class UserNotRegisteredError extends Error {
  constructor(public readonly userName: string | undefined) {
    super(`User was not registered (name=${userName})`);
  }
}
