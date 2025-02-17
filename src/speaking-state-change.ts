import type { User } from './user';

export interface SpeakingStateChange {
  user: User;
  speaking: boolean;
}
