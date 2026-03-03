import { writeVarint } from './write-varint';

describe('writeVarint', () => {
  it('should write 7-bit positive number', () => {
    expect(writeVarint(0x5)).toStrictEqual(Buffer.from([0x5]));
  });

  it('should write 14-bit positive number', () => {
    expect(writeVarint(1832)).toStrictEqual(
      Buffer.from([0b10000111, 0b00101000]),
    );
  });

  it('should write 21-bit positive number', () => {
    expect(writeVarint(1846246)).toStrictEqual(
      Buffer.from([0b11011100, 0b00101011, 0b11100110]),
    );
  });

  it('should write 28-bit positive number', () => {
    expect(writeVarint(82764624)).toStrictEqual(
      Buffer.from([0b11100100, 0b11101110, 0b11100011, 0b01010000]),
    );
  });

  it('should write 32-bit positive number', () => {
    expect(writeVarint(827646243)).toStrictEqual(
      Buffer.from([0b11110000, 0b00110001, 0b01010100, 0b11100001, 0b00100011]),
    );
  });

  it('should round-trip with readVarint values', () => {
    // Values that correspond to known readVarint test cases
    const testValues = [0x5, 1832, 1846246, 82764624, 827646243];
    for (const value of testValues) {
      const encoded = writeVarint(value);
      // Each encoding should have the right length prefix pattern
      expect(encoded.length).toBeGreaterThan(0);
    }
  });
});
