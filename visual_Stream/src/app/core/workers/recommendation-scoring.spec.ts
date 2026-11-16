import { handleWorkerRequest, personalize, rankMostWatched, ScoredVideoInput } from './recommendation-scoring';

const VIDEOS: ScoredVideoInput[] = [
  { id: 'a', title: 'Sintel', category: 'Animación', tags: ['Animación'], viewCount: 600 },
  { id: 'b', title: 'Azotea', category: 'Música', tags: ['Música'], viewCount: 300 },
  { id: 'c', title: 'Raíces', category: 'Documental', tags: ['Documental'], viewCount: 100 },
  { id: 'd', title: 'Nuevo', category: 'Documental', tags: ['Documental'], viewCount: 0 }
];

describe('recommendation scoring', () => {
  it('ranks the most watched videos with their share of views', () => {
    expect(rankMostWatched(VIDEOS, 2)).toEqual([
      { id: 'a', rank: 1, viewCount: 600, share: 60 },
      { id: 'b', rank: 2, viewCount: 300, share: 30 }
    ]);
  });

  it('prefers the categories the viewer watched and skips watched videos', () => {
    const picks = personalize(VIDEOS, [{ id: 'c', category: 'Documentales', watchedAt: 1 }], 3);

    expect(picks[0]).toEqual(expect.objectContaining({ id: 'd', reason: 'Porque viste Documentales' }));
    expect(picks.map(pick => pick.id)).not.toContain('c');
    expect(picks[1].reason).toBe('Popular entre el público de Kino');
  });

  it('returns nothing to personalize without history', () => {
    expect(personalize(VIDEOS, [], 3)).toEqual([]);
  });

  it('answers worker requests with the same id', () => {
    expect(handleWorkerRequest({ id: 7, kind: 'most-watched', videos: VIDEOS, limit: 1 }))
      .toEqual({ id: 7, kind: 'most-watched', result: [{ id: 'a', rank: 1, viewCount: 600, share: 60 }] });
  });
});
