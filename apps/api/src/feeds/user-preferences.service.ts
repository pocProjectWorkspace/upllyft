// apps/api/src/feeds/user-preferences.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedPreferenceDto } from './dto/create-feed-preference.dto';
import { UpdateFeedPreferenceDto } from './dto/update-feed-preference.dto';
import { FeedView, FeedDensity } from '@prisma/client';

@Injectable()
export class UserPreferencesService {
  constructor(private prisma: PrismaService) {}

  async getPreferences(userId: string) {
    let preferences = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });

    // Create default preferences if not exists
    if (!preferences) {
      preferences = await this.createDefaultPreferences(userId);
    }

    return preferences;
  }

  async createDefaultPreferences(userId: string) {
    return this.prisma.userPreferences.create({
      data: {
        userId,
        defaultFeedView: FeedView.FOR_YOU,
        feedDensity: FeedDensity.COMFORTABLE,
        showAnonymousPosts: true,
        autoplayVideos: false,
        preferredCategories: [],
        mutedKeywords: [],
        mutedAuthors: [],
        preferredLanguages: ['English'],
        recencyWeight: 30,
        relevanceWeight: 40,
        engagementWeight: 30,
      },
    });
  }

  async updatePreferences(
    userId: string,
    updateDto: UpdateFeedPreferenceDto
  ) {
    // Ensure preferences exist
    await this.getPreferences(userId);

    // Validate weights if provided
    if (updateDto.recencyWeight || updateDto.relevanceWeight || updateDto.engagementWeight) {
      const totalWeight = 
        (updateDto.recencyWeight || 0) + 
        (updateDto.relevanceWeight || 0) + 
        (updateDto.engagementWeight || 0);
      
      if (totalWeight !== 100) {
        // Normalize weights to 100
        const scale = 100 / totalWeight;
        if (updateDto.recencyWeight) updateDto.recencyWeight = Math.round(updateDto.recencyWeight * scale);
        if (updateDto.relevanceWeight) updateDto.relevanceWeight = Math.round(updateDto.relevanceWeight * scale);
        if (updateDto.engagementWeight) updateDto.engagementWeight = Math.round(updateDto.engagementWeight * scale);
      }
    }

    return this.prisma.userPreferences.update({
      where: { userId },
      data: updateDto,
    });
  }

  async addMutedKeyword(userId: string, keyword: string) {
    const preferences = await this.getPreferences(userId);
    
    if (!preferences.mutedKeywords.includes(keyword)) {
      return this.prisma.userPreferences.update({
        where: { userId },
        data: {
          mutedKeywords: {
            push: keyword,
          },
        },
      });
    }

    return preferences;
  }

  async removeMutedKeyword(userId: string, keyword: string) {
    const preferences = await this.getPreferences(userId);
    
    return this.prisma.userPreferences.update({
      where: { userId },
      data: {
        mutedKeywords: {
          set: preferences.mutedKeywords.filter(k => k !== keyword),
        },
      },
    });
  }

  async addPreferredCategory(userId: string, category: string) {
    const preferences = await this.getPreferences(userId);
    
    if (!preferences.preferredCategories.includes(category)) {
      return this.prisma.userPreferences.update({
        where: { userId },
        data: {
          preferredCategories: {
            push: category,
          },
        },
      });
    }

    return preferences;
  }

  async removePreferredCategory(userId: string, category: string) {
    const preferences = await this.getPreferences(userId);
    
    return this.prisma.userPreferences.update({
      where: { userId },
      data: {
        preferredCategories: {
          set: preferences.preferredCategories.filter(c => c !== category),
        },
      },
    });
  }

  async resetPreferences(userId: string) {
    await this.prisma.userPreferences.delete({
      where: { userId },
    });

    return this.createDefaultPreferences(userId);
  }
}