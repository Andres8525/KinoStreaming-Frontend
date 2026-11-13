import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LiveStreamData } from '../../core/live/live.models';

@Component({
  selector: 'app-live-now',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './live-now.component.html',
  styleUrl: './live-now.component.scss'
})
export class LiveNowComponent {
  readonly streams = input.required<LiveStreamData[]>();
}
