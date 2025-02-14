import { readVarint } from './read-varint';

describe('readVarint', () => {
  it('should read 7-bit positive number', () => {
    expect(readVarint(Buffer.from([0x5]))).toStrictEqual({
      value: 0x5,
      length: 1,
    });
  });

  it('should read 14-bit positive number', () => {
    expect(readVarint(Buffer.from([0b10000111, 0b00101000]))).toStrictEqual({
      value: 1832,
      length: 2,
    });
  });

  it('should read 21-bit positive number', () => {
    expect(
      readVarint(Buffer.from([0b11011100, 0b00101011, 0b11100110])),
    ).toStrictEqual({
      value: 1846246,
      length: 3,
    });
  });

  it('should read 28-bit positive number', () => {
    expect(
      readVarint(Buffer.from([0b11100100, 0b11101110, 0b11100011, 0b01010000])),
    ).toStrictEqual({
      value: 82764624,
      length: 4,
    });
  });

  it('should read 32-bit positive number', () => {
    expect(
      readVarint(
        Buffer.from([
          0b11110000, 0b00110001, 0b01010100, 0b11100001, 0b00100011,
        ]),
      ),
    ).toStrictEqual({ value: 827646243, length: 5 });
  });
});
