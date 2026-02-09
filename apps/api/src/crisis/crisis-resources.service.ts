// apps/api/src/crisis/crisis-resources.service.ts

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  CreateCrisisResourceDto, 
  GetResourcesQueryDto,
} from './dto';
import { CrisisType, CrisisResource } from './crisis.types';

@Injectable()
export class CrisisResourcesService {
  private readonly logger = new Logger(CrisisResourcesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new crisis resource
   */
  async createResource(dto: CreateCrisisResourceDto) {
    return this.prisma.crisisResource.create({
      data: {
        ...dto,
        isVerified: false,
        isActive: true,
      },
    });
  }

  /**
   * Get resources for a specific crisis type and location
   */
  async getResourcesForCrisis(
    type: CrisisType,
    location?: string,
    language?: string,
    limit: number = 5
  ) {
    const where: any = {
      isActive: true,
      category: {
        has: type,
      },
    };

    // Parse location to extract state/city if provided
    if (location) {
      const [city, state] = location.split(',').map(s => s.trim());
      if (state) {
        where.OR = [
          { state: { contains: state, mode: 'insensitive' } },
          { country: 'IN', state: null }, // National resources
        ];
      }
      if (city) {
        where.OR = [
          { city: { contains: city, mode: 'insensitive' } },
          { state: { contains: state || city, mode: 'insensitive' } },
          { country: 'IN', state: null }, // National resources
        ];
      }
    }

    // Filter by language if specified
    if (language) {
      where.languages = {
        has: language,
      };
    }

    const resources = await this.prisma.crisisResource.findMany({
      where,
      orderBy: [
        { priority: 'asc' },
        { isVerified: 'desc' },
        { available24x7: 'desc' },
        { usageCount: 'desc' },
      ],
      take: limit,
    });

    // If no local resources found, get national resources
    if (resources.length === 0) {
      return this.getNationalResources(type, limit);
    }

    // Increment usage count for analytics
    await this.incrementUsageCount(resources.map(r => r.id));

    return resources;
  }

  /**
   * Get national-level resources (fallback)
   */
  async getNationalResources(type?: CrisisType, limit: number = 5) {
    const where: any = {
      isActive: true,
      country: 'IN',
      state: null, // National level resources
      isVerified: true,
    };

    if (type) {
      where.category = {
        has: type,
      };
    }

    return this.prisma.crisisResource.findMany({
      where,
      orderBy: [
        { priority: 'asc' },
        { available24x7: 'desc' },
      ],
      take: limit,
    });
  }

  /**
   * Search resources with filters
   */
  async searchResources(query: GetResourcesQueryDto) {
    const where: any = {
      isActive: true,
    };

    if (query.type) {
      where.category = {
        has: query.type,
      };
    }

    if (query.state) {
      where.state = {
        contains: query.state,
        mode: 'insensitive',
      };
    }

    if (query.city) {
      where.city = {
        contains: query.city,
        mode: 'insensitive',
      };
    }

    if (query.language) {
      where.languages = {
        has: query.language,
      };
    }

    if (query.available24x7 !== undefined) {
      where.available24x7 = query.available24x7;
    }

    return this.prisma.crisisResource.findMany({
      where,
      orderBy: [
        { priority: 'asc' },
        { isVerified: 'desc' },
        { avgRating: 'desc' },
      ],
    });
  }

  /**
   * Get a single resource by ID
   */
  async getResourceById(id: string) {
    const resource = await this.prisma.crisisResource.findUnique({
      where: { id },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    return resource;
  }

  /**
   * Update resource information
   */
  async updateResource(id: string, dto: Partial<CreateCrisisResourceDto>) {
    return this.prisma.crisisResource.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Verify a resource (admin only)
   */
  async verifyResource(id: string, verifiedBy: string) {
    return this.prisma.crisisResource.update({
      where: { id },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
      },
    });
  }

  /**
   * Deactivate a resource
   */
  async deactivateResource(id: string) {
    return this.prisma.crisisResource.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Get emergency contacts for immediate display
   */
  async getEmergencyContacts() {
    return {
      ambulance: {
        name: 'National Emergency Ambulance',
        number: '102',
        alternateNumber: '108',
        available24x7: true,
      },
      police: {
        name: 'Police',
        number: '100',
        womenHelpline: '1091',
        available24x7: true,
      },
      childHelpline: {
        name: 'CHILDLINE India',
        number: '1098',
        available24x7: true,
      },
      mentalHealth: {
        name: 'KIRAN Mental Health Helpline',
        number: '1800-599-0019',
        available24x7: true,
        languages: ['Hindi', 'English', 'Tamil', 'Telugu', 'Marathi'],
      },
    };
  }

  /**
   * Increment usage count for analytics
   */
  private async incrementUsageCount(resourceIds: string[]) {
    try {
      await this.prisma.$transaction(
        resourceIds.map(id =>
          this.prisma.crisisResource.update({
            where: { id },
            data: {
              usageCount: {
                increment: 1,
              },
            },
          })
        )
      );
    } catch (error) {
      this.logger.error('Failed to increment usage count', error);
    }
  }

  /**
   * Get resource statistics (for admin dashboard)
   */
  async getResourceStats() {
    const [total, verified, active, byType, byState] = await Promise.all([
      this.prisma.crisisResource.count(),
      this.prisma.crisisResource.count({ where: { isVerified: true } }),
      this.prisma.crisisResource.count({ where: { isActive: true } }),
      this.prisma.crisisResource.groupBy({
        by: ['type'],
        _count: true,
      }),
      this.prisma.crisisResource.groupBy({
        by: ['state'],
        _count: true,
        where: {
          state: { not: null },
        },
      }),
    ]);

    return {
      total,
      verified,
      active,
      inactive: total - active,
      byType: byType.map(t => ({ type: t.type, count: t._count })),
      byState: byState.map(s => ({ state: s.state, count: s._count })),
    };
  }

  /**
   * Bulk import resources (for seeding/admin)
   */
  async bulkImportResources(resources: CreateCrisisResourceDto[]) {
    return this.prisma.crisisResource.createMany({
      data: resources.map(r => ({
        ...r,
        isVerified: true,
        isActive: true,
      })),
      skipDuplicates: true,
    });
  }
}