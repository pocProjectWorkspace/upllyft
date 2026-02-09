// apps/api/src/crisis/crisis-volunteer.service.ts

import { 
  Injectable, 
  Logger, 
  NotFoundException, 
  ConflictException,
  BadRequestException 
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  VolunteerRegistrationDto, 
  UpdateVolunteerAvailabilityDto,
} from './dto';
import { CrisisType, CrisisVolunteer } from './crisis.types';

@Injectable()
export class CrisisVolunteerService {
  private readonly logger = new Logger(CrisisVolunteerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Register a user as a crisis volunteer
   */
  async registerVolunteer(userId: string, dto: VolunteerRegistrationDto) {
    // Check if already registered
    const existing = await this.prisma.crisisVolunteer.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException('User is already registered as a volunteer');
    }

    // Verify user exists and has appropriate role
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { 
        role: true, 
        verificationStatus: true,
        name: true,
        email: true 
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Only verified therapists, educators, or trained volunteers can register
    const allowedRoles = ['THERAPIST', 'EDUCATOR', 'MODERATOR', 'ADMIN'];
    if (!allowedRoles.includes(user.role)) {
      throw new BadRequestException(
        'Only verified professionals can register as crisis volunteers'
      );
    }

    return this.prisma.crisisVolunteer.create({
      data: {
        userId,
        ...dto,
        isAvailable: false, // Start as unavailable until training is confirmed
        isActive: false, // Needs admin approval
        trainingCompleted: false,
        casesHandled: 0,
        currentCases: 0,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Find an available volunteer for a crisis
   */
  async findAvailableVolunteer(
    crisisType: CrisisType,
    location?: string,
    language?: string
  ) {
    const where: any = {
      isActive: true,
      isAvailable: true,
      trainingCompleted: true,
      specializations: {
        has: crisisType,
      },
      currentCases: {
        lt: 3, // Use a fixed max value instead of dynamic field reference
      },
    };

    // Parse location for state/city matching
    if (location) {
      const [city, state] = location.split(',').map(s => s.trim());
      if (state) {
        where.state = {
          contains: state,
          mode: 'insensitive',
        };
      }
      if (city) {
        where.city = {
          contains: city,
          mode: 'insensitive',
        };
      }
    }

    // Filter by language preference
    if (language) {
      where.languages = {
        has: language,
      };
    }

    // Find volunteers ordered by availability and rating
    const volunteers = await this.prisma.crisisVolunteer.findMany({
      where,
      orderBy: [
        { currentCases: 'asc' }, // Least busy first
        { avgRating: 'desc' },
        { casesHandled: 'desc' },
      ],
      take: 5,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
            specialization: true,
          },
        },
      },
    });

    if (volunteers.length === 0) {
      this.logger.warn('No available volunteers found', {
        crisisType,
        location,
        language,
      });
      return null;
    }

    // Select the best match (first in the sorted list)
    const selected = volunteers[0];

    // Increment current cases count
    await this.prisma.crisisVolunteer.update({
      where: { id: selected.id },
      data: {
        currentCases: {
          increment: 1,
        },
      },
    });

    return selected;
  }

  /**
   * Update volunteer availability
   */
  async updateAvailability(
    userId: string,
    dto: UpdateVolunteerAvailabilityDto
  ) {
    const volunteer = await this.prisma.crisisVolunteer.findUnique({
      where: { userId },
    });

    if (!volunteer) {
      throw new NotFoundException('Volunteer profile not found');
    }

    if (!volunteer.trainingCompleted) {
      throw new BadRequestException('Training must be completed before becoming available');
    }

    if (!volunteer.isActive) {
      throw new BadRequestException('Volunteer profile is not active. Contact admin.');
    }

    return this.prisma.crisisVolunteer.update({
      where: { userId },
      data: {
        isAvailable: dto.isAvailable,
        availableFrom: dto.availableFrom ? new Date(dto.availableFrom) : null,
        availableTill: dto.availableTill ? new Date(dto.availableTill) : null,
        currentCases: dto.isAvailable ? volunteer.currentCases : 0, // Reset if going offline
      },
    });
  }

  /**
   * Get volunteer profile
   */
  async getVolunteerProfile(userId: string) {
    const volunteer = await this.prisma.crisisVolunteer.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
            specialization: true,
            yearsOfExperience: true,
          },
        },
        connections: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            incident: {
              select: {
                type: true,
                urgencyLevel: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!volunteer) {
      throw new NotFoundException('Volunteer profile not found');
    }

    // Calculate stats
    const stats = await this.getVolunteerStats(volunteer.id);

    return {
      ...volunteer,
      stats,
    };
  }

  /**
   * Complete volunteer training
   */
  async completeTraining(userId: string, certificateIds: string[]) {
    const volunteer = await this.prisma.crisisVolunteer.findUnique({
      where: { userId },
    });

    if (!volunteer) {
      throw new NotFoundException('Volunteer profile not found');
    }

    return this.prisma.crisisVolunteer.update({
      where: { userId },
      data: {
        trainingCompleted: true,
        certifications: {
          push: certificateIds,
        },
      },
    });
  }

  /**
   * Approve volunteer (admin only)
   */
  async approveVolunteer(volunteerId: string, approvedBy: string) {
    return this.prisma.crisisVolunteer.update({
      where: { id: volunteerId },
      data: {
        isActive: true,
        approvedAt: new Date(),
        approvedBy,
      },
    });
  }

  /**
   * Release a case from volunteer
   */
  async releaseCase(volunteerId: string) {
    const volunteer = await this.prisma.crisisVolunteer.findUnique({
      where: { id: volunteerId },
    });

    if (!volunteer) {
      throw new NotFoundException('Volunteer not found');
    }

    return this.prisma.crisisVolunteer.update({
      where: { id: volunteerId },
      data: {
        currentCases: Math.max(0, volunteer.currentCases - 1),
      },
    });
  }

  /**
   * Get volunteer statistics
   */
  private async getVolunteerStats(volunteerId: string) {
    const [
      totalCases,
      resolvedCases,
      avgResponseTime,
      avgRating,
      thisMonth,
      thisWeek,
    ] = await Promise.all([
      // Total cases
      this.prisma.crisisConnection.count({
        where: { volunteerId },
      }),
      
      // Resolved cases
      this.prisma.crisisConnection.count({
        where: {
          volunteerId,
          outcome: 'RESOLVED',
        },
      }),

      // Average response time (in minutes)
      this.prisma.crisisConnection.aggregate({
        where: { volunteerId },
        _avg: {
          duration: true,
        },
      }),

      // Average rating
      this.prisma.crisisConnection.aggregate({
        where: {
          volunteerId,
          rating: { not: null },
        },
        _avg: {
          rating: true,
        },
      }),

      // Cases this month
      this.prisma.crisisConnection.count({
        where: {
          volunteerId,
          createdAt: {
            gte: new Date(new Date().setDate(1)), // First day of current month
          },
        },
      }),

      // Cases this week
      this.prisma.crisisConnection.count({
        where: {
          volunteerId,
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7)),
          },
        },
      }),
    ]);

    return {
      totalCases,
      resolvedCases,
      resolutionRate: totalCases > 0 ? (resolvedCases / totalCases) * 100 : 0,
      avgResponseTime: avgResponseTime._avg.duration 
        ? Math.round(avgResponseTime._avg.duration / 60) 
        : null,
      avgRating: avgRating._avg.rating || 0,
      casesThisMonth: thisMonth,
      casesThisWeek: thisWeek,
    };
  }

  /**
   * Get all active volunteers (admin)
   */
  async getAllVolunteers(filters?: {
    isActive?: boolean;
    isAvailable?: boolean;
    state?: string;
    specialization?: CrisisType;
  }) {
    const where: any = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.isAvailable !== undefined) {
      where.isAvailable = filters.isAvailable;
    }

    if (filters?.state) {
      where.state = filters.state;
    }

    if (filters?.specialization) {
      where.specializations = {
        has: filters.specialization,
      };
    }

    return this.prisma.crisisVolunteer.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
          },
        },
      },
      orderBy: [
        { isAvailable: 'desc' },
        { avgRating: 'desc' },
        { casesHandled: 'desc' },
      ],
    });
  }
}