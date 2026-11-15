import { isPlatformBrowser } from '@angular/common';
import { Directive, ElementRef, inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';

@Directive({
  selector: '[appReveal]',
  standalone: true,
  host: { class: 'reveal' }
})
export class RevealDirective implements OnInit, OnDestroy {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private observer: IntersectionObserver | null = null;

  ngOnInit(): void {
    if (!this.isBrowser || typeof IntersectionObserver === 'undefined') {
      this.show();
      return;
    }
    this.observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        this.show();
        this.observer?.disconnect();
      }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    this.observer.observe(this.element);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private show(): void {
    this.element.classList.add('is-visible');
  }
}
