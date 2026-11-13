import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { KinoTitleStrategy } from './kino-title.strategy';

@Component({ standalone: true, template: '' })
class EmptyPage {}

describe('KinoTitleStrategy', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'studio', title: 'Creator Studio', component: EmptyPage },
          { path: 'untitled', component: EmptyPage }
        ]),
        { provide: TitleStrategy, useClass: KinoTitleStrategy }
      ]
    });
  });

  it('appends the brand to the route title', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/studio');

    expect(TestBed.inject(Title).getTitle()).toBe('Creator Studio · Kino');
  });

  it('uses the brand alone when the route has no title', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/untitled');

    expect(TestBed.inject(Title).getTitle()).toBe('Kino');
  });
});
