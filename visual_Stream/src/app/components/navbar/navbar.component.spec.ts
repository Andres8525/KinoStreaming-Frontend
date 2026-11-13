import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { UserProfile } from '../../core/auth/auth.models';
import { NavbarComponent } from './navbar.component';

describe('NavbarComponent', () => {
  let user$: BehaviorSubject<UserProfile | null>;
  let logout: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    user$ = new BehaviorSubject<UserProfile | null>(null);
    logout = vi.fn();
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: { user$, logout } }]
    }).compileComponents();
  });

  function render() {
    const fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('offers sign-in links when signed out', () => {
    const { element } = render();

    expect(element.querySelector('a[href="/login"]')).not.toBeNull();
    expect(element.querySelector('a[href="/creator-studio"]')).toBeNull();
  });

  it('shows Creator Studio and "Transmitir" to every signed-in account, including older VIEWER accounts', () => {
    user$.next({ email: 'viewer@example.com', role: 'VIEWER' });
    const { element } = render();

    expect(element.textContent).toContain('viewer@example.com');
    expect(element.querySelector('a[href="/creator-studio"]')).not.toBeNull();
    expect(element.querySelector('a[href="/creator-studio?tab=live"]')).not.toBeNull();
  });

  it('shows Creator Studio to creators', () => {
    user$.next({ email: 'creator@example.com', role: 'CREATOR' });
    const { element } = render();

    expect(element.querySelector('a[href="/creator-studio"]')).not.toBeNull();
  });

  it('searches from the dashboard and closes the mobile menu', () => {
    const { fixture } = render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.componentInstance.isMenuOpen.set(true);
    fixture.componentInstance.searchQuery.set('  documental ');

    fixture.componentInstance.submitSearch();

    expect(navigate).toHaveBeenCalledWith(['/'], { queryParams: { q: 'documental' } });
    expect(fixture.componentInstance.isMenuOpen()).toBe(false);
  });

  it('signs out and returns to login', () => {
    user$.next({ email: 'viewer@example.com', role: 'VIEWER' });
    const { fixture } = render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    fixture.componentInstance.logout();

    expect(logout).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith('/login');
  });
});
