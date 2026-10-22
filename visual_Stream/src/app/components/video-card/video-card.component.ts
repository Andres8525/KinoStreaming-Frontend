import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-video-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './video-card.component.html',
  styleUrl: './video-card.component.scss'
})
export class VideoCardComponent {
  @Input() video: any;
  @Input() animationDelay: number = 0;
  imageFailed = false;

  get gradientStyle(): string {
    const gradients = [
      'linear-gradient(135deg, #1E293B, #475569)',
      'linear-gradient(135deg, #312E81, #4338CA)',
      'linear-gradient(135deg, #064E3B, #059669)',
      'linear-gradient(135deg, #7C2D12, #C2410C)',
      'linear-gradient(135deg, #581C87, #7E22CE)',
      'linear-gradient(135deg, #1E3A5F, #2563EB)',
      'linear-gradient(135deg, #713F12, #A16207)',
      'linear-gradient(135deg, #831843, #BE185D)',
    ];
    return gradients[(this.video?.id || 0) % gradients.length];
  }

  get categoryColor(): string {
    const colors: Record<string, string> = {
      'Documental': '#6366F1',
      'Cortometraje': '#FF6B45',
      'Experimental': '#7E22CE',
      'Animación': '#059669',
      'Música': '#E11D48',
      'Tutorial': '#2563EB',
      'Cortometrajes': '#FF6B45'
    };
    return colors[this.video?.category] || '#64748B';
  }

  get categoryBg(): string {
    const bgs: Record<string, string> = {
      'Documental': '#EEF2FF',
      'Cortometraje': '#FFF5F2',
      'Experimental': '#FAF5FF',
      'Animación': '#ECFDF5',
      'Música': '#FFF1F2',
      'Tutorial': '#EFF6FF',
      'Cortometrajes': '#FFF5F2'
    };
    return bgs[this.video?.category] || '#F8FAFC';
  }
}
