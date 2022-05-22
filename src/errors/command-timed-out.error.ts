export class CommandTimedOutError extends Error {
  constructor(commandName: string) {
    super(`command ${commandName} has timed out`);
  }
}
