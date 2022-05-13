export class InsufficientPermissionsError extends Error {
  constructor() {
    super('insufficient permissions');
  }
}
