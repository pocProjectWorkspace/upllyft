import {
  ageInYears,
  concernAreas,
  engagementFromLegacy,
  fitsAge,
  helpFromLegacy,
  itemStatus,
  libraryCardType,
  screeningLevels,
  weeklyIndependence,
  worksheetAreas,
} from './journey.logic';
import { domainFromScreening, domainFromWorksheet, parseDomains, worksheetDomainFor } from './domains';

const d = (s: string) => new Date(s + 'T12:00:00Z');
const log = (date: string, help: number, engagement = 1) => ({ date: d(date), help, engagement });

describe('area vocabulary', () => {
  it('maps worksheet and screening values both ways', () => {
    expect(domainFromWorksheet('SELF_CARE')).toBe('daily');
    expect(domainFromWorksheet('COGNITIVE')).toBe('learn');
    expect(worksheetDomainFor('comm')).toBe('COMMUNICATION');
    expect(worksheetDomainFor('behav')).toBeNull();
    expect(domainFromScreening('speechLanguage')).toBe('comm');
    expect(domainFromScreening('sensoryProcessing')).toBe('sensory');
  });

  it('maps vision & hearing to no area', () => {
    expect(domainFromScreening('visionHearing')).toBeNull();
  });

  it('parses and orders area lists, dropping unknowns', () => {
    expect(parseDomains('sensory, comm,bogus,comm')).toEqual(['comm', 'sensory']);
    expect(parseDomains(['behav', 'fine'])).toEqual(['fine', 'behav']);
    expect(parseDomains(undefined)).toEqual([]);
  });

  it('reads worksheet targetDomains in either vocabulary', () => {
    expect(worksheetAreas(['FINE_MOTOR', 'sensory', 'NOPE'])).toEqual(['fine', 'sensory']);
  });
});

describe('itemStatus', () => {
  it('To try with no logs', () => {
    expect(itemStatus([])).toBe('To try');
  });
  it('Practising after one try, or when the latest needed full help', () => {
    expect(itemStatus([log('2026-09-01', 2)])).toBe('Practising');
    expect(itemStatus([log('2026-09-01', 1), log('2026-09-08', 0)])).toBe('Practising');
  });
  it('Getting there with two or more tries and the latest needing at most some help', () => {
    expect(itemStatus([log('2026-09-08', 1), log('2026-09-01', 0)])).toBe('Getting there');
  });
  it('Mastered after three "did it alone" in any order', () => {
    expect(itemStatus([log('2026-09-03', 2), log('2026-09-01', 2), log('2026-09-09', 0), log('2026-09-02', 2)])).toBe('Mastered');
  });
  it('the parent override wins both ways', () => {
    expect(itemStatus([], true)).toBe('Mastered');
    expect(itemStatus([log('2026-09-01', 2), log('2026-09-02', 2), log('2026-09-03', 2)], false)).toBe('Getting there');
  });
});

describe('age', () => {
  it('computes whole years around the birthday', () => {
    expect(ageInYears(d('2020-10-10'), d('2026-10-09'))).toBe(5);
    expect(ageInYears(d('2020-10-10'), d('2026-10-10'))).toBe(6);
    expect(ageInYears(null)).toBeNull();
  });
  it('never excludes on unknown bounds or age', () => {
    expect(fitsAge(6, 3, 8)).toBe(true);
    expect(fitsAge(9, 3, 8)).toBe(false);
    expect(fitsAge(2, 3, null)).toBe(false);
    expect(fitsAge(null, 3, 8)).toBe(true);
    expect(fitsAge(6, null, null)).toBe(true);
  });
});

describe('screeningLevels', () => {
  it('reads the keyed domainScores object and flagged domains', () => {
    const levels = screeningLevels(
      {
        speechLanguage: { status: 'RED' },
        socialEmotional: { status: 'YELLOW' },
        grossMotor: { status: 'GREEN' },
        visionHearing: { status: 'RED' },
      },
      ['sensoryProcessing'],
    );
    expect(levels).toEqual({ comm: 'focus', social: 'watch', gross: 'ontrack', sensory: 'focus' });
    expect(concernAreas(levels)).toEqual(['comm', 'sensory', 'social']);
  });

  it('reads an array and tolerates null scores', () => {
    expect(screeningLevels([{ domainId: 'fineMotor', status: 'yellow' }], [])).toEqual({ fine: 'watch' });
    expect(screeningLevels(null, ['adaptiveSelfCare'])).toEqual({ daily: 'focus' });
  });
});

describe('legacy completion mapping (matches the migration backfill)', () => {
  it('maps help levels', () => {
    expect(helpFromLegacy('NONE')).toBe(2);
    expect(helpFromLegacy('MINIMAL')).toBe(1);
    expect(helpFromLegacy('MODERATE')).toBe(1);
    expect(helpFromLegacy('SIGNIFICANT')).toBe(0);
    expect(helpFromLegacy(null)).toBe(1);
  });
  it('folds 1–5 engagement into 0–2', () => {
    expect([1, 2, 3, 4, 5, null].map(engagementFromLegacy)).toEqual([0, 0, 1, 2, 2, 1]);
  });
});

describe('card types', () => {
  it('maps library resource types and the social-story tag', () => {
    expect(libraryCardType('VIDEO')).toBe('Video');
    expect(libraryCardType('TEMPLATE')).toBe('Printable');
    expect(libraryCardType('ARTICLE')).toBe('Guide');
    expect(libraryCardType('GUIDE', ['Social Story'])).toBe('Social story');
  });
});

describe('weeklyIndependence', () => {
  it('keeps the best help per area per week over 8 weeks, oldest first', () => {
    const today = d('2026-10-07'); // a Wednesday
    const rows = weeklyIndependence(
      [
        { ...log('2026-10-06', 1), domain: 'comm' },
        { ...log('2026-10-05', 2), domain: 'comm' },
        { ...log('2026-09-29', 0), domain: 'comm' },
        { ...log('2026-07-01', 2), domain: 'comm' }, // outside the window
        { ...log('2026-10-06', 1), domain: null },
      ],
      today,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].domain).toBe('comm');
    expect(rows[0].weeks).toHaveLength(8);
    expect(rows[0].weeks[7]).toBe(2);
    expect(rows[0].weeks[6]).toBe(0);
    expect(rows[0].weeks.slice(0, 6).every((w) => w === null)).toBe(true);
  });
});
