import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ClinicMarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  async searchClinics(params: {
    search?: string;
    specialization?: string;
    country?: string;
    page: number;
    limit: number;
  }) {
    const where: Prisma.ClinicWhereInput = { isPublic: true };

    if (params.country) {
      where.country = params.country;
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

    const [clinics, total] = await Promise.all([
      this.prisma.clinic.findMany({
        where,
        include: {
          _count: { select: { therapists: true } },
        },
        skip,
        take: params.limit,
        orderBy: { rating: 'desc' },
      }),
      this.prisma.clinic.count({ where }),
    ]);

    return {
      clinics,
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit),
    };
  }

  async getClinicWithTherapists(clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      include: {
        therapists: {
          where: { isActive: true, acceptingBookings: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
            sessionTypes: { where: { isActive: true } },
            sessionPricing: true,
          },
        },
      },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    return clinic;
  }
}
