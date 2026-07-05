import { EventEmitter } from 'events';
import { TLSSocket } from 'tls';
import { MumbleSocket } from './mumble-socket';

describe(MumbleSocket.name, () => {
  it('should complete packet observables when the socket closes', () => {
    const tlsSocket = new EventEmitter() as unknown as TLSSocket;
    const socket = new MumbleSocket(tlsSocket);

    const complete = vi.fn();
    socket.packet.subscribe({ complete });
    socket.audioPacket.subscribe({ complete });
    socket.fullAudioPacket.subscribe({ complete });

    tlsSocket.emit('close');

    expect(complete).toHaveBeenCalledTimes(3);
  });
});
