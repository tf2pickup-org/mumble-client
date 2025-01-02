import { createCertificate as createCertificateCb } from 'pem';

export const createCertificate = () =>
  new Promise<{
    key: string;
    cert: Buffer;
  }>((resolve, reject) => {
    createCertificateCb(
      {
        days: 1,
        selfSigned: true,
      },
      (error, result) => {
        if (error) {
          reject(new Error(error));
        } else {
          resolve({ key: result.clientKey, cert: result.certificate });
        }
      },
    );
  });
