// apps/api/src/profile/profile.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AddChildDto, UpdateChildDto } from './dto/add-child.dto';
import { AddChildConditionDto, UpdateChildConditionDto } from './dto/add-child-condition.dto';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(private prisma: PrismaService) { }

  /**
   * Get user profile by user ID
   * Creates a new profile if it doesn't exist
   */
  async getProfile(userId: string) {
    try {
      let profile = await this.prisma.userProfile.findUnique({
        where: { userId },
        include: {
          children: {
            include: {
              conditions: true,
            },
            orderBy: {
              dateOfBirth: 'asc',
            },
          },
        },
      });

      // Get user details to seed profile
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true }
      });

      // Create profile if doesn't exist
      if (!profile) {
        this.logger.log(`Creating new profile for user: ${userId}`);
        profile = await this.prisma.userProfile.create({
          data: {
            userId,
            fullName: user?.name,
            email: user?.email,
            completenessScore: 0,
          },
          include: {
            children: {
              include: {
                conditions: true,
              },
            },
          },
        });

        // Calculate initial score
        await this.updateCompletenessScore(userId);

        // Refetch to get updated score
        profile = await this.prisma.userProfile.findUnique({
          where: { userId },
          include: {
            children: {
              include: {
                conditions: true,
              },
            },
          },
        });
      }

      // Auto-heal: If profile exists but name/email is missing, update it
      if (profile && user) {
        const updates: any = {};
        // Update if missing OR if strictly equals default fallback (though fallback is usually frontend only)
        if (!profile.fullName && user.name) updates.fullName = user.name;
        if (!profile.email && user.email) updates.email = user.email;

        if (Object.keys(updates).length > 0) {
          this.logger.log(`Auto-healing profile for user ${userId}: ${JSON.stringify(updates)}`);
          profile = await this.prisma.userProfile.update({
            where: { id: profile.id },
            data: updates,
            include: {
              children: {
                include: {
                  conditions: true,
                },
              },
            },
          });
          await this.updateCompletenessScore(userId);
        }
      }

      if (!profile) {
        throw new Error('Failed to create or retrieve profile');
      }

      return profile;
    } catch (error) {
      this.logger.error(`Error getting profile for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updateData: UpdateProfileDto) {
    try {
      const profile = await this.getProfile(userId);

      const updated = await this.prisma.userProfile.update({
        where: { id: profile.id },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
        include: {
          children: {
            include: {
              conditions: true,
            },
          },
        },
      });

      // Recalculate completeness score
      await this.updateCompletenessScore(userId);

      this.logger.log(`Profile updated for user: ${userId}`);
      return updated;
    } catch (error) {
      this.logger.error(`Error updating profile for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Add a child to user profile
   */
  async addChild(userId: string, childData: AddChildDto) {
    try {
      const profile = await this.getProfile(userId);

      // Validate date of birth is not in future
      if (new Date(childData.dateOfBirth) > new Date()) {
        throw new BadRequestException('Date of birth cannot be in the future');
      }

      const child = await this.prisma.child.create({
        data: {
          profileId: profile.id,
          firstName: childData.firstName,
          nickname: childData.nickname,
          dateOfBirth: childData.dateOfBirth,
          gender: childData.gender,
          schoolType: childData.schoolType,
          grade: childData.grade,
          hasCondition: childData.hasCondition || false,
          diagnosisStatus: childData.diagnosisStatus,
        },
        include: {
          conditions: true,
        },
      });

      // Recalculate completeness score
      await this.updateCompletenessScore(userId);

      this.logger.log(`Child added for user ${userId}: ${child.id}`);
      return child;
    } catch (error) {
      this.logger.error(`Error adding child for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update child information
   */
  async updateChild(userId: string, childId: string, updateData: UpdateChildDto) {
    try {
      // Verify child belongs to user
      const child = await this.prisma.child.findFirst({
        where: {
          id: childId,
          profile: {
            userId,
          },
        },
      });

      if (!child) {
        throw new NotFoundException('Child not found or does not belong to this user');
      }

      // Validate date of birth if provided
      if (updateData.dateOfBirth && new Date(updateData.dateOfBirth) > new Date()) {
        throw new BadRequestException('Date of birth cannot be in the future');
      }

      const updated = await this.prisma.child.update({
        where: { id: childId },
        data: {
          firstName: updateData.firstName,
          nickname: updateData.nickname,
          dateOfBirth: updateData.dateOfBirth,
          gender: updateData.gender,
          schoolType: updateData.schoolType,
          grade: updateData.grade,
          hasCondition: updateData.hasCondition,
          diagnosisStatus: updateData.diagnosisStatus,
          updatedAt: new Date(),
        },
        include: {
          conditions: true,
        },
      });

      this.logger.log(`Child updated: ${childId}`);
      return updated;
    } catch (error) {
      this.logger.error(`Error updating child ${childId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a child
   */
  async deleteChild(userId: string, childId: string) {
    try {
      // Verify child belongs to user
      const child = await this.prisma.child.findFirst({
        where: {
          id: childId,
          profile: {
            userId,
          },
        },
      });

      if (!child) {
        throw new NotFoundException('Child not found or does not belong to this user');
      }

      await this.prisma.child.delete({
        where: { id: childId },
      });

      // Recalculate completeness score
      await this.updateCompletenessScore(userId);

      this.logger.log(`Child deleted: ${childId}`);
      return { success: true, message: 'Child deleted successfully' };
    } catch (error) {
      this.logger.error(`Error deleting child ${childId}:`, error);
      throw error;
    }
  }

  /**
   * Add condition to a child
   */
  async addChildCondition(userId: string, conditionData: AddChildConditionDto) {
    try {
      // Verify child belongs to user
      const child = await this.prisma.child.findFirst({
        where: {
          id: conditionData.childId,
          profile: {
            userId,
          },
        },
      });

      if (!child) {
        throw new NotFoundException('Child not found or does not belong to this user');
      }

      const condition = await this.prisma.childCondition.create({
        data: {
          childId: conditionData.childId,
          conditionType: conditionData.conditionType,
          diagnosedAt: conditionData.diagnosedAt,
          diagnosedBy: conditionData.diagnosedBy,
          severity: conditionData.severity,
          specificDiagnosis: conditionData.specificDiagnosis,
          currentTherapies: conditionData.currentTherapies || [],
          medications: conditionData.medications || [],
          primaryChallenges: conditionData.primaryChallenges,
          strengths: conditionData.strengths,
          notes: conditionData.notes,
        },
      });

      // Update child's hasCondition flag
      await this.prisma.child.update({
        where: { id: conditionData.childId },
        data: { hasCondition: true },
      });

      // Recalculate completeness score
      await this.updateCompletenessScore(userId);

      this.logger.log(`Condition added for child ${conditionData.childId}: ${condition.id}`);
      return condition;
    } catch (error) {
      this.logger.error(`Error adding condition for child ${conditionData.childId}:`, error);
      throw error;
    }
  }

  /**
   * Update child condition
   */
  async updateChildCondition(
    userId: string,
    conditionId: string,
    updateData: UpdateChildConditionDto
  ) {
    try {
      // Verify condition belongs to user's child
      const condition = await this.prisma.childCondition.findFirst({
        where: {
          id: conditionId,
          child: {
            profile: {
              userId,
            },
          },
        },
      });

      if (!condition) {
        throw new NotFoundException('Condition not found or does not belong to this user');
      }

      const updated = await this.prisma.childCondition.update({
        where: { id: conditionId },
        data: {
          conditionType: updateData.conditionType,
          diagnosedAt: updateData.diagnosedAt,
          diagnosedBy: updateData.diagnosedBy,
          severity: updateData.severity,
          specificDiagnosis: updateData.specificDiagnosis,
          currentTherapies: updateData.currentTherapies || [],
          medications: updateData.medications || [],
          primaryChallenges: updateData.primaryChallenges,
          strengths: updateData.strengths,
          notes: updateData.notes,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Condition updated: ${conditionId}`);
      return updated;
    } catch (error) {
      this.logger.error(`Error updating condition ${conditionId}:`, error);
      throw error;
    }
  }

  /**
   * Delete child condition
   */
  async deleteChildCondition(userId: string, conditionId: string) {
    try {
      // Verify condition belongs to user's child
      const condition = await this.prisma.childCondition.findFirst({
        where: {
          id: conditionId,
          child: {
            profile: {
              userId,
            },
          },
        },
        include: {
          child: true,
        },
      });

      if (!condition) {
        throw new NotFoundException('Condition not found or does not belong to this user');
      }

      await this.prisma.childCondition.delete({
        where: { id: conditionId },
      });

      // Check if child has any remaining conditions
      const remainingConditions = await this.prisma.childCondition.count({
        where: { childId: condition.childId },
      });

      // Update child's hasCondition flag if no conditions remain
      if (remainingConditions === 0) {
        await this.prisma.child.update({
          where: { id: condition.childId },
          data: { hasCondition: false },
        });
      }

      // Recalculate completeness score
      await this.updateCompletenessScore(userId);

      this.logger.log(`Condition deleted: ${conditionId}`);
      return { success: true, message: 'Condition deleted successfully' };
    } catch (error) {
      this.logger.error(`Error deleting condition ${conditionId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate and update profile completeness score
   * 
   * Scoring breakdown (0-100%):
   * - Basic Info (fullName, relationshipToChild): 20%
   * - Contact Info (phone, email): 15%
   * - Location (city, state): 10%
   * - Background (occupation, educationLevel): 10%
   * - At least 1 child added: 25%
   * - Child condition details: 20%
   */
  async updateCompletenessScore(userId: string) {
    try {
      const profile = await this.prisma.userProfile.findUnique({
        where: { userId },
        include: {
          children: {
            include: {
              conditions: true,
            },
          },
        },
      });

      if (!profile) {
        this.logger.warn(`Profile not found for user ${userId}`);
        return 0;
      }

      let score = 0;

      // Basic Info (20%)
      if (profile.fullName && profile.relationshipToChild) {
        score += 20;
      } else if (profile.fullName || profile.relationshipToChild) {
        score += 10; // Partial credit
      }

      // Contact Info (15%)
      if (profile.phoneNumber && profile.email) {
        score += 15;
      } else if (profile.phoneNumber || profile.email) {
        score += 8; // Partial credit
      }

      // Location (10%)
      if (profile.city && profile.state) {
        score += 10;
      } else if (profile.city || profile.state) {
        score += 5; // Partial credit
      }

      // Background (10%)
      if (profile.occupation && profile.educationLevel) {
        score += 10;
      } else if (profile.occupation || profile.educationLevel) {
        score += 5; // Partial credit
      }

      // Children (25%)
      if (profile.children.length > 0) {
        score += 25;
      }

      // Child Conditions (20%)
      const hasConditionDetails = profile.children.some(
        child => child.conditions && child.conditions.length > 0
      );
      if (hasConditionDetails) {
        score += 20;
      }

      // Update the score
      await this.prisma.userProfile.update({
        where: { userId },
        data: {
          completenessScore: score,
          lastCompletedAt: new Date(),
        },
      });

      this.logger.log(`Completeness score updated for user ${userId}: ${score}%`);
      return score;
    } catch (error) {
      this.logger.error(`Error updating completeness score for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get detailed profile completeness breakdown
   */
  async getCompletenessBreakdown(userId: string) {
    try {
      const profile = await this.prisma.userProfile.findUnique({
        where: { userId },
        include: {
          children: {
            include: {
              conditions: true,
            },
          },
        },
      });

      if (!profile) {
        return {
          totalScore: 0,
          sections: this.getEmptySectionsBreakdown(),
        };
      }

      const sections = {
        basicInfo: {
          score: 0,
          maxScore: 20,
          completed: false,
          items: {
            fullName: !!profile.fullName,
            relationshipToChild: !!profile.relationshipToChild,
          },
        },
        contactInfo: {
          score: 0,
          maxScore: 15,
          completed: false,
          items: {
            phoneNumber: !!profile.phoneNumber,
            email: !!profile.email,
          },
        },
        location: {
          score: 0,
          maxScore: 10,
          completed: false,
          items: {
            city: !!profile.city,
            state: !!profile.state,
          },
        },
        background: {
          score: 0,
          maxScore: 10,
          completed: false,
          items: {
            occupation: !!profile.occupation,
            educationLevel: !!profile.educationLevel,
          },
        },
        children: {
          score: 0,
          maxScore: 25,
          completed: false,
          count: profile.children.length,
        },
        conditions: {
          score: 0,
          maxScore: 20,
          completed: false,
          count: profile.children.reduce((sum, child) => sum + child.conditions.length, 0),
        },
      };

      // Calculate section scores
      if (profile.fullName && profile.relationshipToChild) {
        sections.basicInfo.score = 20;
        sections.basicInfo.completed = true;
      } else if (profile.fullName || profile.relationshipToChild) {
        sections.basicInfo.score = 10;
      }

      if (profile.phoneNumber && profile.email) {
        sections.contactInfo.score = 15;
        sections.contactInfo.completed = true;
      } else if (profile.phoneNumber || profile.email) {
        sections.contactInfo.score = 8;
      }

      if (profile.city && profile.state) {
        sections.location.score = 10;
        sections.location.completed = true;
      } else if (profile.city || profile.state) {
        sections.location.score = 5;
      }

      if (profile.occupation && profile.educationLevel) {
        sections.background.score = 10;
        sections.background.completed = true;
      } else if (profile.occupation || profile.educationLevel) {
        sections.background.score = 5;
      }

      if (profile.children.length > 0) {
        sections.children.score = 25;
        sections.children.completed = true;
      }

      const hasConditions = profile.children.some(child => child.conditions.length > 0);
      if (hasConditions) {
        sections.conditions.score = 20;
        sections.conditions.completed = true;
      }

      return {
        totalScore: profile.completenessScore,
        sections,
        lastUpdated: profile.lastCompletedAt,
      };
    } catch (error) {
      this.logger.error(`Error getting completeness breakdown for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Mark onboarding as complete
   */
  async completeOnboarding(userId: string) {
    try {
      const profile = await this.getProfile(userId);

      const updated = await this.prisma.userProfile.update({
        where: { id: profile.id },
        data: {
          onboardingCompleted: true,
        },
      });

      this.logger.log(`Onboarding completed for user: ${userId}`);
      return updated;
    } catch (error) {
      this.logger.error(`Error completing onboarding for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Check if user needs to complete onboarding
   */
  async needsOnboarding(userId: string): Promise<boolean> {
    try {
      const profile = await this.getProfile(userId);
      return !profile.onboardingCompleted;
    } catch (error) {
      this.logger.error(`Error checking onboarding status for user ${userId}:`, error);
      return true; // Default to true if error
    }
  }

  /**
   * Get empty sections breakdown structure
   */
  private getEmptySectionsBreakdown() {
    return {
      basicInfo: { score: 0, maxScore: 20, completed: false, items: {} },
      contactInfo: { score: 0, maxScore: 15, completed: false, items: {} },
      location: { score: 0, maxScore: 10, completed: false, items: {} },
      background: { score: 0, maxScore: 10, completed: false, items: {} },
      children: { score: 0, maxScore: 25, completed: false, count: 0 },
      conditions: { score: 0, maxScore: 20, completed: false, count: 0 },
    };
  }
}