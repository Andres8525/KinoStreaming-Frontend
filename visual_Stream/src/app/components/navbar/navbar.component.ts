import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  isMenuOpen = signal(false);
  isSearchFocused = signal(false);
  searchQuery = signal('');

  toggleMenu() {
    this.isMenuOpen.update(v => !v);
  }

  onSearchFocus() {
    this.isSearchFocused.set(true);
  }

  onSearchBlur() {
    this.isSearchFocused.set(false);
  }

  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }
}
