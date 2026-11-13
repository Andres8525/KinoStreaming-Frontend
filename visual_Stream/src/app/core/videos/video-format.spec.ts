import { formatCount, formatTimeAgo, initials } from './video-format';
import { toVideoCardData } from './video-api.service';
import { VideoResponse } from './video.models';

describe('video formatting helpers', () => {
  const now = Date.parse('2026-11-12T12:00:00Z');

  it('formats view counts compactly', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(950)).toBe('950');
    expect(formatCount(1500)).not.toBe('1500');
  });

  it('builds up to two uppercase initials', () => {
    expect(initials('ana maría lópez')).toBe('AM');
    expect(initials('  Kino  ')).toBe('K');
    expect(initials('')).toBe('');
  });

  it('formats relative publication time', () => {
    expect(formatTimeAgo('2026-11-10T12:00:00Z', now)).toBe('anteayer');
    expect(formatTimeAgo('2026-11-12T09:00:00Z', now)).toBe('hace 3 horas');
    expect(formatTimeAgo('2026-11-12T11:59:30Z', now)).toBe('este minuto');
  });

  it('returns an empty string for invalid dates', () => {
    expect(formatTimeAgo('not-a-date', now)).toBe('');
  });
});

describe('toVideoCardData', () => {
  const response: VideoResponse = {
    id: 'video-1',
    title: 'Sombras',
    description: 'Cortometraje',
    videoUrl: 'https://cdn.example.com/video.mp4',
    thumbnailUrl: null,
    tags: [],
    accessPrice: 0,
    suggestedDonation: null,
    creator: { id: 'creator-1', displayName: 'Lucía Torres' },
    viewCount: 12,
    createdAt: '2026-11-12T10:00:00Z'
  };

  it('maps the API response to card data with safe defaults', () => {
    const card = toVideoCardData(response);

    expect(card.creator).toBe('Lucía Torres');
    expect(card.creatorAvatar).toBe('LT');
    expect(card.thumbnail).toBe('');
    expect(card.category).toBe('Sin categoría');
    expect(card.views).toBe('12');
  });

  it('uses the first tag as category', () => {
    expect(toVideoCardData({ ...response, tags: ['Documental', 'Indie'] }).category).toBe('Documental');
  });
});
