// apps/api/src/app.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('resources')
  async getResources(@Query() query: any) {
    const { page = 1, limit = 10 } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {
      type: 'RESOURCE',
      isPublished: true,  // ✅ FIXED: Changed from 'published' to 'isPublished'
    };

    const [posts, total] = await Promise.all([
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
      posts,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      hasMore: parseInt(page) < Math.ceil(total / parseInt(limit)),
    };
  }
}