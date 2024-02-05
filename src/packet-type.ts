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
   * socket.packet.pipe(
   *   filter(packet => packet.typeName === SyncChannel.typeName),
   * ).subscribe(syncChannel => console.log(syncChannel));
   * ```
   */
  typeName: string;

  /**
   * The parsed packet payload.
   */
  payload: unknown;
}
