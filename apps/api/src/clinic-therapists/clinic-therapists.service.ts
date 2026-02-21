import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ListTherapistsQueryDto,
  TherapistScheduleQueryDto,
  UpdateCredentialsDto,
} from './dto/clinic-therapists.dto';

@Injectable()
export class ClinicTherapistsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTherapists(query: ListTherapistsQueryDto) {
    const { search, specialty, availability, credentialStatus } = query;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const profiles = await this.prisma.therapistProfile.findMany({
      where: {
        isActive: true,
        ...(credentialStatus ? { credentialStatus } : {}),
        ...(specialty
          ? { specializations: { has: specialty } }
          : {}),
        ...(search
          ? {
              user: {
                OR: [
                  { name: { contains: search, mode: 'insensitive' as const } },
                  { email: { contains: search, mode: 'insensitive' as const } },
                ],
              },
            }
          : {}),
      },
      select: {
        id: true,
        bio: true,
        title: true,
        specializations: true,
        credentials: true,
        yearsExperience: true,
        languages: true,
        overallRating: true,
        totalSessions: true,
        acceptingBookings: true,
        credentialStatus: true,
        licenceNumber: true,
        licenceExpiry: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            phone: true,
            createdAt: true,
          },
        },
        bookings: {
          where: {
            startDateTime: { gte: today },
            endDateTime: { lt: tomorrow },
            status: { in: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'] },
          },
          select: { id: true, status: true, startDateTime: true, endDateTime: true },
        },
        primaryCases: {
          where: { status: 'ACTIVE' },
          select: { id: true },
        },
        caseAssignments: {
          where: { removedAt: null },
          select: {
            caseId: true,
            case: { select: { id: true, status: true } },
          },
        },
        availability: {
          where: { isActive: true },
          select: { dayOfWeek: true, startTime: true, endTime: true },
        },
      },
      orderBy: { user: { name: 'asc' } },
    });

    const data = profiles.map((p) => {
      const todayDow = today.getDay();
      const hasAvailabilityToday = p.availability.some(
        (a) => a.dayOfWeek === todayDow,
      );
      const todayBookingsCount = p.bookings.length;

      // Determine availability status
      let availabilityStatus: 'available' | 'busy' | 'off';
      if (!hasAvailabilityToday) {
        availabilityStatus = 'off';
      } else if (todayBookingsCount > 0) {
        // Check if currently in a session
        const now = new Date();
        const inSession = p.bookings.some(
          (b) =>
            new Date(b.startDateTime) <= now && new Date(b.endDateTime) >= now,
        );
        availabilityStatus = inSession ? 'busy' : 'available';
      } else {
        availabilityStatus = 'available';
      }

      // Count active cases (union of primary + assignments)
      const primaryCaseIds = new Set(p.primaryCases.map((c) => c.id));
      const assignedCaseIds = p.caseAssignments
        .filter((a) => a.case && a.case.status === 'ACTIVE')
        .map((a) => a.case!.id);
      assignedCaseIds.forEach((id) => primaryCaseIds.add(id));
      const activeCaseCount = primaryCaseIds.size;

      return {
        id: p.id,
        userId: p.user.id,
        name: p.user.name,
        email: p.user.email,
        avatar: p.user.image,
        phone: p.user.phone,
        bio: p.bio,
        title: p.title,
        specializations: p.specializations,
        credentials: p.credentials,
        yearsExperience: p.yearsExperience,
        languages: p.languages,
        overallRating: p.overallRating,
        totalSessions: p.totalSessions,
        acceptingBookings: p.acceptingBookings,
        credentialStatus: p.credentialStatus,
        licenceNumber: p.licenceNumber,
        licenceExpiry: p.licenceExpiry,
        activeCaseCount,
        todayAppointments: todayBookingsCount,
        availabilityStatus,
        joinedAt: p.user.createdAt,
      };
    });

    // Apply availability filter after computation
    const filtered = availability
      ? data.filter((d) => d.availabilityStatus === availability)
      : data;

    return filtered;
  }

  async getTherapistDetail(therapistProfileId: string) {
    const profile = await this.prisma.therapistProfile.findUnique({
      where: { id: therapistProfileId },
      select: {
        id: true,
        bio: true,
        title: true,
        specializations: true,
        credentials: true,
        yearsExperience: true,
        languages: true,
        defaultTimezone: true,
        overallRating: true,
        totalSessions: true,
        totalRatings: true,
        acceptingBookings: true,
        credentialStatus: true,
        licenceNumber: true,
        licenceExpiry: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            phone: true,
            createdAt: true,
          },
        },
        availability: {
          where: { isActive: true },
          orderBy: { dayOfWeek: 'asc' },
          select: { dayOfWeek: true, startTime: true, endTime: true },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Therapist not found');
    }

    // Get active cases with patient info
    const cases = await this.prisma.case.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { primaryTherapistId: therapistProfileId },
          {
            therapists: {
              some: { therapistId: therapistProfileId, removedAt: null },
            },
          },
        ],
      },
      select: {
        id: true,
        caseNumber: true,
        status: true,
        diagnosis: true,
        openedAt: true,
        child: {
          select: {
            id: true,
            firstName: true,
            nickname: true,
            dateOfBirth: true,
            clinicStatus: true,
          },
        },
        sessions: {
          orderBy: { scheduledAt: 'desc' },
          take: 1,
          select: { scheduledAt: true, attendanceStatus: true },
        },
      },
      orderBy: { openedAt: 'desc' },
    });

    // Get this month's session count
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const monthSessions = await this.prisma.booking.count({
      where: {
        therapistId: profile.id,
        startDateTime: { gte: monthStart, lte: monthEnd },
        status: { in: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'] },
      },
    });

    // Get past 4 weeks session count for avg
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const recentSessions = await this.prisma.booking.count({
      where: {
        therapistId: profile.id,
        startDateTime: { gte: fourWeeksAgo },
        status: { in: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'] },
      },
    });

    return {
      id: profile.id,
      userId: profile.user.id,
      name: profile.user.name,
      email: profile.user.email,
      avatar: profile.user.image,
      phone: profile.user.phone,
      bio: profile.bio,
      title: profile.title,
      specializations: profile.specializations,
      credentials: profile.credentials,
      yearsExperience: profile.yearsExperience,
      languages: profile.languages,
      defaultTimezone: profile.defaultTimezone,
      overallRating: profile.overallRating,
      totalSessions: profile.totalSessions,
      totalRatings: profile.totalRatings,
      acceptingBookings: profile.acceptingBookings,
      credentialStatus: profile.credentialStatus,
      licenceNumber: profile.licenceNumber,
      licenceExpiry: profile.licenceExpiry,
      joinedAt: profile.user.createdAt,
      availability: profile.availability.map((a) => ({
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
      })),
      caseload: cases.map((c) => ({
        caseId: c.id,
        caseNumber: c.caseNumber,
        status: c.status,
        diagnosis: c.diagnosis,
        openedAt: c.openedAt,
        patient: {
          id: c.child.id,
          name: c.child.firstName,
          nickname: c.child.nickname,
          dateOfBirth: c.child.dateOfBirth,
          clinicStatus: c.child.clinicStatus,
        },
        lastSession: c.sessions[0]
          ? {
              scheduledAt: c.sessions[0].scheduledAt,
              attendanceStatus: c.sessions[0].attendanceStatus,
            }
          : null,
      })),
      performance: {
        sessionsThisMonth: monthSessions,
        avgSessionsPerWeek: Math.round((recentSessions / 4) * 10) / 10,
        activeCases: cases.length,
      },
    };
  }

  async getTherapistSchedule(
    therapistProfileId: string,
    query: TherapistScheduleQueryDto,
  ) {
    const exists = await this.prisma.therapistProfile.findUnique({
      where: { id: therapistProfileId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Therapist not found');
    }

    const { startDate, endDate } = this.parseDateRange(query);

    const bookings = await this.prisma.booking.findMany({
      where: {
        therapistId: therapistProfileId,
        startDateTime: { gte: startDate },
        endDateTime: { lte: endDate },
        status: { notIn: ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_THERAPIST'] },
      },
      select: {
        id: true,
        startDateTime: true,
        endDateTime: true,
        status: true,
        timezone: true,
        patient: {
          select: { id: true, name: true, image: true },
        },
        sessionType: {
          select: { id: true, name: true },
        },
      },
      orderBy: { startDateTime: 'asc' },
    });

    return bookings.map((b) => ({
      id: b.id,
      startDateTime: b.startDateTime,
      endDateTime: b.endDateTime,
      status: b.status,
      patient: b.patient
        ? { id: b.patient.id, name: b.patient.name, avatar: b.patient.image }
        : null,
      sessionType: b.sessionType?.name || null,
      timezone: b.timezone,
    }));
  }

  async getConsolidatedSchedule(query: TherapistScheduleQueryDto) {
    const { startDate, endDate } = this.parseDateRange(query);

    const whereClause: any = {
      startDateTime: { gte: startDate },
      endDateTime: { lte: endDate },
      status: { notIn: ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_THERAPIST'] },
    };

    if (query.therapistId) {
      whereClause.therapistId = query.therapistId;
    }

    const bookings = await this.prisma.booking.findMany({
      where: whereClause,
      select: {
        id: true,
        startDateTime: true,
        endDateTime: true,
        status: true,
        timezone: true,
        therapistId: true,
        therapist: {
          select: {
            user: { select: { id: true, name: true, image: true } },
          },
        },
        patient: {
          select: { id: true, name: true, image: true },
        },
        sessionType: {
          select: { id: true, name: true },
        },
      },
      orderBy: { startDateTime: 'asc' },
    });

    // Group by therapist
    const therapistMap = new Map<
      string,
      { id: string; userId: string; name: string; avatar: string | null; appointments: any[] }
    >();

    for (const b of bookings) {
      const tId = b.therapistId;
      if (!therapistMap.has(tId)) {
        therapistMap.set(tId, {
          id: tId,
          userId: b.therapist.user.id,
          name: b.therapist.user.name || 'Unknown',
          avatar: b.therapist.user.image,
          appointments: [],
        });
      }
      therapistMap.get(tId)!.appointments.push({
        id: b.id,
        startDateTime: b.startDateTime,
        endDateTime: b.endDateTime,
        status: b.status,
        patient: b.patient
          ? { id: b.patient.id, name: b.patient.name, avatar: b.patient.image }
          : null,
        sessionType: b.sessionType?.name || null,
        timezone: b.timezone,
      });
    }

    // If filtering by a specific therapist, only include active therapists with that ID
    // Otherwise, include all active therapists so empty columns show up
    if (!query.therapistId) {
      const allTherapists = await this.prisma.therapistProfile.findMany({
        where: { isActive: true },
        select: {
          id: true,
          user: { select: { id: true, name: true, image: true } },
        },
        orderBy: { user: { name: 'asc' } },
      });

      for (const t of allTherapists) {
        if (!therapistMap.has(t.id)) {
          therapistMap.set(t.id, {
            id: t.id,
            userId: t.user.id,
            name: t.user.name || 'Unknown',
            avatar: t.user.image,
            appointments: [],
          });
        }
      }
    }

    return {
      date: startDate.toISOString().split('T')[0],
      therapists: Array.from(therapistMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    };
  }

  async updateCredentials(
    therapistProfileId: string,
    dto: UpdateCredentialsDto,
  ) {
    const exists = await this.prisma.therapistProfile.findUnique({
      where: { id: therapistProfileId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Therapist not found');
    }

    const data: any = {};
    if (dto.licenceNumber !== undefined) data.licenceNumber = dto.licenceNumber;
    if (dto.licenceExpiry !== undefined)
      data.licenceExpiry = new Date(dto.licenceExpiry);
    if (dto.credentialStatus !== undefined)
      data.credentialStatus = dto.credentialStatus;

    return this.prisma.therapistProfile.update({
      where: { id: therapistProfileId },
      data,
      select: {
        id: true,
        licenceNumber: true,
        licenceExpiry: true,
        credentialStatus: true,
      },
    });
  }

  private parseDateRange(query: TherapistScheduleQueryDto) {
    let startDate: Date;
    let endDate: Date;

    if (query.startDate && query.endDate) {
      startDate = new Date(query.startDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(query.endDate);
      endDate.setHours(23, 59, 59, 999);
    } else if (query.date) {
      startDate = new Date(query.date);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(query.date);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default to today
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }

    return { startDate, endDate, date: query.date };
  }
}
