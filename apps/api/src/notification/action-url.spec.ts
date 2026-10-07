import { hubActionUrl, notificationLink } from './action-url';

describe('hubActionUrl', () => {
  it.each([
    // the reported 404
    ['/patients', '/clinic/patients'],
    ['/patients?status=INTAKE', '/clinic/patients?status=INTAKE'],
    ['/patients/p1', '/clinic/patients/p1'],
    // community
    ['/posts/p1', '/community/posts/p1'],
    ['/posts/p1#comment-c1', '/community/posts/p1#comment-c1'],
    ['/questions/q1#answer-a1', '/community/questions/q1#answer-a1'],
    ['/events', '/community/events'],
    ['/events/e1', '/community/events/e1'],
    ['/community/c1', '/community/communities/c1'],
    // booking
    ['/bookings/b1', '/booking/bookings/b1'],
    ['/invoices', '/booking/invoices'],
    // screening, resources, messages, settings
    ['/shared?assessment=a1', '/screening/shared?assessment=a1'],
    ['/resources/worksheets/assignments/w1', '/resources/assignments'],
    ['/messages/conv1', '/messages?c=conv1'],
    ['/settings/security', '/settings?tab=account'],
    ['/settings/verification', '/profile'],
  ])('%s → %s', (from, to) => {
    expect(hubActionUrl(from)).toBe(to);
  });

  it.each([
    '/cases/c1',
    '/consent/k1',
    '/resources?tab=mine',
    '/resources/shared?share=s1',
    '/booking/find-care',
    '/profile/u1',
    '/community/posts/p1',
    '/community/communities/c1',
    '/community/events/e1',
    '/clinic/patients',
    'https://example.com/x',
  ])('leaves hub links alone: %s', (url) => {
    expect(hubActionUrl(url)).toBe(url);
  });

  it('handles empty links', () => {
    expect(hubActionUrl(null)).toBeNull();
    expect(hubActionUrl('')).toBeNull();
  });
});

describe('notificationLink', () => {
  it('rewrites stored links', () => {
    expect(notificationLink({ actionUrl: '/patients', type: 'CASE_CREATED' })).toBe('/clinic/patients');
  });
  it('links Q&A notifications stored without a link to their question', () => {
    expect(notificationLink({ actionUrl: null, type: 'NEW_ANSWER', relatedPostId: 'q1' })).toBe('/community/questions/q1');
    expect(notificationLink({ actionUrl: null, type: 'LIKE', relatedPostId: 'p1' })).toBeNull();
  });
});
