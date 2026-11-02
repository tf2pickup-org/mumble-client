import { EventEmitter } from 'events';
import { TLSSocket } from 'tls';
import { Ping } from '@tf2pickup-org/mumble-protocol';
import { MumbleSocket } from './mumble-socket';
import { packetType } from './packet-type-registry';

describe(MumbleSocket.name, () => {
  it('should emit close when the socket closes', () => {
    const tlsSocket = new EventEmitter() as unknown as TLSSocket;
    const socket = new MumbleSocket(tlsSocket);

    const close = vi.fn();
    socket.on('close', close);

    tlsSocket.emit('close');

    expect(close).toHaveBeenCalledOnce();
  });

  it('should keep reading when a listener throws', () => {
    const tlsSocket = new EventEmitter() as unknown as TLSSocket;
    const socket = new MumbleSocket(tlsSocket);
    const encoded = Ping.toBinary(Ping.create());
    const prefix = Buffer.alloc(6);
    prefix.writeUint16BE(packetType(Ping)!, 0);
    prefix.writeUint32BE(encoded.length, 2);
    const ping = Buffer.concat([prefix, encoded]);

    const listener = vi.fn(() => {
      throw new Error('listener failed');
    });
    socket.on('packet', listener);

    expect(() => tlsSocket.emit('data', ping)).toThrow('listener failed');
    socket.off('packet', listener);
    const received = vi.fn();
    socket.on('packet', received);
    tlsSocket.emit('data', ping);

    expect(received).toHaveBeenCalledOnce();
  });
});
