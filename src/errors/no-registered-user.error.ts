export class NoRegisteredUserError extends Error {
  constructor() {
    super('No registered user with the matching userId found');
  }
}
