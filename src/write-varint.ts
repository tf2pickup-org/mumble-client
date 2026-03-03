// https://github.com/mumble-voip/mumble/blob/master/docs/dev/network-protocol/voice_data.md#variable-length-integer-encoding
export function writeVarint(value: number): Buffer {
  if (value < 0) {
    // Negative numbers: prefix with 0xF8 then recurse
    const positive = writeVarint(-value);
    return Buffer.concat([Buffer.from([0xf8]), positive]);
  }

  if (value < 0x80) {
    // 7-bit positive number
    return Buffer.from([value]);
  }

  if (value < 0x4000) {
    // 14-bit positive number
    const buf = Buffer.alloc(2);
    buf.writeUint16BE(value | 0x8000);
    return buf;
  }

  if (value < 0x200000) {
    // 21-bit positive number
    const buf = Buffer.alloc(3);
    buf.writeUint16BE((value >> 8) | 0xc000, 0);
    buf.writeUint8(value & 0xff, 2);
    return buf;
  }

  if (value < 0x10000000) {
    // 28-bit positive number
    const buf = Buffer.alloc(4);
    buf.writeUint32BE((value | 0xe0000000) >>> 0);
    return buf;
  }

  // 32-bit positive number
  const buf = Buffer.alloc(5);
  buf.writeUint8(0xf0, 0);
  buf.writeUint32BE(value, 1);
  return buf;
}
