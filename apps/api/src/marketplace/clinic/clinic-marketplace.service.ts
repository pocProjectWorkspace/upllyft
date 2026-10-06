import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  classifyClinicDisciplines,
  matchClinic,
  tierRank,
  type ChildNeeds,
} from '../matching/matching.util';
import {
  BOOKABLE_THERAPIST_WHERE,
  PUBLIC_CLINIC_WHERE,
  countryAliases,
  normalizeCountry,
  PUBLIC_THERAPIST_SELECT,
  toPublicTherapist,
} from '../common/therapist-discovery';

export { PUBLIC_CLINIC_WHERE };


@Injectable()
export class ClinicMarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  async searchClinics(
    params: {
      search?: string;
      specialization?: string;
      country?: string;
      city?: string;
      page: number;
      limit: number;
    },
    needs?: ChildNeeds,
  ) {
    const where: Prisma.ClinicWhereInput = { ...PUBLIC_CLINIC_WHERE };

    const country = normalizeCountry(params.country);
    // A clinic that has not recorded its country yet stays listed rather than vanishing.
    if (country) {
      where.AND = [
        { OR: [{ country: { in: countryAliases(country), mode: 'insensitive' } }, { country: null }, { country: '' }] },
      ];
    }

    if (params.city?.trim()) {
      where.city = { equals: params.city.trim(), mode: 'insensitive' };
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.specialization) {
      where.specializations = { has: params.specialization };
    }

    const skip = (params.page - 1) * params.limit;
    const fitMode = !!needs && needs.source !== 'none';

    const [clinics, total] = await Promise.all([
      this.prisma.clinic.findMany({
        where,
        include: {
          _count: { select: { therapists: { where: BOOKABLE_THERAPIST_WHERE } } },
        },
        // In fit mode tier-first ranking spans the whole result set, so the page window
        // is applied after the in-memory sort (clinic counts are small).
        ...(fitMode ? {} : { skip, take: params.limit }),
        orderBy: { rating: 'desc' },
      }),
      this.prisma.clinic.count({ where }),
    ]);

    const withMatch = clinics.map((c) => ({
      ...c,
      match: needs ? matchClinic(classifyClinicDisciplines(c.specializations), needs) : undefined,
    }));

    const results = fitMode
      ? withMatch
          .sort(
            (a, b) =>
              tierRank(a.match!.tier) - tierRank(b.match!.tier) ||
              (b.rating ?? 0) - (a.rating ?? 0),
          )
          .slice(skip, skip + params.limit)
      : withMatch;

    return {
      clinics: results,
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit),
      needs: needs
        ? { source: needs.source, flaggedDomains: needs.flaggedDomains, concern: needs.concern }
        : undefined,
    };
  }

  async getClinicWithTherapists(clinicId: string) {
    // findFirst so the visibility rule applies: an unlisted clinic 404s exactly as
    // it is absent from search.
    const clinic = await this.prisma.clinic.findFirst({
      where: { id: clinicId, ...PUBLIC_CLINIC_WHERE },
      include: {
        therapists: {
          where: BOOKABLE_THERAPIST_WHERE,
          select: PUBLIC_THERAPIST_SELECT,
        },
      },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    return { ...clinic, therapists: clinic.therapists.map(toPublicTherapist) };
  }
}
