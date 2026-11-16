import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, InjectionToken, PLATFORM_ID, signal } from '@angular/core';
import { VideoCardData } from '../videos/video.models';
import {
  handleWorkerRequest,
  PersonalPick,
  RankedVideo,
  ScoredVideoInput,
  WatchHistoryEntry,
  WorkerRequest,
  WorkerResponse
} from './recommendation-scoring';

export type WorkerFactory = () => Worker | null;

export const RECOMMENDATION_WORKER_FACTORY = new InjectionToken<WorkerFactory>('RECOMMENDATION_WORKER_FACTORY', {
  providedIn: 'root',
  factory: () => () => typeof Worker === 'undefined'
    ? null
    : new Worker(new URL('./recommendations.worker', import.meta.url), { type: 'module' })
});

export interface RankedCard extends RankedVideo {
  video: VideoCardData;
}

export interface PersonalCard extends PersonalPick {
  video: VideoCardData;
}

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

function toInput(video: VideoCardData): ScoredVideoInput {
  return { id: video.id, title: video.title, category: video.category, tags: video.tags, viewCount: video.viewCount };
}

@Injectable({ providedIn: 'root' })
export class RecommendationEngineService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly workerFactory = inject(RECOMMENDATION_WORKER_FACTORY);
  private readonly pending = new Map<number, { request: WorkerRequest; resolve: (response: WorkerResponse) => void }>();
  private worker: Worker | null | undefined;
  private nextId = 0;

  readonly runsInWorker = signal(false);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.worker?.terminate());
  }

  async rankMostWatched(videos: VideoCardData[], limit = 10): Promise<RankedCard[]> {
    const byId = new Map(videos.map(video => [video.id, video]));
    const response = await this.run({ kind: 'most-watched', videos: videos.map(toInput), limit });
    return response.kind === 'most-watched'
      ? response.result.flatMap(item => {
        const video = byId.get(item.id);
        return video ? [{ ...item, video }] : [];
      })
      : [];
  }

  async personalize(videos: VideoCardData[], history: WatchHistoryEntry[], limit = 6): Promise<PersonalCard[]> {
    const byId = new Map(videos.map(video => [video.id, video]));
    const response = await this.run({ kind: 'personalize', videos: videos.map(toInput), history, limit });
    return response.kind === 'personalize'
      ? response.result.flatMap(item => {
        const video = byId.get(item.id);
        return video ? [{ ...item, video }] : [];
      })
      : [];
  }

  private run(request: DistributiveOmit<WorkerRequest, 'id'>): Promise<WorkerResponse> {
    const message = { ...request, id: ++this.nextId } as WorkerRequest;
    const worker = this.ensureWorker();
    if (!worker) {
      return Promise.resolve(handleWorkerRequest(message));
    }
    return new Promise(resolve => {
      this.pending.set(message.id, { request: message, resolve });
      worker.postMessage(message);
    });
  }

  private ensureWorker(): Worker | null {
    if (this.worker !== undefined) {
      return this.worker;
    }
    this.worker = null;
    if (!this.isBrowser) {
      return null;
    }
    try {
      this.worker = this.workerFactory();
    } catch {
      this.worker = null;
    }
    if (this.worker) {
      this.worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
        this.pending.get(data.id)?.resolve(data);
        this.pending.delete(data.id);
      };
      this.worker.onerror = () => this.fallBackToMainThread();
      this.runsInWorker.set(true);
    }
    return this.worker;
  }

  private fallBackToMainThread(): void {
    this.worker?.terminate();
    this.worker = null;
    this.runsInWorker.set(false);
    this.pending.forEach(({ request, resolve }) => resolve(handleWorkerRequest(request)));
    this.pending.clear();
  }
}
