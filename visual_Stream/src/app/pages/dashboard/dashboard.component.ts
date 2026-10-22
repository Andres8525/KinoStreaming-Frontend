import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { VideoCardComponent } from '../../components/video-card/video-card.component';

interface Video {
  id: number;
  title: string;
  creator: string;
  creatorAvatar: string;
  thumbnail: string;
  views: string;
  duration: string;
  category: string;
  timeAgo: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, VideoCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  categories = signal<string[]>([
    'Todo', 'Cortometrajes', 'Documentales', 'Animación', 'Música', 'Videoclips', 'Experimental', 'Tutoriales'
  ]);

  activeCategory = signal('Todo');

  featuredVideo = signal({
    id: 1,
    title: 'El Último Amanecer — Un cortometraje sobre la resiliencia',
    creator: 'María Solís',
    description: 'Una historia visual que explora los límites de la esperanza humana a través de paisajes sonoros inmersivos y cinematografía contemplativa.',
    thumbnail: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=85',
    category: 'Cortometraje',
    views: '24.5K vistas',
    duration: '18:42'
  });

  private readonly allRecommendedVideos = signal<Video[]>([
    {
      id: 2,
      title: 'Raíces Digitales — Documental Interactivo',
      creator: 'Carlos Vega',
      creatorAvatar: 'CV',
      thumbnail: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=800&q=80',
      views: '18.2K',
      duration: '32:15',
      category: 'Documental',
      timeAgo: 'Hace 2 días'
    },
    {
      id: 3,
      title: 'Sinfonía Urbana — Visuales Generativos',
      creator: 'Ana Ruiz',
      creatorAvatar: 'AR',
      thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80',
      views: '12.8K',
      duration: '8:45',
      category: 'Experimental',
      timeAgo: 'Hace 5 días'
    },
    {
      id: 4,
      title: 'Origami en Movimiento — Animación Stop Motion',
      creator: 'Diego Torres',
      creatorAvatar: 'DT',
      thumbnail: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80',
      views: '31.1K',
      duration: '12:30',
      category: 'Animación',
      timeAgo: 'Hace 1 semana'
    },
    {
      id: 5,
      title: 'Ecos del Pacífico — Documental Ambiental',
      creator: 'Laura Chen',
      creatorAvatar: 'LC',
      thumbnail: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=800&q=80',
      views: '9.4K',
      duration: '45:20',
      category: 'Documental',
      timeAgo: 'Hace 3 días'
    },
    {
      id: 6,
      title: 'Luces de Medianoche — Videoclip Oficial',
      creator: 'Banda Nómada',
      creatorAvatar: 'BN',
      thumbnail: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
      views: '56.7K',
      duration: '4:18',
      category: 'Música',
      timeAgo: 'Hace 1 día'
    },
    {
      id: 7,
      title: 'Código Creativo — Tutorial de Arte Generativo',
      creator: 'Pablo Mendez',
      creatorAvatar: 'PM',
      thumbnail: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=800&q=80',
      views: '7.3K',
      duration: '22:05',
      category: 'Tutorial',
      timeAgo: 'Hace 4 días'
    },
    {
      id: 8,
      title: 'Susurros del Bosque — Cortometraje Contemplativo',
      creator: 'Elena Vidal',
      creatorAvatar: 'EV',
      thumbnail: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80',
      views: '15.9K',
      duration: '14:55',
      category: 'Cortometraje',
      timeAgo: 'Hace 6 días'
    },
    {
      id: 9,
      title: 'Pixel Dreams — Animación Experimental',
      creator: 'Marco Reyes',
      creatorAvatar: 'MR',
      thumbnail: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
      views: '22.4K',
      duration: '6:38',
      category: 'Animación',
      timeAgo: 'Hace 2 semanas'
    }
  ]);

  private readonly allTrendingVideos = signal<Video[]>([
    {
      id: 10,
      title: 'La Ruta de las Estrellas — Time-Lapse',
      creator: 'Sofía Luna',
      creatorAvatar: 'SL',
      thumbnail: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=800&q=80',
      views: '41.2K',
      duration: '10:15',
      category: 'Documental',
      timeAgo: 'Hace 12 horas'
    },
    {
      id: 11,
      title: 'Danza Mecánica — Performance Visual',
      creator: 'Ricardo Paz',
      creatorAvatar: 'RP',
      thumbnail: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=800&q=80',
      views: '8.6K',
      duration: '7:22',
      category: 'Experimental',
      timeAgo: 'Hace 1 día'
    },
    {
      id: 12,
      title: 'Acuarelas Vivas — Proceso Artístico',
      creator: 'Camila Ortiz',
      creatorAvatar: 'CO',
      thumbnail: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80',
      views: '19.8K',
      duration: '16:40',
      category: 'Tutorial',
      timeAgo: 'Hace 3 días'
    },
    {
      id: 13,
      title: 'Horizonte Infinito — Drone Cinematografía',
      creator: 'Andrés Gil',
      creatorAvatar: 'AG',
      thumbnail: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
      views: '33.5K',
      duration: '20:10',
      category: 'Documental',
      timeAgo: 'Hace 5 días'
    }
  ]);

  recommendedVideos = computed(() => this.filterVideos(this.allRecommendedVideos()));
  trendingVideos = computed(() => this.filterVideos(this.allTrendingVideos()));

  scrollPosition = signal(0);

  private filterVideos(videos: Video[]): Video[] {
    const categoryAliases: Record<string, string> = {
      Cortometrajes: 'Cortometraje',
      Documentales: 'Documental',
      Videoclips: 'Videoclip',
      Tutoriales: 'Tutorial'
    };
    const category = categoryAliases[this.activeCategory()] ?? this.activeCategory();

    return category === 'Todo'
      ? videos
      : videos.filter(video => video.category === category);
  }

  setCategory(category: string) {
    this.activeCategory.set(category);
  }

  scrollCarousel(direction: 'left' | 'right', carouselId: string) {
    const container = document.getElementById(carouselId);
    if (container) {
      const scrollAmount = 320;
      container.scrollBy({
        left: direction === 'right' ? scrollAmount : -scrollAmount,
        behavior: 'smooth'
      });
    }
  }
}
