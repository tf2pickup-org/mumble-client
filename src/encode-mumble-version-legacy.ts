/**
 * @internal
 */
export const encodeMumbleVersionLegacy = (version: {
  major: number;
  minor: number;
  patch: number;
}) => {
  // https://github.com/mumble-voip/mumble/issues/5827
  const major = Math.min(version.major, 255);
  const minor = Math.min(version.minor, 255);
  const patch = Math.min(version.patch, 255);
  return ((major & 0xffff) << 16) | ((minor & 0xff) << 8) | (patch & 0xff);
};
