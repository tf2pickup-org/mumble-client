interface PlatformDescription {
  platform: string;
  version?: string;
}

export const discoverPlatform = async (): Promise<PlatformDescription> => {
  if (typeof process !== 'undefined' && process.release.name === 'node') {
    // Node.JS
    const { platform, release } = await import('os');
    return { platform: platform(), version: release() };
  } else if (typeof navigator !== 'undefined') {
    // browser
    return { platform: navigator.userAgent };
  } else {
    return { platform: 'unknown' };
  }
};
