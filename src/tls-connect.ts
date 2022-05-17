import tls from 'tls';

/**
 * @internal
 */
export const tlsConnect = async (
  host: string,
  port: number,
  tlsOptions?: tls.ConnectionOptions,
): Promise<tls.TLSSocket> =>
  new Promise((resolve, reject) => {
    const socket = tls.connect(port, host, tlsOptions);
    socket.on('error', reject);
    socket.on('secureConnect', () => {
      if (socket.authorized || !tlsOptions?.rejectUnauthorized) {
        resolve(socket);
      } else {
        reject(socket.authorizationError);
      }
    });
  });
