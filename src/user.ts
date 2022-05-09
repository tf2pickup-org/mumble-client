import { filter, map, takeWhile } from 'rxjs';
import { UserState } from '@proto/Mumble';
import { MumbleClient } from './mumble-client';
import { isEmpty } from 'lodash';

export class User {
  readonly session: number;
  name: string;
  channelId: number;
  selfMute: boolean;
  selfDeaf: boolean;

  constructor(private readonly client: MumbleClient, userState: UserState) {
    this.session = userState.session;
    this.name = userState.name;
    this.channelId = userState.channelId;
    this.selfMute = userState.selfMute;
    this.selfDeaf = userState.selfDeaf;
  }

  sync(userState: UserState) {
    if (!isEmpty(userState.name)) {
      this.name = userState.name;
    }

    this.channelId = userState.channelId;
    this.selfMute = userState.mute;
    this.selfDeaf = userState.deaf;
  }

  async moveToChannel(channelId: number): Promise<User> {
    return await this.client.moveUserToChannel(this.session, channelId);
  }

  setSelfMute(selfMute: boolean): Promise<this> {
    return new Promise(resolve => {
      this.client.socket?.packet
        .pipe(
          filter(message => message.$type === UserState.$type),
          map(message => message as UserState),
          filter(userState => userState.session === this.session),
          takeWhile(userState => userState.selfMute === selfMute, true),
        )
        .subscribe(() => resolve(this));

      this.client.socket?.send(
        UserState.fromPartial({ session: this.session, selfMute }),
      );
    });
  }

  setSelfDeaf(selfDeaf: boolean): Promise<void> {
    return new Promise(resolve => {
      this.client.socket?.packet
        .pipe(
          filter(message => message.$type === UserState.$type),
          map(message => message as UserState),
          filter(userState => userState.session === this.session),
          takeWhile(userState => userState.selfDeaf === selfDeaf, true),
        )
        .subscribe(() => resolve());

      this.client.socket?.send(
        UserState.fromPartial({ session: this.session, selfDeaf }),
      );
    });
  }
}
