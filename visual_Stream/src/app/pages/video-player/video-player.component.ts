import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './video-player.component.html',
  styleUrl: './video-player.component.scss'
})
export class VideoPlayerComponent {
  isLiked = signal(false);
  showDonationModal = signal(false);
  selectedDonation = signal(5);

  video = signal({
    id: 1,
    title: 'El Último Amanecer — Un cortometraje sobre la resiliencia',
    thumbnail: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=85',
    source: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    creator: 'María Solís',
    creatorAvatar: 'MS',
    subscribers: '4.2K suscriptores',
    description: 'Una historia visual que explora los límites de la esperanza humana a través de paisajes sonoros inmersivos y cinematografía contemplativa. Filmado durante 3 meses en locaciones remotas de Sudamérica, este cortometraje busca capturar la esencia de la perseverancia humana frente a la adversidad.',
    views: '24,521 vistas',
    date: '15 de septiembre, 2026',
    likes: 1847,
    category: 'Cortometraje'
  });

  relatedVideos = signal([
    { id: 2, title: 'Raíces Digitales — Documental Interactivo', creator: 'Carlos Vega', views: '18.2K', duration: '32:15', avatar: 'CV', thumbnail: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=500&q=80' },
    { id: 3, title: 'Sinfonía Urbana — Visuales Generativos', creator: 'Ana Ruiz', views: '12.8K', duration: '8:45', avatar: 'AR', thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=500&q=80' },
    { id: 4, title: 'Origami en Movimiento — Stop Motion', creator: 'Diego Torres', views: '31.1K', duration: '12:30', avatar: 'DT', thumbnail: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=500&q=80' },
    { id: 5, title: 'Ecos del Pacífico — Documental', creator: 'Laura Chen', views: '9.4K', duration: '45:20', avatar: 'LC', thumbnail: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=500&q=80' },
    { id: 6, title: 'Luces de Medianoche — Videoclip', creator: 'Banda Nómada', views: '56.7K', duration: '4:18', avatar: 'BN', thumbnail: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=500&q=80' }
  ]);

  toggleLike() {
    this.isLiked.update(v => !v);
  }

  openDonation() {
    this.showDonationModal.set(true);
  }

  closeDonation() {
    this.showDonationModal.set(false);
  }

  setDonation(amount: number) {
    this.selectedDonation.set(amount);
  }
}
