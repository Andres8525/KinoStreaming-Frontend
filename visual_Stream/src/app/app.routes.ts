import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { CreatorStudioComponent } from './pages/creator-studio/creator-studio.component';
import { VideoPlayerComponent } from './pages/video-player/video-player.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'creator-studio', component: CreatorStudioComponent },
  { path: 'watch/:id', component: VideoPlayerComponent },
  { path: '**', redirectTo: '' }
];
