import { EventEmitter } from 'events';
import { TLSSocket } from 'tls';
import { MumbleSocket } from './mumble-socket';

describe(MumbleSocket.name, () => {
  it('should emit close when the socket closes', () => {
    const tlsSocket = new EventEmitter() as unknown as TLSSocket;
    const socket = new MumbleSocket(tlsSocket);

    const close = vi.fn();
    socket.on('close', close);

    tlsSocket.emit('close');

    expect(close).toHaveBeenCalledOnce();
  });
});
