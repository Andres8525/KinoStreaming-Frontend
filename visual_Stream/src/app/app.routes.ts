import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { CreatorStudioComponent } from './pages/creator-studio/creator-studio.component';
import { VideoPlayerComponent } from './pages/video-player/video-player.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { authGuard } from './core/auth/auth.guard';
import { creatorGuard } from './core/auth/creator.guard';

export const routes: Routes = [
  { path: '', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'creator-studio', component: CreatorStudioComponent, canActivate: [creatorGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'watch/:id', component: VideoPlayerComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
