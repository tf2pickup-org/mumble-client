export function readVarint(buffer: Buffer): {
  value: number | bigint;
  length: number;
} {
  if (buffer.length === 0) {
    throw new Error(`buffer is empty`);
  }

  // https://github.com/mumble-voip/mumble/blob/master/docs/dev/network-protocol/voice_data.md#variable-length-integer-encoding
  switch (true) {
    case (0b10000000 & buffer[0]!) === 0:
      // 7-bit positive number
      return { value: buffer.readUInt8(0), length: 1 };

    case (0b11000000 & buffer[0]!) === 0b10000000:
      // 14-bit positive number
      return { value: buffer.readUint16BE(0) & 0x3fff, length: 2 };

    case (0b11100000 & buffer[0]!) === 0b11000000:
      // 21-bit positive number
      return {
        value: ((buffer.readUint16BE(0) & 0x1fff) << 8) | buffer.readUint8(2),
        length: 3,
      };

    case (0b11110000 & buffer[0]!) === 0b11100000:
      // 28-bit positive number
      return {
        value: buffer.readUint32BE(0) & 0x1fffffff,
        length: 4,
      };

    case (0b11111100 & buffer[0]!) === 0b11110000:
      // 32-bit positive number
      return {
        value: buffer.readUint32BE(1),
        length: 5,
      };

    case (0b11111100 & buffer[0]!) === 0b11110100:
      // 64-bit number
      return {
        value: buffer.readBigInt64BE(1),
        length: 9,
      };

    case (0b11111100 & buffer[0]!) === 0b11111000: {
      // Negative recursive varint
      const { value, length } = readVarint(buffer.subarray(1));
      return {
        value: -value,
        length: length + 1,
      };
    }

    case (0b11111100 & buffer[0]!) === 0b11111100:
      // Byte-inverted negative two bit number (~xx)
      return {
        value: ~(buffer.readUint8(0) & 0x00000011),
        length: 1,
      };

    default:
      throw new Error(`varint not supported`);
  }
}
