import { ConnectionOptions } from 'tls';

export interface ClientOptions extends ConnectionOptions {
  host: string;
  port: number;
  username: string;
  pingInterval?: number;
}
