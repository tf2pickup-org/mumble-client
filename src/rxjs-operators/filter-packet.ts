import { PacketType } from '../packet-type';
import { packetType } from '../packet-type-registry';
import { MessageType } from '@protobuf-ts/runtime';
import { filter, map, Observable } from 'rxjs';

export function filterPacket<T extends object>(
  messageType: MessageType<T>,
): (source: Observable<PacketType>) => Observable<T> {
  const targetType = packetType(messageType);
  return source =>
    source.pipe(
      filter(({ type }) => type === targetType),
      map(({ payload }) => payload as T),
    );
}
