import { TherapistSearchService } from './therapist-search.service';
import { BOOKABLE_THERAPIST_WHERE, normalizeCountry, toPublicTherapist } from '../common/therapist-discovery';

const row = (over: Record<string, any> = {}) => ({
  id: 't1',
  title: 'Speech Therapist',
  specializations: [],
  department: 'speech',
  overallRating: 4,
  country: 'India',
  city: 'Chennai',
  clinic: null,
  sessionTypes: [
    { id: 's1', defaultPrice: 1500, currency: 'INR', modality: 'IN_PERSON' },
    { id: 's2', defaultPrice: 900, currency: 'INR', modality: 'TELEHEALTH' },
  ],
  sessionPricing: [{ sessionTypeId: 's2', price: 1200, currency: 'INR' }],
  user: { id: 'u1', name: 'A', image: null },
  ...over,
});

function setup(user: { country?: string | null; preferredRegion?: string | null } = {}) {
  const prisma: any = {
    user: { findUnique: jest.fn().mockResolvedValue(user) },
    therapistProfile: {
      findMany: jest.fn().mockResolvedValue([row()]),
      count: jest.fn().mockResolvedValue(1),
    },
  };
  const matching: any = {
    resolveNeeds: jest.fn().mockResolvedValue({ source: 'none', childName: null, flaggedDomains: [], concern: null }),
  };
  return { prisma, service: new TherapistSearchService(prisma, matching) };
}

const andOf = (prisma: any) => prisma.therapistProfile.findMany.mock.calls[0][0].where.AND as any[];

describe('TherapistSearchService', () => {
  it('always applies the bookable rule and never selects email', async () => {
    const { prisma, service } = setup();
    await service.search({ id: 'p' }, {});
    expect(andOf(prisma)[0]).toBe(BOOKABLE_THERAPIST_WHERE);
    const select = prisma.therapistProfile.findMany.mock.calls[0][0].select;
    expect(select.user.select.email).toBeUndefined();
    expect(select.emiratesId).toBeUndefined();
    expect(select.phone).toBeUndefined();
  });

  it("defaults to the parent's country and matches stored aliases", async () => {
    const { prisma, service } = setup({ country: null, preferredRegion: 'IN' });
    const res = await service.search({ id: 'p' }, {});
    expect(res.location).toEqual({ country: 'IN', city: null });
    const inIN = { in: ['IN', 'India'], mode: 'insensitive' };
    const geo = andOf(prisma)[1];
    expect(geo.OR[0]).toEqual({ clinic: { is: null }, OR: [{ country: inIN }, { country: null }, { country: '' }] });
    expect(geo.OR[1]).toEqual({ clinic: { OR: [{ country: inIN }, { country: null }, { country: '' }] } });
  });

  it('lists only clinic therapists in clinic-directory markets', async () => {
    const { prisma, service } = setup({ country: 'AE' });
    await service.search({ id: 'p' }, {});
    const inAE = { in: ['AE', 'UAE', 'United Arab Emirates'], mode: 'insensitive' };
    // Clinic therapists only; a clinic with no country recorded yet still counts.
    expect(andOf(prisma)[1]).toEqual({ clinic: { OR: [{ country: inAE }, { country: null }, { country: '' }] } });
  });

  it('a city filter still includes online and not-yet-located therapists', async () => {
    const { prisma, service } = setup({ country: 'IN' });
    await service.search({ id: 'p' }, { city: 'Pune' });
    const cityClause = andOf(prisma)[2];
    expect(cityClause.OR).toHaveLength(5);
    expect(cityClause.OR[1]).toEqual({ clinic: { is: null }, OR: [{ city: null }, { city: '' }] });
    expect(cityClause.OR[4].sessionTypes.some.modality.in).toEqual(['TELEHEALTH', 'HYBRID']);
  });

  it('filters specialization by department, accepting legacy labels', async () => {
    const { prisma, service } = setup({ country: 'IN' });
    await service.search({ id: 'p' }, { specialization: 'Speech Therapy', source: 'independent' });
    const and = andOf(prisma);
    expect(and).toContainEqual({ department: 'speech' });
    expect(and).toContainEqual({ clinic: { is: null } });
  });

  it('applies search and max price on the server', async () => {
    const { prisma, service } = setup({ country: 'IN' });
    await service.search({ id: 'p' }, { search: 'anna', maxPrice: '1000' });
    const and = andOf(prisma);
    expect(and.some((c) => c.OR?.[0]?.user?.name?.contains === 'anna')).toBe(true);
    expect(and.some((c) => c.OR?.[0]?.sessionPricing?.some?.price?.lte === 1000)).toBe(true);
  });
});

describe('toPublicTherapist', () => {
  it('derives location, source, online flag and the lowest effective price', () => {
    const t = toPublicTherapist(row() as any);
    expect(t.location).toEqual({ country: 'IN', city: 'Chennai' });
    expect(t.source).toBe('INDEPENDENT');
    expect(t.offersOnline).toBe(true);
    // s2's therapist price (1200) overrides its default (900); s1 is 1500.
    expect(t.startingPrice).toBe(1200);
  });

  it("uses the clinic's location for clinic therapists", () => {
    const t = toPublicTherapist(row({ clinic: { id: 'c', name: 'C', logoUrl: null, country: 'AE', city: 'Dubai' } }) as any);
    expect(t.location).toEqual({ country: 'AE', city: 'Dubai' });
    expect(t.source).toBe('CLINIC');
  });

  it('normalizes country spellings', () => {
    expect(normalizeCountry('UAE')).toBe('AE');
    expect(normalizeCountry(' india ')).toBe('IN');
    expect(normalizeCountry('France')).toBeNull();
  });
});
