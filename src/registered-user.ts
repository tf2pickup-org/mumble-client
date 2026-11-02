/**
 * A user registered with the server; they do not have to be online.
 */
export interface RegisteredUser {
  userId: number;
  name?: string;
  /**
   * When the user was last seen online, as reported by the server.
   */
  lastSeen?: string;
  /**
   * Id of the channel the user was last in.
   */
  lastChannel?: number;
}
