import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  ListPatientsQueryDto,
  UpdatePatientStatusDto,
  AssignTherapistDto,
} from './dto/clinic-patients.dto';

@Injectable()
export class ClinicPatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPatients(query: ListPatientsQueryDto) {
    const {
      search,
      status,
      therapistId,
      ageMin,
      ageMax,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.ChildWhereInput = {};

    if (status && status.length > 0) {
      where.clinicStatus = { in: status };
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { nickname: { contains: search, mode: 'insensitive' } },
        {
          profile: {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              {
                user: {
                  OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                  ],
                },
              },
            ],
          },
        },
      ];
    }

    if (ageMin !== undefined || ageMax !== undefined) {
      const now = new Date();
      if (ageMax !== undefined) {
        const minDob = new Date(now.getFullYear() - ageMax - 1, now.getMonth(), now.getDate());
        where.dateOfBirth = { ...((where.dateOfBirth as object) || {}), gte: minDob };
      }
      if (ageMin !== undefined) {
        const maxDob = new Date(now.getFullYear() - ageMin, now.getMonth(), now.getDate());
        where.dateOfBirth = { ...((where.dateOfBirth as object) || {}), lte: maxDob };
      }
    }

    if (therapistId) {
      where.cases = {
        some: {
          therapists: {
            some: {
              therapistId,
              removedAt: null,
            },
          },
        },
      };
    }

    const orderBy: Prisma.ChildOrderByWithRelationInput =
      sortBy === 'firstName'
        ? { firstName: sortOrder }
        : sortBy === 'dateOfBirth'
          ? { dateOfBirth: sortOrder }
          : { createdAt: sortOrder };

    const [patients, total] = await Promise.all([
      this.prisma.child.findMany({
        where,
        include: {
          profile: {
            include: {
              user: {
                select: { id: true, name: true, email: true, phone: true, image: true },
              },
            },
          },
          conditions: true,
          cases: {
            where: { status: { not: 'ARCHIVED' } },
            include: {
              primaryTherapist: {
                include: {
                  user: {
                    select: { id: true, name: true, image: true },
                  },
                },
              },
              sessions: {
                orderBy: { scheduledAt: 'desc' },
                take: 1,
                select: { scheduledAt: true },
              },
            },
          },
          assessments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              status: true,
              completedAt: true,
              overallScore: true,
              domainScores: true,
            },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.child.count({ where }),
    ]);

    const data = patients.map((child) => {
      const parentUser = child.profile?.user;
      const activeCases = child.cases.filter((c) => c.status === 'ACTIVE');
      const therapistUser = activeCases[0]?.primaryTherapist?.user || null;
      const lastSession = child.cases
        .flatMap((c) => c.sessions)
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0];
      const lastAssessment = child.assessments[0] || null;
      const lastActivity = lastSession?.scheduledAt || lastAssessment?.completedAt || child.updatedAt;

      return {
        id: child.id,
        firstName: child.firstName,
        nickname: child.nickname,
        dateOfBirth: child.dateOfBirth,
        gender: child.gender,
        clinicStatus: child.clinicStatus,
        createdAt: child.createdAt,
        conditions: child.conditions.map((c) => ({
          type: c.conditionType,
          severity: c.severity,
        })),
        parent: parentUser
          ? {
              id: parentUser.id,
              name: parentUser.name,
              email: parentUser.email,
              phone: parentUser.phone,
              avatar: parentUser.image,
            }
          : null,
        assignedTherapist: therapistUser
          ? {
              id: therapistUser.id,
              name: therapistUser.name,
              avatar: therapistUser.image,
            }
          : null,
        activeCaseCount: activeCases.length,
        lastActivity,
        latestScreening: lastAssessment
          ? {
              status: lastAssessment.status,
              completedAt: lastAssessment.completedAt,
              overallScore: lastAssessment.overallScore,
            }
          : null,
      };
    });

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPatientDetail(childId: string) {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      include: {
        profile: {
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true, image: true, role: true },
            },
          },
        },
        conditions: true,
        cases: {
          include: {
            primaryTherapist: {
              include: {
                user: {
                  select: { id: true, name: true, image: true, specialization: true },
                },
              },
            },
            therapists: {
              where: { removedAt: null },
              include: {
                therapist: {
                  include: {
                    user: {
                      select: { id: true, name: true, image: true },
                    },
                  },
                },
              },
            },
            sessions: {
              orderBy: { scheduledAt: 'desc' },
              take: 10,
              include: {
                therapist: {
                  select: { id: true, name: true },
                },
              },
            },
            ieps: {
              where: { status: { in: ['ACTIVE', 'APPROVED'] } },
              include: {
                goals: { orderBy: { order: 'asc' } },
              },
            },
          },
        },
        assessments: {
          orderBy: { createdAt: 'desc' },
          include: {
            reports: {
              orderBy: { generatedAt: 'desc' },
              take: 1,
            },
          },
        },
        miraConversations: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: { id: true, title: true, updatedAt: true },
        },
      },
    });

    if (!child) {
      throw new NotFoundException('Patient not found');
    }

    const parentUser = child.profile?.user;

    return {
      id: child.id,
      firstName: child.firstName,
      nickname: child.nickname,
      dateOfBirth: child.dateOfBirth,
      gender: child.gender,
      clinicStatus: child.clinicStatus,
      createdAt: child.createdAt,
      demographics: {
        address: child.address,
        city: child.city,
        state: child.state,
        nationality: child.nationality,
        primaryLanguage: child.primaryLanguage,
        schoolType: child.schoolType,
        grade: child.grade,
        currentSchool: child.currentSchool,
      },
      health: {
        hasCondition: child.hasCondition,
        diagnosisStatus: child.diagnosisStatus,
        conditions: child.conditions,
        takingMedications: child.takingMedications,
        medicationDetails: child.medicationDetails,
        developmentalConcerns: child.developmentalConcerns,
        delayedMilestones: child.delayedMilestones,
        delayedMilestonesDetails: child.delayedMilestonesDetails,
      },
      parent: parentUser
        ? {
            id: parentUser.id,
            name: parentUser.name,
            email: parentUser.email,
            phone: parentUser.phone,
            avatar: parentUser.image,
          }
        : null,
      parentProfile: child.profile
        ? {
            fullName: child.profile.fullName,
            phoneNumber: child.profile.phoneNumber,
            alternatePhone: child.profile.alternatePhone,
            email: child.profile.email,
            relationshipToChild: child.profile.relationshipToChild,
          }
        : null,
      cases: child.cases.map((c) => ({
        id: c.id,
        caseNumber: c.caseNumber,
        status: c.status,
        diagnosis: c.diagnosis,
        openedAt: c.openedAt,
        primaryTherapist: c.primaryTherapist?.user
          ? {
              id: c.primaryTherapist.user.id,
              name: c.primaryTherapist.user.name,
              avatar: c.primaryTherapist.user.image,
              specialization: c.primaryTherapist.user.specialization,
            }
          : null,
        therapists: c.therapists.map((t) => ({
          id: t.therapist.user.id,
          name: t.therapist.user.name,
          role: t.role,
        })),
        goalCount: c.ieps.reduce((sum, iep) => sum + iep.goals.length, 0),
        sessions: c.sessions.map((s) => ({
          id: s.id,
          scheduledAt: s.scheduledAt,
          attendanceStatus: s.attendanceStatus,
          sessionType: s.sessionType,
          noteFormat: s.noteFormat,
          therapist: s.therapist ? { id: s.therapist.id, name: s.therapist.name } : null,
        })),
      })),
      assessments: child.assessments.map((a) => ({
        id: a.id,
        status: a.status,
        overallScore: a.overallScore,
        domainScores: a.domainScores,
        flaggedDomains: a.flaggedDomains,
        completedAt: a.completedAt,
        createdAt: a.createdAt,
        hasReport: a.reports.length > 0,
      })),
      latestMiraConversation: child.miraConversations[0] || null,
    };
  }

  async updatePatientStatus(childId: string, dto: UpdatePatientStatusDto) {
    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child) {
      throw new NotFoundException('Patient not found');
    }

    return this.prisma.child.update({
      where: { id: childId },
      data: { clinicStatus: dto.status },
      select: { id: true, firstName: true, clinicStatus: true },
    });
  }

  async assignTherapist(childId: string, dto: AssignTherapistDto) {
    const child = await this.prisma.child.findUnique({ where: { id: childId } });
    if (!child) {
      throw new NotFoundException('Patient not found');
    }

    // Look up the TherapistProfile for this user
    const therapistProfile = await this.prisma.therapistProfile.findUnique({
      where: { userId: dto.therapistId },
      include: { user: { select: { role: true } } },
    });
    if (!therapistProfile) {
      throw new NotFoundException('Therapist profile not found');
    }
    if (therapistProfile.user.role !== 'THERAPIST' && therapistProfile.user.role !== 'EDUCATOR') {
      throw new NotFoundException('User is not a therapist');
    }

    // Check if an active case already exists for this child
    const existingCase = await this.prisma.case.findFirst({
      where: { childId, status: 'ACTIVE' },
    });

    if (existingCase) {
      const existingAssignment = await this.prisma.caseTherapist.findFirst({
        where: {
          caseId: existingCase.id,
          therapistId: therapistProfile.id,
          removedAt: null,
        },
      });

      if (!existingAssignment) {
        await this.prisma.caseTherapist.create({
          data: {
            caseId: existingCase.id,
            therapistId: therapistProfile.id,
            role: 'PRIMARY',
          },
        });
      }

      return { caseId: existingCase.id, action: 'therapist_added' };
    }

    // Create a new case
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const caseNumber = `CM-${dateStr}-${random}`;

    const newCase = await this.prisma.case.create({
      data: {
        caseNumber,
        childId,
        primaryTherapistId: therapistProfile.id,
        diagnosis: dto.diagnosis || null,
        notes: dto.notes || null,
        status: 'ACTIVE',
        openedAt: now,
        therapists: {
          create: {
            therapistId: therapistProfile.id,
            role: 'PRIMARY',
          },
        },
      },
    });

    // Move child to ACTIVE status
    await this.prisma.child.update({
      where: { id: childId },
      data: { clinicStatus: 'ACTIVE' },
    });

    return { caseId: newCase.id, caseNumber: newCase.caseNumber, action: 'case_created' };
  }

  async getTherapistsList() {
    const profiles = await this.prisma.therapistProfile.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, specialization: true },
        },
      },
      orderBy: { user: { name: 'asc' } },
    });

    return profiles.map((p) => ({
      id: p.user.id,
      profileId: p.id,
      name: p.user.name,
      email: p.user.email,
      avatar: p.user.image,
      specializations: p.specializations,
      userSpecialization: p.user.specialization,
    }));
  }
}
