// apps/api/src/crisis/crisis.service.ts

import { 
  Injectable, 
  Logger, 
  NotFoundException,
  BadRequestException 
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrisisResourcesService } from './crisis-resources.service';
import { CrisisVolunteerService } from './crisis-volunteer.service';
import { CrisisDetectionService } from './crisis-detection.service';
import { 
  CreateCrisisIncidentDto, 
  UpdateCrisisIncidentDto,
  CreateConnectionDto,
  UpdateConnectionDto,
  CrisisIncidentResponseDto,
} from './dto';
import { 
  CrisisType, 
  UrgencyLevel, 
  CrisisStatus, 
  CrisisIncident,
  CrisisConnection 
} from './crisis.types';

@Injectable()
export class CrisisService {
  private readonly logger = new Logger(CrisisService.name);

  constructor(
    private prisma: PrismaService,
    private resourcesService: CrisisResourcesService,
    private volunteerService: CrisisVolunteerService,
    private detectionService: CrisisDetectionService,
  ) {}

  /**
   * Create a new crisis incident
   */
  async createIncident(userId: string, dto: CreateCrisisIncidentDto) {
    try {
      // Assess urgency if not provided
      const urgencyLevel = dto.urgencyLevel || await this.assessUrgency(dto);

      // Create the incident
      const incident = await this.prisma.crisisIncident.create({
        data: {
          userId,
          type: dto.type,
          urgencyLevel,
          description: dto.description,
          location: dto.location,
          contactNumber: dto.contactNumber,
          preferredLang: dto.preferredLang || 'en',
          triggerKeywords: dto.triggerKeywords || [],
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
          status: CrisisStatus.ACTIVE,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              emergencyContact: true,
              emergencyPhone: true,
            },
          },
        },
      });

      // Log the incident creation
      await this.logAction(incident.id, 'CREATED', {
        userId,
        type: dto.type,
        urgencyLevel,
      });

      // Get appropriate resources based on type and location
      const resources = await this.resourcesService.getResourcesForCrisis(
        dto.type,
        dto.location,
        dto.preferredLang,
        urgencyLevel === UrgencyLevel.IMMEDIATE ? 10 : 5
      );

      // For non-immediate cases, try to connect with a volunteer
      let volunteer: any = null;
      if (urgencyLevel !== UrgencyLevel.IMMEDIATE) {
        volunteer = await this.volunteerService.findAvailableVolunteer(
          dto.type,
          dto.location,
          dto.preferredLang
        );

        if (volunteer && volunteer.id) {
          await this.connectVolunteer(incident.id, volunteer.id);
        }
      }

      // Schedule follow-up
      await this.scheduleFollowUp(incident.id, urgencyLevel);

      // Notify moderators for high-priority cases
      if ([UrgencyLevel.IMMEDIATE, UrgencyLevel.HIGH].includes(urgencyLevel)) {
        await this.notifyModerators(incident);
      }

      // Get next steps based on urgency
      const nextSteps = this.getNextSteps(urgencyLevel, dto.type);

      // Get emergency contacts
      const emergencyContacts = await this.resourcesService.getEmergencyContacts();

      const response: CrisisIncidentResponseDto = {
        incident: incident as any,
        resources: resources as any,
        volunteer,
        nextSteps,
        emergencyContacts: this.formatEmergencyContacts(emergencyContacts),
      };

      return response;
    } catch (error) {
      this.logger.error('Failed to create crisis incident', error);
      throw error;
    }
  }

  /**
   * Get incident by ID
   */
  async getIncident(incidentId: string, userId?: string) {
    const incident = await this.prisma.crisisIncident.findUnique({
      where: { id: incidentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        connections: {
          include: {
            volunteer: {
              include: {
                user: {
                  select: {
                    name: true,
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    // Check if user has permission to view
    if (userId && incident.userId !== userId) {
      // Only the user, volunteers, or admins can view
      const userRole = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!['ADMIN', 'MODERATOR'].includes(userRole?.role || '')) {
        throw new BadRequestException('Unauthorized to view this incident');
      }
    }

    return incident;
  }

  /**
   * Update incident status
   */
  async updateIncident(
    incidentId: string,
    dto: UpdateCrisisIncidentDto,
    updatedBy: string
  ) {
    const incident = await this.getIncident(incidentId);

    const updated = await this.prisma.crisisIncident.update({
      where: { id: incidentId },
      data: {
        ...dto,
        resolvedAt: dto.status === CrisisStatus.RESOLVED ? new Date() : undefined,
        resolvedBy: dto.status === CrisisStatus.RESOLVED ? updatedBy : undefined,
      },
    });

    // Log the update
    await this.logAction(incidentId, 'UPDATED', {
      updatedBy,
      changes: dto,
    });

    // If resolved, release volunteer case
    if (dto.status === CrisisStatus.RESOLVED && incident.volunteerId) {
      await this.volunteerService.releaseCase(incident.volunteerId);
    }

    return updated;
  }

  /**
   * Connect a volunteer to an incident
   */
  async connectVolunteer(incidentId: string, volunteerId: string) {
    const connection = await this.prisma.crisisConnection.create({
      data: {
        incidentId,
        volunteerId,
        connectionType: 'CHAT', // Default to chat
      },
    });

    await this.prisma.crisisIncident.update({
      where: { id: incidentId },
      data: {
        volunteerId,
        status: CrisisStatus.IN_PROGRESS,
      },
    });

    await this.logAction(incidentId, 'VOLUNTEER_CONNECTED', {
      volunteerId,
      connectionId: connection.id,
    });

    return connection;
  }

  /**
   * Create a connection to a resource
   */
  async createConnection(dto: CreateConnectionDto) {
    const connection = await this.prisma.crisisConnection.create({
      data: dto,
    });

    await this.logAction(dto.incidentId, 'RESOURCE_ACCESSED', {
      resourceId: dto.resourceId,
      volunteerId: dto.volunteerId,
      connectionType: dto.connectionType,
    });

    return connection;
  }

  /**
   * Update connection outcome
   */
  async updateConnection(connectionId: string, dto: UpdateConnectionDto) {
    const connection = await this.prisma.crisisConnection.update({
      where: { id: connectionId },
      data: {
        ...dto,
        endedAt: dto.outcome ? new Date() : undefined,
      },
    });

    // Update volunteer rating if provided
    if (dto.rating && connection.volunteerId) {
      await this.updateVolunteerRating(connection.volunteerId, dto.rating);
    }

    return connection;
  }

  /**
   * Get user's crisis history
   */
  async getUserIncidents(userId: string, limit: number = 10) {
    return this.prisma.crisisIncident.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        connections: {
          select: {
            id: true,
            connectionType: true,
            outcome: true,
            rating: true,
          },
        },
      },
    });
  }

  /**
   * Check for follow-up required
   */
  async checkFollowUps() {
    const pendingFollowUps = await this.prisma.crisisIncident.findMany({
      where: {
        status: {
          in: [CrisisStatus.ACTIVE, CrisisStatus.FOLLOWUP_PENDING],
        },
        followupScheduled: {
          lte: new Date(),
        },
        followupCompleted: false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    for (const incident of pendingFollowUps) {
      await this.sendFollowUpNotification(incident);
    }

    return pendingFollowUps.length;
  }

  /**
   * Assess urgency based on incident details
   */
  private async assessUrgency(dto: CreateCrisisIncidentDto): Promise<UrgencyLevel> {
    // Check for immediate crisis keywords
    if (dto.description) {
      const detection = await this.detectionService.detectCrisisInContent(dto.description);
      
      if (detection.detected && detection.confidence > 0.8) {
        if (detection.type === CrisisType.SUICIDE_RISK) {
          return UrgencyLevel.IMMEDIATE;
        }
        if ([CrisisType.SELF_HARM, CrisisType.MEDICAL_EMERGENCY].includes(detection.type!)) {
          return UrgencyLevel.HIGH;
        }
      }
    }

    // Default urgency based on type
    const typeUrgencyMap: Record<CrisisType, UrgencyLevel> = {
      [CrisisType.SUICIDE_RISK]: UrgencyLevel.IMMEDIATE,
      [CrisisType.SELF_HARM]: UrgencyLevel.HIGH,
      [CrisisType.MEDICAL_EMERGENCY]: UrgencyLevel.HIGH,
      [CrisisType.PANIC_ATTACK]: UrgencyLevel.HIGH,
      [CrisisType.MELTDOWN]: UrgencyLevel.MODERATE,
      [CrisisType.FAMILY_CONFLICT]: UrgencyLevel.MODERATE,
      [CrisisType.BURNOUT]: UrgencyLevel.LOW,
    };

    return typeUrgencyMap[dto.type] || UrgencyLevel.MODERATE;
  }

  /**
   * Schedule follow-up based on urgency
   */
  private async scheduleFollowUp(incidentId: string, urgencyLevel: UrgencyLevel) {
    const followUpHours = {
      [UrgencyLevel.IMMEDIATE]: 1,
      [UrgencyLevel.HIGH]: 6,
      [UrgencyLevel.MODERATE]: 24,
      [UrgencyLevel.LOW]: 48,
    };

    const followUpTime = new Date();
    followUpTime.setHours(followUpTime.getHours() + followUpHours[urgencyLevel]);

    await this.prisma.crisisIncident.update({
      where: { id: incidentId },
      data: {
        followupScheduled: followUpTime,
        status: CrisisStatus.FOLLOWUP_PENDING,
      },
    });

    await this.logAction(incidentId, 'FOLLOWUP_SCHEDULED', {
      scheduledFor: followUpTime,
    });
  }

  /**
   * Get next steps based on urgency and type
   */
  private getNextSteps(urgencyLevel: UrgencyLevel, type: CrisisType): string[] {
    const steps: string[] = [];

    if (urgencyLevel === UrgencyLevel.IMMEDIATE) {
      steps.push('Call emergency helpline immediately');
      steps.push('Stay with someone you trust');
      steps.push('Remove any means of self-harm');
    }

    switch (type) {
      case CrisisType.SUICIDE_RISK:
        steps.push('Connect with crisis counselor');
        steps.push('Create a safety plan');
        steps.push('Identify reasons for living');
        break;
      case CrisisType.PANIC_ATTACK:
        steps.push('Practice deep breathing exercises');
        steps.push('Find a quiet, safe space');
        steps.push('Use grounding techniques (5-4-3-2-1)');
        break;
      case CrisisType.MELTDOWN:
        steps.push('Reduce sensory input');
        steps.push('Use calming strategies');
        steps.push('Take a break from demands');
        break;
      default:
        steps.push('Reach out to support network');
        steps.push('Practice self-care');
        steps.push('Consider professional help');
    }

    return steps;
  }

  /**
   * Log action for audit trail
   */
  private async logAction(
    incidentId: string,
    action: string,
    details?: any,
    performedBy?: string
  ) {
    try {
      await this.prisma.crisisLog.create({
        data: {
          incidentId,
          action,
          details,
          performedBy: performedBy || 'SYSTEM',
        },
      });
    } catch (error) {
      this.logger.error('Failed to log action', error);
    }
  }

  /**
   * Notify moderators about high-priority incident
   */
  private async notifyModerators(incident: any) {
    // Implementation depends on your notification system
    this.logger.warn('High priority incident requires moderator attention', {
      incidentId: incident.id,
      type: incident.type,
      urgencyLevel: incident.urgencyLevel,
    });
    
    // TODO: Send actual notifications via email/SMS/push
  }

  /**
   * Send follow-up notification
   */
  private async sendFollowUpNotification(incident: any) {
    // Implementation depends on your notification system
    this.logger.log('Sending follow-up notification', {
      incidentId: incident.id,
      userId: incident.userId,
    });

    // Mark follow-up as completed
    await this.prisma.crisisIncident.update({
      where: { id: incident.id },
      data: {
        followupCompleted: true,
      },
    });
  }

  /**
   * Update volunteer rating
   */
  private async updateVolunteerRating(volunteerId: string, newRating: number) {
    const volunteer = await this.prisma.crisisVolunteer.findUnique({
      where: { id: volunteerId },
    });

    if (!volunteer) return;

    const currentTotal = (volunteer.avgRating || 0) * volunteer.casesHandled;
    const newAverage = (currentTotal + newRating) / (volunteer.casesHandled + 1);

    await this.prisma.crisisVolunteer.update({
      where: { id: volunteerId },
      data: {
        avgRating: newAverage,
        casesHandled: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Format emergency contacts for response
   */
  private formatEmergencyContacts(contacts: any) {
    return Object.values(contacts).map((contact: any) => ({
      name: contact.name,
      number: contact.number || contact.alternateNumber,
      available24x7: contact.available24x7,
    }));
  }
}