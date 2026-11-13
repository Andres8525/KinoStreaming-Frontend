import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { CreatorStudioComponent } from './pages/creator-studio/creator-studio.component';
import { VideoPlayerComponent } from './pages/video-player/video-player.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { LiveWatchComponent } from './pages/live-watch/live-watch.component';
import { authGuard } from './core/auth/auth.guard';
import { creatorGuard } from './core/auth/creator.guard';

export const routes: Routes = [
  { path: '', title: 'Inicio', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'creator-studio', title: 'Creator Studio', component: CreatorStudioComponent, canActivate: [creatorGuard] },
  { path: 'login', title: 'Iniciar sesión', component: LoginComponent },
  { path: 'register', title: 'Crear cuenta', component: RegisterComponent },
  { path: 'watch/:id', title: 'Reproducir', component: VideoPlayerComponent, canActivate: [authGuard] },
  { path: 'live/:id', title: 'En vivo', component: LiveWatchComponent, canActivate: [authGuard] },
  { path: '**', title: 'Página no encontrada', component: NotFoundComponent }
];
