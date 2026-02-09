import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdPlacement, AdStatus, Prisma } from '@prisma/client';
import { CreateBannerAdDto } from './dto/create-banner-ad.dto';
import { UpdateBannerAdDto } from './dto/update-banner-ad.dto';

@Injectable()
export class BannerAdsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBannerAdDto, userId: string) {
    return this.prisma.bannerAd.create({
      data: {
        title: dto.title,
        imageUrl: dto.imageUrl,
        targetUrl: dto.targetUrl,
        placement: dto.placement,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        priority: dto.priority ?? 0,
        createdById: userId,
      },
    });
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    status?: AdStatus;
    placement?: AdPlacement;
    search?: string;
  }) {
    const { page = 1, limit = 20, status, placement, search } = params;
    const where: Prisma.BannerAdWhereInput = {};

    if (status) where.status = status;
    if (placement) where.placement = placement;
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const [ads, total] = await Promise.all([
      this.prisma.bannerAd.findMany({
        where,
        include: {
          _count: { select: { analytics: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.bannerAd.count({ where }),
    ]);

    // Get impression and click counts per ad
    const adIds = ads.map((a) => a.id);
    const analyticsAgg = await this.prisma.adAnalytics.groupBy({
      by: ['bannerAdId', 'type'],
      where: { bannerAdId: { in: adIds } },
      _count: true,
    });

    const statsMap = new Map<string, { impressions: number; clicks: number }>();
    for (const row of analyticsAgg) {
      const existing = statsMap.get(row.bannerAdId) || {
        impressions: 0,
        clicks: 0,
      };
      if (row.type === 'impression') existing.impressions = row._count;
      if (row.type === 'click') existing.clicks = row._count;
      statsMap.set(row.bannerAdId, existing);
    }

    const data = ads.map((ad) => ({
      ...ad,
      impressions: statsMap.get(ad.id)?.impressions ?? 0,
      clicks: statsMap.get(ad.id)?.clicks ?? 0,
    }));

    return { data, total, page, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const ad = await this.prisma.bannerAd.findUniqueOrThrow({
      where: { id },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    const [impressions, clicks] = await Promise.all([
      this.prisma.adAnalytics.count({
        where: { bannerAdId: id, type: 'impression' },
      }),
      this.prisma.adAnalytics.count({
        where: { bannerAdId: id, type: 'click' },
      }),
    ]);

    return { ...ad, impressions, clicks };
  }

  async update(id: string, dto: UpdateBannerAdDto) {
    const data: Prisma.BannerAdUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.targetUrl !== undefined) data.targetUrl = dto.targetUrl;
    if (dto.placement !== undefined) data.placement = dto.placement;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.startDate !== undefined)
      data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined)
      data.endDate = dto.endDate ? new Date(dto.endDate) : null;

    return this.prisma.bannerAd.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.bannerAd.delete({ where: { id } });
  }

  async getActiveByPlacement(placement: AdPlacement) {
    const now = new Date();
    return this.prisma.bannerAd.findMany({
      where: {
        placement,
        status: AdStatus.ACTIVE,
        OR: [{ startDate: null }, { startDate: { lte: now } }],
        AND: [
          {
            OR: [{ endDate: null }, { endDate: { gte: now } }],
          },
        ],
      },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        targetUrl: true,
        placement: true,
        priority: true,
      },
      orderBy: { priority: 'desc' },
      take: 10,
    });
  }

  async trackEvent(
    adId: string,
    type: 'impression' | 'click',
    userId?: string,
    ip?: string,
    userAgent?: string,
  ) {
    // Deduplicate impressions: skip if same user+ad within last hour
    if (type === 'impression' && userId) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const existing = await this.prisma.adAnalytics.findFirst({
        where: {
          bannerAdId: adId,
          type: 'impression',
          userId,
          createdAt: { gte: oneHourAgo },
        },
      });
      if (existing) return;
    }

    await this.prisma.adAnalytics.create({
      data: { bannerAdId: adId, type, userId, ip, userAgent },
    });
  }
}
