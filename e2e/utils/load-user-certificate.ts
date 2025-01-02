import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function loadUserCertificate() {
  const key = (
    await readFile(resolve(import.meta.dirname, '..', 'tester-key.pem'))
  ).toString();
  const cert = (
    await readFile(resolve(import.meta.dirname, '..', 'tester-cert.pem'))
  ).toString();
  return { key, cert };
}
