import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { authGuard } from './core/auth/auth.guard';
import { creatorGuard } from './core/auth/creator.guard';
import { guestGuard } from './core/auth/guest.guard';

export const routes: Routes = [
  { path: '', title: 'Inicio', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'creator-studio', title: 'Creator Studio', loadComponent: () => import('./pages/creator-studio/creator-studio.component').then(m => m.CreatorStudioComponent), canActivate: [creatorGuard] },
  { path: 'login', title: 'Iniciar sesión', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'register', title: 'Crear cuenta', component: RegisterComponent, canActivate: [guestGuard] },
  { path: 'watch/:id', title: 'Reproducir', loadComponent: () => import('./pages/video-player/video-player.component').then(m => m.VideoPlayerComponent), canActivate: [authGuard] },
  { path: 'live/:id', title: 'En vivo', loadComponent: () => import('./pages/live-watch/live-watch.component').then(m => m.LiveWatchComponent), canActivate: [authGuard] },
  { path: '**', title: 'Página no encontrada', loadComponent: () => import('./pages/not-found/not-found.component').then(m => m.NotFoundComponent) }
];
