import { ConnectionOptions } from 'tls';

export interface ClientOptions extends ConnectionOptions {
  /**
   * The host URL.
   */
  host: string;

  /**
   * The port number.
   * Default: 64738
   */
  port: number;

  /**
   * Username to use when logging in to the Mumble server.
   */
  username: string;

  /**
   * Client name.
   * Default: 'simple mumble bot'
   */
  clientName?: string;

  /**
   * The interval the bot will send pings to the server (in milliseconds).
   * It has to be less than 30000 (30 seconds), otherwise the server will kick the client.
   * Default: 10000 (10 seconds)
   */
  pingInterval?: number;
}
