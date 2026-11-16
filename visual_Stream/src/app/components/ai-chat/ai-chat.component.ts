import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, finalize, map, Observable, throwError } from 'rxjs';
import { apiErrorMessage } from '../../core/api/api-error';
import { AiChatReply, AiChatResponse, ChatMessage, ChatRole, InsightsSource } from '../../core/ai/ai-insights.models';
import { AiInsightsService, MAX_CHAT_MESSAGE_LENGTH, toChatReply } from '../../core/ai/ai-insights.service';
import { KinoSocketService, SocketReplyError } from '../../core/realtime/kino-socket.service';
import { VideoCardData } from '../../core/videos/video.models';

export interface ChatEntry {
  id: number;
  role: ChatRole;
  content: string;
  suggestions: VideoCardData[];
  source?: InsightsSource;
  failed?: boolean;
}

export const GREETING =
  '¡Hola! Soy Kino IA. Pregúntame qué es lo más visto, pídeme recomendaciones por categoría o '
  + 'pregúntame si hay alguien transmitiendo en vivo.';

export const QUICK_PROMPTS: readonly string[] = [
  '¿Qué es lo más visto?',
  'Recomiéndame algo para ver hoy',
  'Recomiéndame un documental',
  '¿Qué novedades hay esta semana?',
  '¿Hay alguien en vivo?'
];

const FALLBACK_ERROR = 'Kino IA no pudo responder ahora. Inténtalo de nuevo.';

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './ai-chat.component.html',
  styleUrl: './ai-chat.component.scss'
})
export class AiChatComponent {
  private readonly api = inject(AiInsightsService);
  private readonly socket = inject(KinoSocketService);
  private readonly log = viewChild<ElementRef<HTMLElement>>('log');
  private nextId = 1;

  readonly maxLength = MAX_CHAT_MESSAGE_LENGTH;
  readonly quickPrompts = QUICK_PROMPTS;
  readonly entries = signal<ChatEntry[]>([this.greeting()]);
  readonly draft = signal('');
  readonly sending = signal(false);
  readonly realtime = computed(() => this.socket.status() === 'open');
  readonly canSend = computed(() => !this.sending() && this.draft().trim().length > 0);
  readonly hasConversation = computed(() => this.entries().length > 1);

  updateDraft(value: string): void {
    this.draft.set(value.slice(0, this.maxLength));
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  send(prompt?: string): void {
    const content = (prompt ?? this.draft()).trim().slice(0, this.maxLength);
    if (!content || this.sending()) {
      return;
    }
    this.entries.update(entries => [...entries, { id: this.nextId++, role: 'user', content, suggestions: [] }]);
    this.draft.set('');
    this.sending.set(true);
    this.scrollToEnd();

    const messages: ChatMessage[] = this.entries()
      .filter(entry => entry.id !== 0 && !entry.failed)
      .map(({ role, content: text }) => ({ role, content: text }));

    this.ask(messages).pipe(finalize(() => {
      this.sending.set(false);
      this.scrollToEnd();
    })).subscribe({
      next: reply => this.entries.update(entries => [...entries, {
        id: this.nextId++, role: 'assistant', content: reply.reply, suggestions: reply.suggestions.slice(0, 4),
        source: reply.source
      }]),
      error: (error: unknown) => this.entries.update(entries => [...entries, {
        id: this.nextId++, role: 'assistant', suggestions: [], failed: true,
        content: error instanceof SocketReplyError ? error.message : apiErrorMessage(error, FALLBACK_ERROR)
      }])
    });
  }

  reset(): void {
    if (this.sending()) {
      return;
    }
    this.entries.set([this.greeting()]);
    this.draft.set('');
  }

  private ask(messages: ChatMessage[]): Observable<AiChatReply> {
    if (!this.realtime()) {
      return this.api.chat(messages);
    }
    return this.socket.request<AiChatResponse>('chat', { messages }, 'chat-reply', 'chat-error').pipe(
      map(toChatReply),
      catchError((error: unknown) => error instanceof SocketReplyError
        ? throwError(() => error)
        : this.api.chat(messages))
    );
  }

  private greeting(): ChatEntry {
    return { id: 0, role: 'assistant', content: GREETING, suggestions: [] };
  }

  private scrollToEnd(): void {
    queueMicrotask(() => {
      const element = this.log()?.nativeElement;
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
    });
  }
}
