export interface ScoredVideoInput {
  id: string;
  title: string;
  category: string;
  tags: string[];
  viewCount: number;
}

export interface WatchHistoryEntry {
  id: string;
  category: string;
  watchedAt: number;
}

export interface RankedVideo {
  id: string;
  rank: number;
  viewCount: number;
  share: number;
}

export interface PersonalPick {
  id: string;
  score: number;
  reason: string;
}

export type WorkerRequest =
  | { id: number; kind: 'most-watched'; videos: ScoredVideoInput[]; limit: number }
  | { id: number; kind: 'personalize'; videos: ScoredVideoInput[]; history: WatchHistoryEntry[]; limit: number };

export type WorkerResponse =
  | { id: number; kind: 'most-watched'; result: RankedVideo[] }
  | { id: number; kind: 'personalize'; result: PersonalPick[] };

const AFFINITY_WEIGHT = 0.65;
const POPULARITY_WEIGHT = 0.35;

function categoryKey(category: string): string {
  return category.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim().replace(/(es|s)$/, '');
}

export function rankMostWatched(videos: ScoredVideoInput[], limit: number): RankedVideo[] {
  const total = videos.reduce((sum, video) => sum + Math.max(0, video.viewCount), 0);
  return [...videos]
    .filter(video => video.viewCount > 0)
    .sort((first, second) => second.viewCount - first.viewCount || first.title.localeCompare(second.title))
    .slice(0, limit)
    .map((video, index) => ({
      id: video.id,
      rank: index + 1,
      viewCount: video.viewCount,
      share: total === 0 ? 0 : Math.round((video.viewCount / total) * 1000) / 10
    }));
}

export function personalize(videos: ScoredVideoInput[], history: WatchHistoryEntry[], limit: number): PersonalPick[] {
  if (history.length === 0) {
    return [];
  }
  const watched = new Set(history.map(entry => entry.id));
  const affinity = new Map<string, number>();
  const labels = new Map<string, string>();
  history.forEach((entry, index) => {
    const key = categoryKey(entry.category);
    const recency = 1 + index / history.length;
    affinity.set(key, (affinity.get(key) ?? 0) + recency);
    labels.set(key, entry.category);
  });
  const maxAffinity = Math.max(...affinity.values());
  const maxPopularity = Math.max(1, ...videos.map(video => Math.log1p(Math.max(0, video.viewCount))));

  return videos
    .filter(video => !watched.has(video.id))
    .map(video => {
      const keys = [video.category, ...video.tags].map(categoryKey);
      const bestKey = keys.find(key => affinity.has(key));
      const categoryScore = bestKey ? (affinity.get(bestKey) ?? 0) / maxAffinity : 0;
      const popularity = Math.log1p(Math.max(0, video.viewCount)) / maxPopularity;
      const score = Math.round((AFFINITY_WEIGHT * categoryScore + POPULARITY_WEIGHT * popularity) * 1000) / 1000;
      const reason = bestKey
        ? `Porque viste ${labels.get(bestKey) ?? video.category}`
        : 'Popular entre el público de Kino';
      return { id: video.id, score, reason };
    })
    .sort((first, second) => second.score - first.score)
    .slice(0, limit);
}

export function handleWorkerRequest(request: WorkerRequest): WorkerResponse {
  if (request.kind === 'most-watched') {
    return { id: request.id, kind: request.kind, result: rankMostWatched(request.videos, request.limit) };
  }
  return { id: request.id, kind: request.kind, result: personalize(request.videos, request.history, request.limit) };
}
