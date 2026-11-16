import { Component, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { KinoSocketService } from '../../core/realtime/kino-socket.service';
import { AiChatComponent } from '../ai-chat/ai-chat.component';

@Component({
  selector: 'app-ai-chat-launcher',
  standalone: true,
  imports: [AiChatComponent],
  templateUrl: './ai-chat-launcher.component.html',
  styleUrl: './ai-chat-launcher.component.scss'
})
export class AiChatLauncherComponent {
  private readonly socket = inject(KinoSocketService);
  private readonly toggleButton = viewChild<ElementRef<HTMLButtonElement>>('launcherButton');

  readonly open = signal(false);

  toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    this.socket.connect();
    this.open.set(true);
  }

  @HostListener('document:keydown.escape')
  close(): void {
    if (!this.open()) {
      return;
    }
    this.open.set(false);
    this.toggleButton()?.nativeElement.focus();
  }
}
