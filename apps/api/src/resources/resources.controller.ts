// apps/api/src/resources/resources.controller.ts
// ===================================

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('resources')
export class ResourcesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getResources(@Query() query: any) {
    const { page = 1, limit = 10, category } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {
      type: 'RESOURCE',
      published: true,
    };

    if (category) {
      where.category = category;
    }

    const [resources, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
              verificationStatus: true,
            },
          },
          _count: {
            select: {
              comments: true,
              bookmarks: true,
            },
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      resources,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    };
  }

  @Get('categories')
  async getCategories() {
    const categories = await this.prisma.post.findMany({
      where: { type: 'RESOURCE' },
      select: { category: true },
      distinct: ['category'],
    });

    return categories.map(c => c.category).filter(Boolean);
  }
}
