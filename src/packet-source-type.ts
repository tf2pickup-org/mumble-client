export type PacketSourceType = {
  /**
   * Packet type number, as described in the protocol specification.
   * https://buildmedia.readthedocs.org/media/pdf/mumble-protocol/latest/mumble-protocol.pdf
   */
  type: number;

  typeName: string;

  payload: unknown;
};
