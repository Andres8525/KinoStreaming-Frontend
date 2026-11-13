import { isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { ServerStatusService } from './core/api/server-status.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = 'Kino';

  constructor() {
    // Start waking the backend (it may be sleeping on a free plan) while the user reads the page.
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      inject(ServerStatusService).wakeUp().subscribe();
    }
  }
}
