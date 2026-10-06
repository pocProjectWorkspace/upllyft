import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MatchingService } from '../matching/matching.service';
import { classifyDiscipline, departmentForFilter, matchTherapist, tierRank } from '../matching/matching.util';
import {
  BOOKABLE_THERAPIST_WHERE,
  CLINIC_DIRECTORY_COUNTRIES,
  PUBLIC_THERAPIST_SELECT,
  REMOTE_MODALITIES,
  countryAliases,
  normalizeCountry,
  toPublicTherapist,
} from '../common/therapist-discovery';

export interface TherapistSearchQuery {
  search?: string;
  specialization?: string;
  language?: string;
  minRating?: string;
  maxPrice?: string;
  /** ISO code; defaults to the parent's own country / chosen region. */
  country?: string;
  city?: string;
  /** 'independent' | 'clinic' */
  source?: string;
  childId?: string;
  concern?: string;
  page?: string;
  limit?: string;
}

@Injectable()
export class TherapistSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matchingService: MatchingService,
  ) {}

  /**
   * Parent-facing therapist search. Only bookable therapists (BOOKABLE_THERAPIST_WHERE),
   * in the parent's country, optionally narrowed to a city — therapists offering online
   * sessions, or whose city is not recorded yet, still show for every city in their country.
   *
   * With `childId` (guardian-only) or `concern`, each result carries a
   * `match: { tier, reason }` and fit-sorting puts strong fits first.
   */
  async search(actor: { id: string }, q: TherapistSearchQuery) {
    const pageNum = Math.max(1, parseInt(q.page ?? '1') || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(q.limit ?? '20') || 20));
    const skip = (pageNum - 1) * limitNum;

    const country = normalizeCountry(q.country) ?? (await this.actorCountry(actor.id));
    const city = q.city?.trim() || null;

    const and: Prisma.TherapistProfileWhereInput[] = [BOOKABLE_THERAPIST_WHERE];

    if (country) {
      const inCountry = { in: countryAliases(country), mode: 'insensitive' as const };
      and.push(
        CLINIC_DIRECTORY_COUNTRIES.has(country)
          ? { clinic: { country: inCountry } }
          : { OR: [{ clinic: { is: null }, country: inCountry }, { clinic: { country: inCountry } }] },
      );
    }

    if (city) {
      // An unknown city is not a different city: until a clinic or therapist fills it
      // in, keep them visible rather than hide them behind missing data.
      const sameCity = { equals: city, mode: 'insensitive' as const };
      and.push({
        OR: [
          { clinic: { is: null }, city: sameCity },
          { clinic: { is: null }, OR: [{ city: null }, { city: '' }] },
          { clinic: { city: sameCity } },
          { clinic: { OR: [{ city: null }, { city: '' }] } },
          { sessionTypes: { some: { isActive: true, modality: { in: [...REMOTE_MODALITIES] } } } },
        ],
      });
    }

    if (q.source === 'independent') and.push({ clinic: { is: null } });
    if (q.source === 'clinic') and.push({ clinic: { isNot: null } });

    if (q.specialization) {
      const department = departmentForFilter(q.specialization);
      and.push(department ? { department } : { specializations: { has: q.specialization } });
    }

    if (q.language) and.push({ languages: { has: q.language } });

    const minRating = parseFloat(q.minRating ?? '');
    if (minRating > 0) and.push({ overallRating: { gte: minRating } });

    const maxPrice = parseFloat(q.maxPrice ?? '');
    if (maxPrice > 0) {
      and.push({
        OR: [
          { sessionPricing: { some: { isActive: true, price: { lte: maxPrice } } } },
          { sessionTypes: { some: { isActive: true, defaultPrice: { lte: maxPrice } } } },
        ],
      });
    }

    const search = q.search?.trim();
    if (search) {
      const contains = { contains: search, mode: 'insensitive' as const };
      const department = departmentForFilter(search);
      and.push({
        OR: [
          { user: { name: contains } },
          { title: contains },
          { bio: contains },
          { clinic: { name: contains } },
          { specializations: { has: search } },
          ...(department ? [{ department }] : []),
        ],
      });
    }

    const where: Prisma.TherapistProfileWhereInput = { AND: and };

    const needs = await this.matchingService.resolveNeeds(actor, q.childId, q.concern);
    const fitMode = needs.source !== 'none';

    const [therapists, total] = await Promise.all([
      this.prisma.therapistProfile.findMany({
        where,
        select: PUBLIC_THERAPIST_SELECT,
        // Fit mode ranks tier-first across the whole result set, so tier must be
        // computed before pagination; cap the candidate set and sort in memory.
        ...(fitMode ? { skip: 0, take: 200 } : { skip, take: limitNum }),
        orderBy: [{ overallRating: 'desc' }, { totalRatings: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.therapistProfile.count({ where }),
    ]);

    const withMatch = therapists.map((t) => ({
      ...toPublicTherapist(t),
      match: matchTherapist(classifyDiscipline(t.title, t.specializations, t.department), needs),
    }));

    const results = fitMode
      ? withMatch
          .sort((a, b) => tierRank(a.match.tier) - tierRank(b.match.tier) || (b.overallRating ?? 0) - (a.overallRating ?? 0))
          .slice(skip, skip + limitNum)
      : withMatch;

    return {
      therapists: results,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      location: { country, city },
      needs: { source: needs.source, flaggedDomains: needs.flaggedDomains, concern: needs.concern },
    };
  }

  private async actorCountry(userId: string): Promise<string | null> {
    const me = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { country: true, preferredRegion: true },
    });
    return normalizeCountry(me?.country) ?? normalizeCountry(me?.preferredRegion);
  }
}
