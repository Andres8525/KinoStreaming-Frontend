import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AiInsightsService } from '../../core/ai/ai-insights.service';
import { KinoSocketService } from '../../core/realtime/kino-socket.service';
import { AiChatLauncherComponent } from './ai-chat-launcher.component';

describe('AiChatLauncherComponent', () => {
  let connect: ReturnType<typeof vi.fn>;

  async function setup() {
    connect = vi.fn();
    await TestBed.configureTestingModule({
      imports: [AiChatLauncherComponent],
      providers: [
        provideRouter([]),
        { provide: AiInsightsService, useValue: { chat: vi.fn() } },
        { provide: KinoSocketService, useValue: { status: signal('closed'), request: vi.fn(), connect } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(AiChatLauncherComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows a Kino IA button that opens the chat', async () => {
    const fixture = await setup();
    const element: HTMLElement = fixture.nativeElement;
    const button = element.querySelector<HTMLButtonElement>('.launcher-button');

    expect(button?.textContent).toContain('Kino IA');
    expect(element.querySelector('app-ai-chat')).toBeNull();

    button?.click();
    fixture.detectChanges();

    expect(connect).toHaveBeenCalled();
    expect(button?.getAttribute('aria-expanded')).toBe('true');
    expect(element.querySelector('[role=dialog]')?.textContent).toContain('Chat con Kino IA');
    expect(element.querySelector('app-ai-chat')).not.toBeNull();
  });

  it('closes with the close button and with Escape', async () => {
    const fixture = await setup();
    const element: HTMLElement = fixture.nativeElement;

    fixture.componentInstance.toggle();
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.launcher-close')?.click();
    fixture.detectChanges();
    expect(element.querySelector('[role=dialog]')).toBeNull();

    fixture.componentInstance.toggle();
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(false);
  });
});
