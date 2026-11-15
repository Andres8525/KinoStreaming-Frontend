import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RevealDirective } from './reveal.directive';

@Component({
  standalone: true,
  imports: [RevealDirective],
  template: '<section appReveal>Contenido</section>'
})
class HostComponent {}

describe('RevealDirective', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows the content right away when IntersectionObserver is not available', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const section = fixture.nativeElement.querySelector('section') as HTMLElement;

    expect(section.classList).toContain('reveal');
    expect(section.classList).toContain('is-visible');
  });

  it('reveals the content once it scrolls into view', () => {
    let notify: (entries: Partial<IntersectionObserverEntry>[]) => void = () => undefined;
    const disconnect = vi.fn();
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: (entries: Partial<IntersectionObserverEntry>[]) => void) {
        notify = callback;
      }
      observe(): void {}
      disconnect = disconnect;
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const section = fixture.nativeElement.querySelector('section') as HTMLElement;

    expect(section.classList).not.toContain('is-visible');
    notify([{ isIntersecting: true }]);

    expect(section.classList).toContain('is-visible');
    expect(disconnect).toHaveBeenCalled();
  });
});
