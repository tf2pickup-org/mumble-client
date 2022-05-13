export class NoSuchChannelError extends Error {
  constructor(public readonly channelIdOrName: number | string) {
    super(
      `no such channel (${
        typeof channelIdOrName === 'number' ? 'id' : 'name'
      }=${channelIdOrName})`,
    );
  }
}
