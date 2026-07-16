import { ConcernCoachingService } from '../src/concerns/concern-coaching.service';

/**
 * The coaching FALLBACK — what a nursery gets when no Anthropic key is configured. It must
 * still be humane and, above all, must NEVER diagnose or name a condition. Pure unit test:
 * a ConfigService that returns no key forces the fallback, deterministically.
 */
describe('ConcernCoachingService — no-AI fallback', () => {
  const noKeyConfig = { get: () => undefined } as any;
  const svc = new ConcernCoachingService(noKeyConfig);

  const input = {
    childFirstName: 'Mira',
    facilityName: 'Willow Nursery',
    domains: ['speechLanguage', 'socialEmotional'],
    concernNotes: ['Still mostly single words.', 'Plays alongside but rarely with other children.'],
    screeningFlags: ['speechLanguage'],
    concordanceNote: 'home and nursery screenings both flagged speechLanguage',
  };

  it('falls back (model = "fallback") and returns both parts', async () => {
    const out = await svc.coach(input);
    expect(out.model).toBe('fallback');
    expect(out.staffCoaching.length).toBeGreaterThan(50);
    expect(out.parentSummary.length).toBeGreaterThan(50);
    expect(out.staffCoaching).not.toEqual(out.parentSummary);
  });

  it('NEVER names or hints at a condition, in either part', async () => {
    const out = await svc.coach(input);
    const banned = /\b(autism|autistic|adhd|asd|dyslexi|dyspraxi|disorder|diagnos|delayed?|deficit|syndrome|special needs)\b/i;
    expect(banned.test(out.staffCoaching)).toBe(false);
    expect(banned.test(out.parentSummary)).toBe(false);
  });

  it('the parent message is addressed to the parent, by the child’s name, in human terms', async () => {
    const out = await svc.coach(input);
    expect(out.parentSummary).toContain('Mira');
    // Human phrasing for the domains, not the raw ids.
    expect(out.parentSummary).toMatch(/talking|understand|playing|getting on/i);
    expect(out.parentSummary).not.toContain('speechLanguage');
  });

  it('the staff coaching says lead-with-specifics and do-not-diagnose', async () => {
    const out = await svc.coach(input);
    expect(out.staffCoaching).toMatch(/specific|example|noticed/i);
    expect(out.staffCoaching).toMatch(/not.*diagnos|condition/i);
  });

  it('handles a bare concern (no notes, no screening) without breaking', async () => {
    const out = await svc.coach({
      childFirstName: 'Sam',
      facilityName: 'Willow Nursery',
      domains: [],
      concernNotes: [],
      screeningFlags: [],
    });
    expect(out.parentSummary).toContain('Sam');
    expect(out.staffCoaching.length).toBeGreaterThan(50);
  });
});
