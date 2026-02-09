// apps/api/src/user/user-preferences.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserPreferencesDto } from './dto/user-preferences.dto';

@Injectable()
export class UserPreferencesService {
  constructor(private prisma: PrismaService) {}

  async getPreferences(userId: string) {
    // Try to get existing preferences
    let preferences = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });

    // If no preferences exist, create default ones
    if (!preferences) {
      preferences = await this.createDefaultPreferences(userId);
    }

    return preferences;
  }

  async savePreferences(userId: string, dto: UserPreferencesDto) {
    // Convert DTO to database format, ensuring notificationTypes is plain object
    const data: any = {
      ...dto,
      // Convert notificationTypes to plain object if it exists
      notificationTypes: dto.notificationTypes ? 
        JSON.parse(JSON.stringify(dto.notificationTypes)) : 
        {},
      // Convert emergencyContacts to JSON if it exists
      emergencyContacts: dto.emergencyContacts ? 
        JSON.parse(JSON.stringify(dto.emergencyContacts)) : 
        [],
    };

    // Remove createdAt/updatedAt if they exist in dto
    delete data.createdAt;
    delete data.updatedAt;

    // Upsert preferences
    const preferences = await this.prisma.userPreferences.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });

    return preferences;
  }

  async resetPreferences(userId: string) {
    // Delete existing preferences
    await this.prisma.userPreferences.delete({
      where: { userId },
    }).catch(() => {
      // Ignore if doesn't exist
    });

    // Create default preferences
    return this.createDefaultPreferences(userId);
  }

  private async createDefaultPreferences(userId: string) {
    return this.prisma.userPreferences.create({
      data: {
        userId,
        // Feed display
        defaultFeedView: 'FOR_YOU',
        feedDensity: 'COMFORTABLE',
        showAnonymousPosts: true,
        autoplayVideos: false,
        
        // Content preferences - use actual field names from schema
        preferredCategories: [],
        blockedCategories: [],
        followedTags: [],
        blockedTags: [],
        mutedKeywords: [],
        mutedAuthors: [],
        preferredLanguages: ['English'],
        contentTypes: [],
        verifiedAuthorsOnly: false,
        minEngagement: 0,
        
        // Algorithm weights
        recencyWeight: 30,
        relevanceWeight: 40,
        engagementWeight: 30,
        
        // Notifications - as plain JSON
        emailNotifications: true,
        pushNotifications: false,
        notificationFrequency: 'daily',
        notificationTypes: {
          comments: true,
          replies: true,
          mentions: true,
          follows: true,
          resources: false,
        },
        
        // Crisis - as plain JSON
        showCrisisButton: true,
        emergencyContacts: [],
        preferredHelplines: [],
      },
    });
  }

  private async invalidateFeedCache(userId: string) {
    // Implement cache invalidation logic
    // This would clear any cached feed data for the user
    // forcing a refresh with new preferences
  }
}