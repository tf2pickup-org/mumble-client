import { ConnectionOptions } from 'tls';

export interface ClientOptions {
  host: string;
  port: number;
  username: string;
  tlsOptions?: ConnectionOptions;
  pingInterval?: number;
}
