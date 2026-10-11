import { FAQ_SEED } from './faq-seed';
import { FAQ_AUDIENCES, FaqService, toSlug } from './faq.service';

describe('FAQ seed', () => {
  const items = FAQ_SEED.flatMap((c) => c.items);

  it('has unique, URL-safe slugs for categories and items', () => {
    const slugs = [...FAQ_SEED.map((c) => c.slug), ...items.map((i) => i.slug)];
    expect(new Set(FAQ_SEED.map((c) => c.slug)).size).toBe(FAQ_SEED.length);
    expect(new Set(items.map((i) => i.slug)).size).toBe(items.length);
    for (const slug of slugs) expect(toSlug(slug)).toBe(slug);
  });

  it('keeps every answer with a [placeholder] unpublished', () => {
    for (const item of items) expect(item.published).toBe(!item.answer.includes('['));
  });

  it('uses known audiences and keeps the anchors the app links to', () => {
    for (const c of FAQ_SEED) expect(FAQ_AUDIENCES).toContain(c.audience);
    const published = new Set(items.filter((i) => i.published).map((i) => i.slug));
    for (const anchor of ['booking-coming-soon', 'directory-listing', 'verified-tick']) {
      expect(published.has(anchor)).toBe(true);
    }
  });
});

describe('toSlug', () => {
  it('lower-cases, hyphenates and trims', () => {
    expect(toSlug('  What is a "Directory listing"? ')).toBe('what-is-a-directory-listing');
    expect(toSlug('a'.repeat(80))).toHaveLength(60);
  });
});

describe('FaqService.listPublished', () => {
  it('asks only for published items and drops categories left empty', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { slug: 'a', name: 'A', audience: 'PARENT', items: [{ slug: 'q', question: 'Q', answer: 'A' }] },
      { slug: 'b', name: 'B', audience: 'ALL', items: [] },
    ]);
    const service = new FaqService({ faqCategory: { findMany } } as any);

    const result = await service.listPublished();

    expect(result.map((c) => c.slug)).toEqual(['a']);
    expect(findMany.mock.calls[0][0].select.items.where).toEqual({ published: true });
  });
});
