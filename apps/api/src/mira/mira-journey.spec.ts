import {
  matchSavedItem,
  parseLogRequest,
  parseResourceRequest,
  rankForRequest,
  resolveLogDate,
  titleScore,
} from './mira-journey';

describe('Mira journey requests', () => {
  it('keeps only real area keys and drops empty requests', () => {
    expect(parseResourceRequest({ areas: ['sensory', 'visionHearing', 'made-up'], query: ' loud noise ' })).toEqual({
      areas: ['sensory'],
      query: 'loud noise',
    });
    expect(parseResourceRequest({ areas: [], query: '' })).toBeNull();
    expect(parseResourceRequest(null)).toBeNull();
  });

  it('leaves unknown help / engagement blank instead of guessing', () => {
    expect(parseLogRequest({ resourceHint: 'calm corner', help: 2, engagement: 'loved' })).toEqual({
      resourceHint: 'calm corner',
      help: 2,
      engagement: null,
      date: null,
    });
    expect(parseLogRequest({ resourceHint: '  ' })).toBeNull();
  });

  it('resolves dates, never into the future', () => {
    const today = new Date('2026-10-07T09:00:00Z');
    expect(resolveLogDate('today', today)).toBe('2026-10-07T12:00:00.000Z');
    expect(resolveLogDate('yesterday', today)).toBe('2026-10-06T12:00:00.000Z');
    expect(resolveLogDate('2026-10-01', today)).toBe('2026-10-01T12:00:00.000Z');
    expect(resolveLogDate('2026-12-25', today)).toBe('2026-10-07T12:00:00.000Z');
    expect(resolveLogDate('last tuesday', today)).toBe('2026-10-07T12:00:00.000Z');
  });
});

describe('matching a described activity to a saved item', () => {
  const saved = [
    { title: 'Calm-Down Corner Setup' },
    { title: 'Now & Next: Tidy Up (Part 1)' },
    { title: 'Now & Next: Tidy Up (Part 2)' },
    { title: 'Feelings Cards' },
  ];

  it('matches a confident hint', () => {
    expect(matchSavedItem('the calm corner', saved)?.title).toBe('Calm-Down Corner Setup');
    expect(matchSavedItem('feelings cards', saved)?.title).toBe('Feelings Cards');
  });

  it('returns null when two items tie, so the parent picks', () => {
    expect(matchSavedItem('tidy up', saved)).toBeNull();
  });

  it('returns null when nothing fits', () => {
    expect(matchSavedItem('swimming lesson', saved)).toBeNull();
    expect(titleScore('', 'anything')).toBe(0);
  });
});

describe('ranking library cards for a request', () => {
  const cards = [
    { title: 'Noise-Busting Toolkit', practises: 'Coping with loud places', domains: ['sensory'] },
    { title: 'Messy Play Sensory Bins', practises: 'Tolerating new textures', domains: ['sensory'] },
    { title: 'Feelings Cards', practises: 'Naming emotions', domains: ['social'] },
  ];

  it('keeps the requested areas and puts keyword hits first', () => {
    const out = rankForRequest({ areas: ['sensory'], query: 'loud noise' }, cards);
    expect(out.map((c) => c.title)).toEqual(['Noise-Busting Toolkit', 'Messy Play Sensory Bins']);
  });

  it('with no areas, needs a keyword hit — never pads with unrelated resources', () => {
    expect(rankForRequest({ areas: [], query: 'emotions' }, cards).map((c) => c.title)).toEqual(['Feelings Cards']);
    expect(rankForRequest({ areas: [], query: 'swimming' }, cards)).toEqual([]);
  });
});
