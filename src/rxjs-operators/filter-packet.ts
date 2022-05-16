import { MessageType } from '@protobuf-ts/runtime';
import { filter, map, Observable } from 'rxjs';

export function filterPacket<T extends object>(
  messageType: MessageType<T>,
): (source: Observable<any>) => Observable<T> {
  return source =>
    source.pipe(
      filter(packet => messageType.is(packet)),
      map(packet => packet as T),
    );
}
