import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { VideoCardData } from '../videos/video.models';
import { WatchHistoryEntry } from './recommendation-scoring';

export const WATCH_HISTORY_KEY = 'kino.watchHistory';
export const MAX_HISTORY_ENTRIES = 30;

function isEntry(value: unknown): value is WatchHistoryEntry {
  return typeof value === 'object' && value !== null
    && 'id' in value && typeof value.id === 'string'
    && 'category' in value && typeof value.category === 'string'
    && 'watchedAt' in value && typeof value.watchedAt === 'number';
}

@Injectable({ providedIn: 'root' })
export class WatchHistoryService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  entries(): WatchHistoryEntry[] {
    if (!this.isBrowser) {
      return [];
    }
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(WATCH_HISTORY_KEY) ?? '[]');
      return Array.isArray(stored) ? stored.filter(isEntry) : [];
    } catch {
      return [];
    }
  }

  record(video: Pick<VideoCardData, 'id' | 'category'>): void {
    if (!this.isBrowser) {
      return;
    }
    const entries = this.entries().filter(entry => entry.id !== video.id);
    entries.push({ id: video.id, category: video.category, watchedAt: Date.now() });
    try {
      localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(entries.slice(-MAX_HISTORY_ENTRIES)));
    } catch {
      return;
    }
  }
}
