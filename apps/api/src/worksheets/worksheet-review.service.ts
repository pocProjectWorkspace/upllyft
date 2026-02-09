import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ListReviewsDto } from './dto/list-reviews.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class WorksheetReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async create(worksheetId: string, dto: CreateReviewDto, userId: string) {
    const worksheet = await this.prisma.worksheet.findUnique({
      where: { id: worksheetId },
    });
    if (!worksheet) throw new NotFoundException('Worksheet not found');
    if (!worksheet.isPublic) {
      throw new BadRequestException('Can only review public worksheets');
    }
    if (worksheet.createdById === userId) {
      throw new BadRequestException('Cannot review your own worksheet');
    }

    // Check for existing review
    const existing = await this.prisma.worksheetReview.findUnique({
      where: { worksheetId_userId: { worksheetId, userId } },
    });
    if (existing) {
      throw new ConflictException('You have already reviewed this worksheet');
    }

    const review = await this.prisma.worksheetReview.create({
      data: {
        worksheetId,
        userId,
        rating: dto.rating,
        reviewText: dto.reviewText ?? null,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    // Update aggregate rating on the worksheet
    await this.updateAggregateRating(worksheetId);

    return review;
  }

  async list(worksheetId: string, dto: ListReviewsDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const skip = (page - 1) * limit;

    let orderBy: Prisma.WorksheetReviewOrderByWithRelationInput;
    switch (dto.sortBy) {
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'highest':
        orderBy = { rating: 'desc' };
        break;
      case 'lowest':
        orderBy = { rating: 'asc' };
        break;
      case 'most_helpful':
        orderBy = { helpfulCount: 'desc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const [reviews, total] = await Promise.all([
      this.prisma.worksheetReview.findMany({
        where: { worksheetId },
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.worksheetReview.count({ where: { worksheetId } }),
    ]);

    return {
      data: reviews,
      total,
      page,
      limit,
      hasMore: skip + reviews.length < total,
    };
  }

  async update(reviewId: string, dto: UpdateReviewDto, userId: string) {
    const review = await this.prisma.worksheetReview.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) {
      throw new ForbiddenException('Can only update your own review');
    }

    const updateData: Prisma.WorksheetReviewUpdateInput = {};
    if (dto.rating != null) updateData.rating = dto.rating;
    if (dto.reviewText !== undefined) updateData.reviewText = dto.reviewText;

    const updated = await this.prisma.worksheetReview.update({
      where: { id: reviewId },
      data: updateData,
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    // Update aggregate rating if rating changed
    if (dto.rating != null) {
      await this.updateAggregateRating(review.worksheetId);
    }

    return updated;
  }

  async remove(reviewId: string, userId: string) {
    const review = await this.prisma.worksheetReview.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) {
      throw new ForbiddenException('Can only delete your own review');
    }

    await this.prisma.worksheetReview.delete({ where: { id: reviewId } });

    // Update aggregate rating
    await this.updateAggregateRating(review.worksheetId);

    return { success: true };
  }

  async markHelpful(reviewId: string, userId: string) {
    const review = await this.prisma.worksheetReview.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId === userId) {
      throw new BadRequestException('Cannot mark your own review as helpful');
    }

    return this.prisma.worksheetReview.update({
      where: { id: reviewId },
      data: { helpfulCount: { increment: 1 } },
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  }

  private async updateAggregateRating(worksheetId: string) {
    const aggregate = await this.prisma.worksheetReview.aggregate({
      where: { worksheetId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.worksheet.update({
      where: { id: worksheetId },
      data: {
        averageRating: aggregate._avg.rating,
        reviewCount: aggregate._count.rating,
      },
    });
  }
}
