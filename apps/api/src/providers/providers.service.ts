// src/providers/providers.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  CreateProviderDto, 
  UpdateProviderDto, 
  ProviderFiltersDto,
  ProviderSortBy 
} from './dto/provider.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProvidersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all providers with filters and pagination
   */
  async findAll(filters: ProviderFiltersDto) {
    const {
      search,
      state,
      city,
      organizationType,
      verifiedOnly,
      sortBy = ProviderSortBy.NAME,
      page = 1,
      limit = 20,
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ProviderWhereInput = {
      ...(verifiedOnly && { isVerified: true }),
      ...(state && { normalizedState: state }),
      ...(city && { city: { contains: city, mode: 'insensitive' } }),
      ...(organizationType && { normalizedOrgType: organizationType }),
      ...(search && {
        OR: [
          { organizationName: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
          { state: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
          { contactPersonName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Build orderBy clause
    let orderBy: Prisma.ProviderOrderByWithRelationInput = { organizationName: 'asc' };
    
    switch (sortBy) {
      case ProviderSortBy.NAME:
        orderBy = { organizationName: 'asc' };
        break;
      case ProviderSortBy.CITY:
        orderBy = { city: 'asc' };
        break;
      case ProviderSortBy.RECENT:
        orderBy = { createdAt: 'desc' };
        break;
      case ProviderSortBy.VIEWS:
        orderBy = { viewCount: 'desc' };
        break;
    }

    // Execute query
    const [providers, total] = await Promise.all([
      this.prisma.provider.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: {
            select: { views: true },
          },
        },
      }),
      this.prisma.provider.count({ where }),
    ]);

    const pages = Math.ceil(total / limit);
    const hasMore = page < pages;

    return {
      providers,
      pagination: {
        total,
        page,
        limit,
        pages,
        hasMore,
      },
    };
  }

  /**
   * Get provider by ID
   */
  async findOne(id: string, userId?: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      include: {
        addedBy: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
          },
        },
        _count: {
          select: { views: true },
        },
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // Track view
    if (userId) {
      await this.trackView(id, userId);
    }

    return provider;
  }

  /**
   * Create new provider
   */
  async create(data: CreateProviderDto, userId: string) {
    // Normalize state and org type
    const normalizedState = this.normalizeState(data.state);
    const normalizedOrgType = this.normalizeOrgType(data.organizationType);

    const searchVector = `${data.organizationName} ${data.city} ${data.state} ${data.organizationType}`.toLowerCase();

    return this.prisma.provider.create({
      data: {
        ...data,
        normalizedState,
        normalizedOrgType,
        searchVector,
        addedById: userId,
        serialNumber: await this.getNextSerialNumber(),
      },
      include: {
        addedBy: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });
  }

  /**
   * Update provider
   */
  async update(id: string, data: UpdateProviderDto) {
    const provider = await this.prisma.provider.findUnique({ where: { id } });
    
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const updateData: any = { ...data };

    // Update normalized fields if base fields changed
    if (data.state) {
      updateData.normalizedState = this.normalizeState(data.state);
    }
    if (data.organizationType) {
      updateData.normalizedOrgType = this.normalizeOrgType(data.organizationType);
    }

    // Update search vector if relevant fields changed
    if (data.organizationName || data.city || data.state || data.organizationType) {
      const name = data.organizationName || provider.organizationName;
      const city = data.city || provider.city;
      const state = data.state || provider.state;
      const orgType = data.organizationType || provider.organizationType;
      updateData.searchVector = `${name} ${city} ${state} ${orgType}`.toLowerCase();
    }

    return this.prisma.provider.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Delete provider
   */
  async delete(id: string) {
    const provider = await this.prisma.provider.findUnique({ where: { id } });
    
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    await this.prisma.provider.delete({ where: { id } });
    
    return { message: 'Provider deleted successfully' };
  }

  /**
   * Get unique states
   */
  async getStates() {
    const states = await this.prisma.provider.groupBy({
      by: ['normalizedState', 'state'],
      _count: true,
      orderBy: {
        _count: {
          normalizedState: 'desc',
        },
      },
    });

    return states.map(s => ({
      value: s.normalizedState,
      label: s.state,
      count: s._count,
    }));
  }

  /**
   * Get cities for a state
   */
  async getCities(state: string) {
    const cities = await this.prisma.provider.groupBy({
      by: ['city'],
      where: { normalizedState: state },
      _count: true,
      orderBy: {
        city: 'asc',
      },
    });

    return cities.map(c => ({
      value: c.city,
      label: c.city,
      count: c._count,
    }));
  }

  /**
   * Get unique organization types
   */
  async getOrganizationTypes() {
    const types = await this.prisma.provider.groupBy({
      by: ['normalizedOrgType', 'organizationType'],
      _count: true,
      orderBy: {
        _count: {
          normalizedOrgType: 'desc',
        },
      },
    });

    return types.map(t => ({
      value: t.normalizedOrgType,
      label: t.organizationType,
      count: t._count,
    }));
  }

  /**
   * Get provider statistics
   */
  async getStats() {
    const [
      total,
      verified,
      states,
      orgTypes,
      recent,
      topStates,
      topOrgTypes,
    ] = await Promise.all([
      this.prisma.provider.count(),
      this.prisma.provider.count({ where: { isVerified: true } }),
      this.prisma.provider.groupBy({ by: ['normalizedState'] }),
      this.prisma.provider.groupBy({ by: ['normalizedOrgType'] }),
      this.prisma.provider.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
      this.prisma.provider.groupBy({
        by: ['normalizedState'],
        _count: true,
        orderBy: { _count: { normalizedState: 'desc' } },
        take: 5,
      }),
      this.prisma.provider.groupBy({
        by: ['normalizedOrgType'],
        _count: true,
        orderBy: { _count: { normalizedOrgType: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      totalProviders: total,
      verifiedProviders: verified,
      statesCovered: states.length,
      organizationTypes: orgTypes.length,
      recentlyAdded: recent,
      topStates: topStates.map(s => ({
        state: s.normalizedState,
        count: s._count,
      })),
      topOrganizationTypes: topOrgTypes.map(t => ({
        type: t.normalizedOrgType,
        count: t._count,
      })),
    };
  }

  /**
   * Track contact click
   */
  async trackContactClick(id: string) {
    await this.prisma.provider.update({
      where: { id },
      data: {
        contactClickCount: { increment: 1 },
      },
    });
  }

  /**
   * Track view
   */
  private async trackView(providerId: string, userId?: string) {
    await Promise.all([
      this.prisma.provider.update({
        where: { id: providerId },
        data: { viewCount: { increment: 1 } },
      }),
      this.prisma.providerView.create({
        data: {
          providerId,
          userId,
        },
      }),
    ]);
  }

  /**
   * Get next serial number
   */
  private async getNextSerialNumber(): Promise<number> {
    const lastProvider = await this.prisma.provider.findFirst({
      orderBy: { serialNumber: 'desc' },
      select: { serialNumber: true },
    });

    return (lastProvider?.serialNumber || 0) + 1;
  }

  /**
   * Normalize state name
   */
  private normalizeState(state: string): string {
    const normalization: Record<string, string> = {
      'Uttaranchal': 'Uttarakhand',
      'Kerela': 'Kerala',
      'Pondicherry': 'Puducherry',
    };

    return normalization[state] || state;
  }

  /**
   * Normalize organization type
   */
  private normalizeOrgType(orgType: string): string {
    const normalization: Record<string, string> = {
      'Therapy centre': 'Therapy Centre',
      'Therapy Center': 'Therapy Centre',
      'Special school': 'Special School',
      'Vocational centre': 'Vocational Centre',
      'Child Development centre': 'Child Development Centre',
      'Rehabilitation centre': 'Rehabilitation Centre',
      'Residential centre': 'Residential Centre',
      'Section-8 Non-for-Profit Organisation': 'NGO',
      'Government aided': 'Government Centre',
      'PVT. LTD.': 'Private Limited',
    };

    // Remove trailing spaces
    const cleaned = orgType.trim();
    return normalization[cleaned] || cleaned;
  }
}