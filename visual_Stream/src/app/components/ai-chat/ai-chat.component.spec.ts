import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AiChatReply } from '../../core/ai/ai-insights.models';
import { AiInsightsService } from '../../core/ai/ai-insights.service';
import { KinoSocketService, SocketReplyError, SocketStatus } from '../../core/realtime/kino-socket.service';
import { AiChatComponent, GREETING } from './ai-chat.component';

const REPLY: AiChatReply = {
  reply: 'Mira «Ruta andina»', source: 'ai', generatedAt: '2026-11-15T12:00:00Z',
  suggestions: [{
    id: 'v1', title: 'Ruta andina', description: '', videoUrl: '', creator: 'Ana Ruiz', creatorAvatar: '',
    thumbnail: 'https://cdn.example.com/t.jpg', views: '1,5 mil', viewCount: 1500, duration: '', category: 'Documental',
    timeAgo: '', tags: ['Documental'], accessPrice: 0, suggestedDonation: null
  }]
};

describe('AiChatComponent', () => {
  let chat: ReturnType<typeof vi.fn>;
  let request: ReturnType<typeof vi.fn>;
  const status = signal<SocketStatus>('closed');

  async function setup() {
    chat = vi.fn();
    request = vi.fn();
    await TestBed.configureTestingModule({
      imports: [AiChatComponent],
      providers: [
        provideRouter([]),
        { provide: AiInsightsService, useValue: { chat } },
        { provide: KinoSocketService, useValue: { status, request } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(AiChatComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => status.set('closed'));

  it('greets the viewer and offers quick questions', async () => {
    const fixture = await setup();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('[role=log]')?.textContent).toContain(GREETING);
    expect(element.querySelectorAll('.chat-prompt').length).toBeGreaterThan(3);
  });

  it('sends the conversation over HTTP without the greeting and shows suggested videos', async () => {
    const fixture = await setup();
    chat.mockReturnValue(of(REPLY));

    fixture.componentInstance.updateDraft('¿Qué veo hoy?');
    fixture.componentInstance.send();
    fixture.detectChanges();

    expect(chat).toHaveBeenCalledWith([{ role: 'user', content: '¿Qué veo hoy?' }]);
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.chat-bubble--user')?.textContent).toContain('¿Qué veo hoy?');
    expect(element.querySelector('.chat-suggestion')?.getAttribute('href')).toBe('/watch/v1');
    expect(element.textContent).toContain('Respondido con Gemini IA');
    expect(fixture.componentInstance.draft()).toBe('');
  });

  it('uses the WebSocket when it is open', async () => {
    const fixture = await setup();
    status.set('open');
    request.mockReturnValue(of({ ...REPLY, suggestions: [] }));

    fixture.componentInstance.send('¿Hay alguien en vivo?');

    expect(request).toHaveBeenCalledWith('chat', { messages: [{ role: 'user', content: '¿Hay alguien en vivo?' }] },
      'chat-reply', 'chat-error');
    expect(chat).not.toHaveBeenCalled();
    expect(fixture.componentInstance.entries().at(-1)?.content).toBe('Mira «Ruta andina»');
  });

  it('falls back to HTTP when the WebSocket does not answer', async () => {
    const fixture = await setup();
    status.set('open');
    request.mockReturnValue(throwError(() => new Error('timeout')));
    chat.mockReturnValue(of(REPLY));

    fixture.componentInstance.send('Hola');

    expect(chat).toHaveBeenCalled();
    expect(fixture.componentInstance.entries().at(-1)?.failed).toBeFalsy();
  });

  it('shows the server message when Kino IA refuses the question', async () => {
    const fixture = await setup();
    status.set('open');
    request.mockReturnValue(throwError(() => new SocketReplyError('Espera un minuto')));

    fixture.componentInstance.send('Hola');

    expect(chat).not.toHaveBeenCalled();
    expect(fixture.componentInstance.entries().at(-1)).toEqual(expect.objectContaining({
      failed: true, content: 'Espera un minuto'
    }));
  });

  it('explains HTTP errors and leaves failed answers out of the next question', async () => {
    const fixture = await setup();
    chat.mockReturnValueOnce(throwError(() => new HttpErrorResponse({
      status: 429, error: { message: 'Has enviado muchas preguntas' }
    }))).mockReturnValue(of(REPLY));

    fixture.componentInstance.send('Primera');
    fixture.componentInstance.send('Segunda');

    expect(fixture.componentInstance.entries()[2].content).toBe('Has enviado muchas preguntas');
    expect(chat).toHaveBeenLastCalledWith([
      { role: 'user', content: 'Primera' },
      { role: 'user', content: 'Segunda' }
    ]);
  });

  it('ignores empty questions and questions sent while waiting', async () => {
    const fixture = await setup();
    chat.mockReturnValue(new Subject());

    fixture.componentInstance.send('   ');
    fixture.componentInstance.send('Hola');
    fixture.componentInstance.send('Otra');

    expect(chat).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.sending()).toBe(true);
  });

  it('starts a new conversation', async () => {
    const fixture = await setup();
    chat.mockReturnValue(of(REPLY));
    fixture.componentInstance.send('Hola');

    fixture.componentInstance.reset();

    expect(fixture.componentInstance.entries()).toHaveLength(1);
  });

  it('limits the question length', async () => {
    const fixture = await setup();

    fixture.componentInstance.updateDraft('a'.repeat(1200));

    expect(fixture.componentInstance.draft()).toHaveLength(1000);
  });
});
