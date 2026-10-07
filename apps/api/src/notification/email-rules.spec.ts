import { absoluteLink, digestDue, emailDecision, emailPrefsFrom } from './email-rules';

const prefs = (over: Partial<ReturnType<typeof emailPrefsFrom>> = {}) => ({ ...emailPrefsFrom(null), ...over });

describe('emailDecision', () => {
  it('defaults: daily digest, urgent/high now', () => {
    expect(emailDecision({ type: 'COMMENT' }, prefs())).toBe('digest');
    expect(emailDecision({ type: 'SESSION_REMINDER', priority: 'high' }, prefs())).toBe('now');
    expect(emailDecision({ type: 'ADMIN_ALERT', priority: 'urgent' }, prefs())).toBe('now');
  });

  it('instant emails every allowed notification', () => {
    expect(emailDecision({ type: 'COMMENT', priority: 'low' }, prefs({ frequency: 'instant' }))).toBe('now');
  });

  it('never and the master switch stop everything except security / crisis', () => {
    expect(emailDecision({ type: 'SESSION_REMINDER', priority: 'high' }, prefs({ frequency: 'never' }))).toBe('skip');
    expect(emailDecision({ type: 'COMMENT' }, prefs({ enabled: false }))).toBe('skip');
    expect(emailDecision({ type: 'SECURITY_ALERT' }, prefs({ enabled: false, frequency: 'never' }))).toBe('now');
    expect(emailDecision({ type: 'CRISIS_ALERT' }, prefs({ frequency: 'never' }))).toBe('now');
  });

  it('a category switched off skips its types only', () => {
    const p = prefs({ categories: { communityReplies: false } });
    expect(emailDecision({ type: 'REPLY', priority: 'high' }, p)).toBe('skip');
    expect(emailDecision({ type: 'WORKSHEET_ASSIGNED', priority: 'high' }, p)).toBe('now');
  });

  it('likes, follows and votes stay in-app', () => {
    expect(emailDecision({ type: 'LIKE', priority: 'urgent' }, prefs({ frequency: 'instant' }))).toBe('skip');
    expect(emailDecision({ type: 'FOLLOW' }, prefs())).toBe('skip');
  });
});

describe('emailPrefsFrom', () => {
  it('reads columns and per-category JSON, defaulting sensibly', () => {
    expect(emailPrefsFrom(null)).toEqual({ enabled: true, frequency: 'daily', categories: {} });
    expect(
      emailPrefsFrom({
        emailNotifications: true,
        notificationFrequency: 'weekly',
        notificationPrefs: { communityReplies: false, junk: 1 },
      }),
    ).toEqual({ enabled: true, frequency: 'weekly', categories: { communityReplies: false } });
    expect(emailPrefsFrom({ notificationFrequency: 'hourly' }).frequency).toBe('daily');
    expect(emailPrefsFrom({ emailEnabled: false }).enabled).toBe(false);
  });
});

describe('digests and links', () => {
  it('weekly digests only go on Mondays', () => {
    expect(digestDue('daily', new Date('2026-10-07T03:00:00Z'))).toBe(true);
    expect(digestDue('weekly', new Date('2026-10-07T03:00:00Z'))).toBe(false); // Wednesday
    expect(digestDue('weekly', new Date('2026-10-05T03:00:00Z'))).toBe(true); // Monday
    expect(digestDue('never')).toBe(false);
  });

  it('makes action links absolute', () => {
    expect(absoluteLink('https://app.example.com/', '/resources?tab=mine')).toBe('https://app.example.com/resources?tab=mine');
    expect(absoluteLink('https://app.example.com', 'resources')).toBe('https://app.example.com/resources');
    expect(absoluteLink('https://app.example.com', 'https://other.example.com/x')).toBe('https://other.example.com/x');
    expect(absoluteLink('https://app.example.com', null)).toBe('https://app.example.com/notifications');
  });
});
