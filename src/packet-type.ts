import type { MessageType } from '@tf2pickup-org/mumble-protocol';

export interface PacketType {
  /**
   * Packet type number, as described in the protocol specification.
   * https://buildmedia.readthedocs.org/media/pdf/mumble-protocol/latest/mumble-protocol.pdf
   */
  type: number;

  /**
   * Packet type name, as represented by the protocol implementation.
   * For example, Authentication packet type could be named "MumbleProto.Authenticate".
   *
   * Usage:
   * ```ts
   * socket.on('packet', packet => {
   *   const channelState = payloadOf(packet, ChannelState);
   *   if (channelState) console.log(channelState);
   * });
   * ```
   */
  typeName: string;

  /**
   * The parsed packet payload.
   */
  payload: unknown;
}

/**
 * Returns the packet's payload if the packet is of the given type.
 */
export function payloadOf<T extends object>(
  packet: PacketType,
  type: MessageType<T>,
): T | undefined {
  return packet.typeName === type.typeName ? (packet.payload as T) : undefined;
}
