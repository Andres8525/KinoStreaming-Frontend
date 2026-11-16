import { TestBed } from '@angular/core/testing';
import { VideoCardData } from '../videos/video.models';
import { handleWorkerRequest, WorkerRequest } from './recommendation-scoring';
import { RECOMMENDATION_WORKER_FACTORY, RecommendationEngineService } from './recommendation-engine.service';
import { WATCH_HISTORY_KEY, WatchHistoryService } from './watch-history.service';

class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  readonly posted: WorkerRequest[] = [];
  terminated = false;

  postMessage(request: WorkerRequest): void {
    this.posted.push(request);
    queueMicrotask(() => this.onmessage?.({ data: handleWorkerRequest(request) } as MessageEvent));
  }

  terminate(): void {
    this.terminated = true;
  }
}

function card(id: string, category: string, viewCount: number): VideoCardData {
  return {
    id, title: `Video ${id}`, description: '', videoUrl: '', creator: 'Ana', creatorAvatar: '', thumbnail: '',
    views: String(viewCount), viewCount, duration: '', category, timeAgo: '', tags: [category], accessPrice: 0,
    suggestedDonation: null
  };
}

const CATALOG = [card('a', 'Música', 900), card('b', 'Documental', 50), card('c', 'Documental', 20)];

describe('RecommendationEngineService', () => {
  afterEach(() => localStorage.removeItem(WATCH_HISTORY_KEY));

  it('ranks videos inside the web worker when the browser supports it', async () => {
    const worker = new FakeWorker();
    TestBed.configureTestingModule({
      providers: [{ provide: RECOMMENDATION_WORKER_FACTORY, useValue: () => worker as unknown as Worker }]
    });
    const engine = TestBed.inject(RecommendationEngineService);

    const ranking = await engine.rankMostWatched(CATALOG, 2);

    expect(worker.posted[0].kind).toBe('most-watched');
    expect(engine.runsInWorker()).toBe(true);
    expect(ranking.map(item => item.video.id)).toEqual(['a', 'b']);
    expect(ranking[0].share).toBe(92.8);
  });

  it('computes on the main thread when workers are not available', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: RECOMMENDATION_WORKER_FACTORY, useValue: () => null }] });
    const engine = TestBed.inject(RecommendationEngineService);

    const picks = await engine.personalize(CATALOG, [{ id: 'b', category: 'Documental', watchedAt: 1 }]);

    expect(engine.runsInWorker()).toBe(false);
    expect(picks[0].video.id).toBe('c');
    expect(picks[0].reason).toBe('Porque viste Documental');
  });

  it('remembers the latest watched videos in this browser', () => {
    TestBed.configureTestingModule({});
    const history = TestBed.inject(WatchHistoryService);

    history.record(CATALOG[1]);
    history.record(CATALOG[0]);
    history.record(CATALOG[1]);

    expect(history.entries().map(entry => entry.id)).toEqual(['a', 'b']);
    localStorage.setItem(WATCH_HISTORY_KEY, 'no es json');
    expect(history.entries()).toEqual([]);
  });
});
