/**
 * @internal
 */
export const encodeMumbleVersion = (version: {
  major: number;
  minor: number;
  patch: number;
}) =>
  BigInt(
    ((version.major & 0xffff) << 16) |
      ((version.minor & 0xff) << 8) |
      (version.patch & 0xff),
  );
