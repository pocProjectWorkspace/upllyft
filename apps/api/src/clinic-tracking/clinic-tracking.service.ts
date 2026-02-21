import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrackingStatus } from '@prisma/client';
import { UpdateTrackingStatusDto } from './dto/clinic-tracking.dto';

@Injectable()
export class ClinicTrackingService {
  constructor(private readonly prisma: PrismaService) {}

  async getTodayAppointments(date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await this.prisma.booking.findMany({
      where: {
        startDateTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: [
            'CONFIRMED',
            'IN_PROGRESS',
            'COMPLETED',
            'CANCELLED_BY_PATIENT',
            'CANCELLED_BY_THERAPIST',
            'NO_SHOW_PATIENT',
            'NO_SHOW_THERAPIST',
          ],
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            image: true,
          },
        },
        therapist: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        sessionType: {
          select: {
            id: true,
            name: true,
            duration: true,
          },
        },
        caseSession: {
          include: {
            case: {
              include: {
                child: {
                  select: {
                    id: true,
                    firstName: true,
                    nickname: true,
                    dateOfBirth: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        startDateTime: 'asc',
      },
    });

    return bookings.map((booking) => {
      const child = booking.caseSession?.case?.child;
      const trackingStatus = this.resolveTrackingStatus(booking);

      return {
        id: booking.id,
        scheduledTime: booking.startDateTime.toISOString(),
        endTime: booking.endDateTime.toISOString(),
        status: trackingStatus,
        trackingStatus: booking.trackingStatus,
        checkedInAt: booking.checkedInAt?.toISOString() || null,
        sessionStartedAt: booking.sessionStartedAt?.toISOString() || null,
        sessionEndedAt: booking.sessionEndedAt?.toISOString() || null,
        child: child
          ? {
              id: child.id,
              firstName: child.firstName,
              nickname: child.nickname,
              age: this.calculateAge(child.dateOfBirth),
            }
          : null,
        parent: {
          id: booking.patient.id,
          name: booking.patient.name || 'Unknown',
          phone: booking.patient.phone || null,
        },
        therapist: {
          id: booking.therapist.id,
          name: booking.therapist.user.name || 'Unknown',
          avatar: booking.therapist.user.image || null,
        },
        sessionType: booking.sessionType?.name || null,
        duration: booking.duration,
        notes: booking.receptionistNotes || null,
        caseId: booking.caseSession?.caseId || null,
      };
    });
  }

  async updateTrackingStatus(bookingId: string, dto: UpdateTrackingStatusDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const now = new Date();
    const updateData: Record<string, any> = {
      trackingStatus: dto.status,
    };

    if (dto.notes !== undefined) {
      updateData.receptionistNotes = dto.notes;
    }

    switch (dto.status) {
      case TrackingStatus.WAITING:
        updateData.checkedInAt = now;
        break;
      case TrackingStatus.IN_SESSION:
        updateData.sessionStartedAt = now;
        // Also update booking status to IN_PROGRESS
        updateData.status = 'IN_PROGRESS';
        break;
      case TrackingStatus.COMPLETED:
        updateData.sessionEndedAt = now;
        updateData.status = 'COMPLETED';
        updateData.sessionCompletedAt = now;
        break;
      case TrackingStatus.CANCELLED:
        updateData.status = 'CANCELLED_BY_THERAPIST';
        updateData.cancelledAt = now;
        if (dto.notes) {
          updateData.cancellationReason = dto.notes;
        }
        break;
      case TrackingStatus.NO_SHOW:
        updateData.status = 'NO_SHOW_PATIENT';
        break;
      case TrackingStatus.SCHEDULED:
        // Reset tracking — move back to scheduled
        updateData.checkedInAt = null;
        updateData.sessionStartedAt = null;
        updateData.sessionEndedAt = null;
        break;
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
      include: {
        patient: {
          select: { id: true, name: true, phone: true },
        },
        therapist: {
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
        },
        sessionType: { select: { id: true, name: true, duration: true } },
        caseSession: {
          include: {
            case: {
              include: {
                child: {
                  select: {
                    id: true,
                    firstName: true,
                    nickname: true,
                    dateOfBirth: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const child = updated.caseSession?.case?.child;

    return {
      id: updated.id,
      scheduledTime: updated.startDateTime.toISOString(),
      endTime: updated.endDateTime.toISOString(),
      status: this.resolveTrackingStatus(updated),
      trackingStatus: updated.trackingStatus,
      checkedInAt: updated.checkedInAt?.toISOString() || null,
      sessionStartedAt: updated.sessionStartedAt?.toISOString() || null,
      sessionEndedAt: updated.sessionEndedAt?.toISOString() || null,
      child: child
        ? {
            id: child.id,
            firstName: child.firstName,
            nickname: child.nickname,
            age: this.calculateAge(child.dateOfBirth),
          }
        : null,
      parent: {
        id: updated.patient.id,
        name: updated.patient.name || 'Unknown',
        phone: updated.patient.phone || null,
      },
      therapist: {
        id: updated.therapist.id,
        name: updated.therapist.user.name || 'Unknown',
        avatar: updated.therapist.user.image || null,
      },
      sessionType: updated.sessionType?.name || null,
      duration: updated.duration,
      notes: updated.receptionistNotes || null,
      caseId: updated.caseSession?.caseId || null,
    };
  }

  private resolveTrackingStatus(booking: {
    trackingStatus: TrackingStatus | null;
    status: string;
  }): string {
    // If explicit tracking status is set, use it
    if (booking.trackingStatus) {
      return booking.trackingStatus;
    }

    // Fall back to deriving from booking status
    switch (booking.status) {
      case 'CONFIRMED':
      case 'ACCEPTED':
        return 'SCHEDULED';
      case 'IN_PROGRESS':
        return 'IN_SESSION';
      case 'COMPLETED':
        return 'COMPLETED';
      case 'CANCELLED_BY_PATIENT':
      case 'CANCELLED_BY_THERAPIST':
        return 'CANCELLED';
      case 'NO_SHOW_PATIENT':
      case 'NO_SHOW_THERAPIST':
        return 'NO_SHOW';
      default:
        return 'SCHEDULED';
    }
  }

  private calculateAge(dateOfBirth: Date): number {
    const now = new Date();
    let age = now.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = now.getMonth() - dateOfBirth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && now.getDate() < dateOfBirth.getDate())
    ) {
      age--;
    }
    return age;
  }
}
