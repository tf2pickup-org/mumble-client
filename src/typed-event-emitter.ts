import { EventEmitter } from 'node:events';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventsMap = Record<string, (...args: any[]) => void>;

type EventNames<Map extends EventsMap> = keyof Map & (string | symbol);

export type EventParams<
  Map extends EventsMap,
  Ev extends EventNames<Map>,
> = Parameters<Map[Ev]>;

export interface TypedEventBroadcaster<EmitEvents extends EventsMap> {
  emit<Ev extends EventNames<EmitEvents>>(
    ev: Ev,
    ...args: EventParams<EmitEvents, Ev>
  ): boolean;
}

export abstract class TypedEventEmitter<
    ListenEvents extends EventsMap,
    EmitEvents extends EventsMap,
  >
  extends EventEmitter
  implements TypedEventBroadcaster<EmitEvents>
{
  on<EventName extends EventNames<ListenEvents>>(
    eventName: EventName,
    listener: ListenEvents[EventName],
  ): this {
    return super.on(eventName, listener);
  }

  once<EventName extends EventNames<ListenEvents>>(
    eventName: EventName,
    listener: ListenEvents[EventName],
  ): this {
    return super.once(eventName, listener);
  }

  emit<EventName extends EventNames<EmitEvents>>(
    eventName: EventName,
    ...args: EventParams<EmitEvents, EventName>
  ): boolean {
    return super.emit(eventName, ...args);
  }

  listeners<EventName extends EventNames<ListenEvents>>(
    event: EventName,
  ): ListenEvents[EventName][] {
    return super.listeners(event) as ListenEvents[EventName][];
  }
}
