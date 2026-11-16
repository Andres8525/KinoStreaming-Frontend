import { TestBed } from '@angular/core/testing';
import {
  KinoSocketService,
  PING_INTERVAL_MS,
  reconnectDelay,
  SocketReplyError,
  toSocketUrl,
  WEB_SOCKET_FACTORY
} from './kino-socket.service';

class FakeSocket {
  static instances: FakeSocket[] = [];
  readonly sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(readonly url: string) {
    FakeSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.onclose?.();
  }

  receive(message: object): void {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}

describe('KinoSocketService', () => {
  beforeEach(() => {
    FakeSocket.instances = [];
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [{ provide: WEB_SOCKET_FACTORY, useValue: (url: string) => new FakeSocket(url) as unknown as WebSocket }]
    });
  });

  afterEach(() => {
    TestBed.inject(KinoSocketService).disconnect();
    vi.useRealTimers();
  });

  it('builds the WebSocket URL from the API base URL', () => {
    expect(toSocketUrl('https://kino-backend-alq2.onrender.com/api')).toBe('wss://kino-backend-alq2.onrender.com/ws/kino');
    expect(toSocketUrl('http://localhost:8081/api')).toBe('ws://localhost:8081/ws/kino');
  });

  it('connects once, publishes messages by type and pings while open', () => {
    const service = TestBed.inject(KinoSocketService);
    const received: unknown[] = [];
    service.on<{ totalViews: number }>('insights').subscribe(data => received.push(data));

    service.connect();
    service.connect();
    const socket = FakeSocket.instances[0];
    socket.onopen?.();
    socket.receive({ type: 'insights', data: { totalViews: 10 } });
    socket.receive({ type: 'pong', data: {} });
    vi.advanceTimersByTime(PING_INTERVAL_MS);

    expect(FakeSocket.instances).toHaveLength(1);
    expect(service.status()).toBe('open');
    expect(received).toEqual([{ totalViews: 10 }]);
    expect(socket.sent).toContain(JSON.stringify({ type: 'ping' }));
  });

  it('reconnects with a growing delay after the connection drops', () => {
    const service = TestBed.inject(KinoSocketService);
    service.connect();
    FakeSocket.instances[0].onopen?.();

    FakeSocket.instances[0].close();
    expect(service.status()).toBe('closed');
    vi.advanceTimersByTime(reconnectDelay(0));

    expect(FakeSocket.instances).toHaveLength(2);
    expect(reconnectDelay(10)).toBe(30_000);
  });

  it('matches replies to requests and reports server errors', () => {
    const service = TestBed.inject(KinoSocketService);
    service.connect();
    const socket = FakeSocket.instances[0];
    socket.onopen?.();
    let reply: unknown;
    let error: unknown;

    service.request('chat', { messages: [] }, 'chat-reply', 'chat-error').subscribe(value => reply = value);
    const first = JSON.parse(socket.sent[0]) as { requestId: string; type: string };
    socket.receive({ type: 'chat-reply', requestId: 'other', data: 'no' });
    socket.receive({ type: 'chat-reply', requestId: first.requestId, data: 'sí' });

    service.request('chat', { messages: [] }, 'chat-reply', 'chat-error').subscribe({ error: value => error = value });
    const second = JSON.parse(socket.sent[1]) as { requestId: string };
    socket.receive({ type: 'chat-error', requestId: second.requestId, data: { message: 'Espera un minuto' } });

    expect(first.type).toBe('chat');
    expect(reply).toBe('sí');
    expect(error).toBeInstanceOf(SocketReplyError);
    expect((error as Error).message).toBe('Espera un minuto');
  });

  it('fails a request immediately when the socket is not open', () => {
    const service = TestBed.inject(KinoSocketService);
    let error: unknown;

    service.request('chat', {}, 'chat-reply', 'chat-error').subscribe({ error: value => error = value });

    expect((error as Error).message).toBe('closed');
  });
});
