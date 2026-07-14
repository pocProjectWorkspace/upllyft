import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import {
  ListPatientsQueryDto,
  UpdatePatientStatusDto,
  AssignTherapistDto,
  CreateWalkinPatientDto,
} from './dto/clinic-patients.dto';
import { NotificationService, NotificationType } from '../notification/notification.service';
import {
  childInFacility,
  attachChildToFacility,
  therapistInFacility,
} from '../common/child-scope';
import { assertTherapistAssignable } from '../common/credentials';
import { assertChildAccess } from '../common/consent';
import { resolveParentContact } from '../common/parent-contact';
import { ClaimsService, type GuardianDetails } from '../child-claims/claims.service';

@Injectable()
export class ClinicPatientsService {
  private readonly logger = new Logger(ClinicPatientsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly claims: ClaimsService,
  ) { }

  async listPatients(query: ListPatientsQueryDto, clinicId: string | null) {
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

    // Phase D: scoped by affiliation, not Child.clinicId.
    const where: Prisma.ChildWhereInput = { ...childInFacility(clinicId) };

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
          guardians: {
            select: { fullName: true, email: true, phone: true, userId: true, isPrimaryContact: true },
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
          // Surface consent state on the roster so a facility can CHASE a missing
          // consent rather than just hitting a wall when it opens the record.
          consents: {
            where: { revokedAt: null, ...(clinicId ? { facilityId: clinicId } : {}) },
            select: { type: true },
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
        // Prefers the Guardian row over a synthetic shadow account — see
        // common/parent-contact.ts. `onPlatform: false` means they have not claimed
        // the child yet and can see nothing.
        parent: resolveParentContact(child),
        assignedTherapist: therapistUser
          ? {
            id: therapistUser.id,
            name: therapistUser.name,
            avatar: therapistUser.image,
          }
          : null,
        activeCaseCount: activeCases.length,
        lastActivity,
        // false => the record is locked until a guardian consents. Chase it.
        consentGranted: child.consents.some((c) => c.type === 'ASSESSMENT'),
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

  /**
   * Opening a child's record requires the guardian's consent.
   *
   * The gate binds HERE, on detail, rather than on the roster list. A facility may
   * see who is affiliated to it — it enrolled them, and it needs to know who is
   * awaiting consent in order to chase it. It may NOT open the record until a
   * guardian has agreed. That is the line: knowing a child exists is not the same as
   * reading their developmental history.
   *
   * Grants come from the guardian (POST /child-consent/grant), from intake Section E,
   * or from an e-signed form. Never seeded on a family's behalf.
   */
  async getPatientDetail(childId: string, clinicId: string | null) {
    await assertChildAccess(this.prisma, {
      childId,
      facilityId: clinicId,
      capability: 'canObserve',
      requiredScope: 'CLINICAL_SUMMARY',
      consentType: 'ASSESSMENT',
    });

    const child = await this.prisma.child.findFirst({
      where: {
        id: childId,
        ...childInFacility(clinicId),
      },
      include: {
        profile: {
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true, image: true, role: true },
            },
          },
        },
        guardians: {
          select: { fullName: true, email: true, phone: true, userId: true, isPrimaryContact: true },
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
    const parentContact = resolveParentContact(child);

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
      // Prefers the Guardian row over a synthetic shadow account — see
      // common/parent-contact.ts.
      parent: parentContact,
      parentProfile: child.profile
        ? {
          fullName: parentContact?.name ?? child.profile.fullName,
          phoneNumber: parentContact?.phone ?? child.profile.phoneNumber,
          alternatePhone: child.profile.alternatePhone,
          // NEVER the shadow profile's synthetic address.
          email: parentContact?.email ?? null,
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

  async updatePatientStatus(childId: string, dto: UpdatePatientStatusDto, clinicId: string | null) {
    const child = await this.prisma.child.findFirst({
      where: {
        id: childId,
        ...childInFacility(clinicId),
      }
    });
    if (!child) {
      throw new NotFoundException('Patient not found');
    }

    return this.prisma.child.update({
      where: { id: child.id },
      data: { clinicStatus: dto.status },
      select: { id: true, firstName: true, clinicStatus: true },
    });
  }

  async assignTherapist(childId: string, dto: AssignTherapistDto, clinicId: string | null) {
    const child = await this.prisma.child.findFirst({
      where: {
        id: childId,
        ...childInFacility(clinicId),
      }
    });
    if (!child) {
      throw new NotFoundException('Patient not found');
    }

    // Look up the TherapistProfile for this user
    const therapistProfile = await this.prisma.therapistProfile.findUnique({
      where: { userId: dto.therapistId },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
    if (!therapistProfile) {
      throw new NotFoundException('Therapist profile not found');
    }
    if (therapistProfile.user.role !== 'THERAPIST' && therapistProfile.user.role !== 'EDUCATOR') {
      throw new NotFoundException('User is not a therapist');
    }

    // The licence gate. This path creates cases and CaseTherapist rows exactly like
    // cases.service.createCase — but only that one enforced it, so an unverified
    // clinician could be put on a case through the admin route while the same action
    // was refused through the therapist route. A gate enforced on one path is not a
    // gate.
    assertTherapistAssignable(therapistProfile);

    // Fetch parent userId for notifications
    const childWithProfile = await this.prisma.child.findUnique({
      where: { id: childId },
      include: { profile: { select: { userId: true } } },
    });
    const parentUserId = childWithProfile?.profile?.userId;
    const therapistName = therapistProfile.user.name || 'A therapist';
    const childName = child.firstName;

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

      if (existingAssignment) {
        return { caseId: existingCase.id, action: 'therapist_added', warning: 'therapist_already_assigned' };
      }

      // Joining an EXISTING case: this therapist is a SECONDARY — the case already
      // has a primary. Hardcoding PRIMARY here produced multiple PRIMARY rows on a
      // single case (CaseAccessGuard derives isPrimary from Case.primaryTherapistId,
      // not from this role, so the extra "PRIMARY" was a lie that granted nothing).
      //
      // permissions MUST be set. CaseAccessGuard falls through to
      // `permissions.canEdit` for anyone who is not the case's primary — and an
      // empty `{}` means canEdit === undefined === denied. That is why a therapist
      // assigned through this path could open a case but not create an IEP.
      await this.prisma.caseTherapist.create({
        data: {
          caseId: existingCase.id,
          therapistId: therapistProfile.id,
          role: 'SECONDARY',
          permissions: { canEdit: true, canViewNotes: true, canManageGoals: true },
        },
      });

      // Notify therapist about the existing case assignment
      this.sendAssignmentNotifications({
        caseId: existingCase.id,
        therapistUserId: dto.therapistId,
        therapistName,
        childName,
        parentUserId,
      });

      return { caseId: existingCase.id, action: 'therapist_added', warning: 'added_to_existing_case' };
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
            // Same bug as above: without this the row is created with `{}` and the
            // therapist cannot edit their own case.
            permissions: { canEdit: true, canViewNotes: true, canManageGoals: true },
          },
        },
      },
    });

    // Move child to ACTIVE status
    await this.prisma.child.update({
      where: { id: childId },
      data: { clinicStatus: 'ACTIVE' },
    });

    // Screening carry-forward: link latest completed assessment to case notes
    try {
      const latestAssessment = await this.prisma.assessment.findFirst({
        where: { childId, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        select: { id: true, flaggedDomains: true, completedAt: true },
      });

      if (latestAssessment) {
        const flaggedStr = latestAssessment.flaggedDomains.length > 0
          ? latestAssessment.flaggedDomains.join(', ')
          : 'none';
        const screeningNote = `Linked to screening ${latestAssessment.id}. Flagged domains: ${flaggedStr}`;
        const existingNotes = newCase.notes || dto.notes || '';
        await this.prisma.case.update({
          where: { id: newCase.id },
          data: {
            referralSource: 'Screening Assessment',
            notes: existingNotes ? `${existingNotes}\n${screeningNote}` : screeningNote,
          },
        });
      }
    } catch (error) {
      this.logger.error('Failed to link screening data to case:', error);
    }

    // Send notifications for new case creation
    this.sendAssignmentNotifications({
      caseId: newCase.id,
      therapistUserId: dto.therapistId,
      therapistName,
      childName,
      parentUserId,
      isNewCase: true,
    });

    return { caseId: newCase.id, caseNumber: newCase.caseNumber, action: 'case_created' };
  }

  /**
   * Send notifications when a therapist is assigned to a case.
   * Fire-and-forget to avoid blocking the response.
   */
  private async sendAssignmentNotifications(params: {
    caseId: string;
    therapistUserId: string;
    therapistName: string;
    childName: string;
    parentUserId?: string | null;
    isNewCase?: boolean;
  }) {
    const { caseId, therapistUserId, therapistName, childName, parentUserId, isNewCase } = params;

    try {
      // Notify therapist
      await this.notificationService.createNotification({
        userId: therapistUserId,
        type: NotificationType.CASE_ASSIGNED,
        title: 'New Case Assigned',
        message: `New case assigned: ${childName}. View case →`,
        actionUrl: `/cases/${caseId}`,
        relatedEntityId: caseId,
        relatedEntityType: 'case',
        priority: 'high',
      });

      // Notify parent
      if (parentUserId) {
        await this.notificationService.createNotification({
          userId: parentUserId,
          type: NotificationType.THERAPIST_ASSIGNED,
          title: 'Therapist Assigned',
          message: `Great news! ${therapistName} has been assigned to ${childName}'s care.`,
          relatedEntityId: caseId,
          relatedEntityType: 'case',
        });
      }

      // Notify admins (case created/updated confirmation)
      if (isNewCase) {
        const admins = await this.prisma.user.findMany({
          where: { role: Role.ADMIN },
          select: { id: true },
        });
        await Promise.all(
          admins.map((admin) =>
            this.notificationService.createNotification({
              userId: admin.id,
              type: NotificationType.CASE_ASSIGNED,
              title: 'Case Created',
              message: `Case created for ${childName} with ${therapistName}`,
              actionUrl: `/patients`,
              relatedEntityId: caseId,
              relatedEntityType: 'case',
            }),
          ),
        );
      }
    } catch (error) {
      this.logger.error('Failed to send assignment notifications:', error);
    }
  }

  /**
   * Create a walk-in patient, and invite their guardian to claim the record.
   *
   * THIS USED TO SET A TRAP FOR THE GUARDIAN. It minted a `User` on the guardian's
   * REAL email with no password ("walk-in patients log in via magic link later" —
   * a magic link that was never built). That guardian could then neither register
   * (`register()` throws "User already exists") nor log in (`validateUser()` returns
   * null without a password). The only door left was a password reset for an account
   * they had no idea existed, and nobody ever found it: an audit of both databases
   * found ZERO of 44 such guardians had ever obtained a password.
   *
   * Now it takes the same path as a nursery enrolment — synthetic shadow profile,
   * real email on the `Guardian` row, and a claim link the guardian can actually
   * act on. Their own address stays free for the account they knowingly create.
   *
   * A guardian who ALREADY has an Upllyft account is no longer rejected either. The
   * old code refused ("use the Patients page to find them"), which meant a clinic
   * could not admit a walk-in for an existing parent at all. Now the claim resolves
   * it: the parent merges the record into the child they already have, and we keep
   * one child record rather than two.
   */
  async createWalkinPatient(dto: CreateWalkinPatientDto, adminId: string, clinicId: string | null) {
    const guardian: GuardianDetails = {
      name: dto.guardianName,
      // No email means no claim can ever be sent — the record stays clinic-only until
      // someone collects one. That is honest; a synthetic address is not a channel.
      email: dto.guardianEmail?.toLowerCase().trim() ?? '',
      phone: dto.guardianPhone ?? null,
      relationship: dto.guardianRelationship ?? null,
    };

    const { childId, rawToken } = await this.prisma.$transaction(async tx => {
      const { childId } = await this.claims.createPlaceholderChild(tx, {
        firstName: dto.firstName,
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: dto.gender,
        guardian,
        referralSource: dto.referralSource || 'Walk-in',
        extraChildData: {
          clinicStatus: 'INTAKE',
          walkinCreatedByAdmin: true,
          developmentalConcerns: dto.primaryConcern || null,
        },
      });

      // Attach to the creating clinic. This was previously MISSING: the walk-in was
      // created with no clinic at all, which was invisible while patient lists were
      // unscoped — but under fail-closed scoping the admin would add a patient and
      // watch it vanish from their own list.
      //
      // A clinic PATIENT affiliation is ACTIVE, not PENDING_CONSENT: the family is
      // physically in the building. The consent gate still binds at `getPatientDetail`.
      let affiliationId: string | null = null;
      if (clinicId) {
        ({ affiliationId } = await attachChildToFacility(tx, childId, clinicId, {
          type: 'PATIENT',
        }));
      }

      let rawToken: string | null = null;
      if (guardian.email && affiliationId && clinicId) {
        rawToken = await this.claims.createInvite(tx, {
          childId,
          affiliationId,
          facilityId: clinicId,
          guardian,
          createdById: adminId,
        });
      }

      return { childId, rawToken };
    });

    if (rawToken) {
      await this.claims.sendInvite(clinicId, guardian, dto.firstName, rawToken);
    }

    const created = await this.prisma.child.findUniqueOrThrow({ where: { id: childId } });

    if (!clinicId) {
      // SUPERADMIN with no clinic context — nothing to attach to. Log it: an
      // unattached child is invisible to every clinic surface.
      this.logger.warn(
        `Walk-in child ${childId} created without a clinic — it will not appear in any clinic patient list.`,
      );
    }

    // Notify admin confirmation (fire-and-forget)
    this.notificationService.createNotification({
      userId: adminId,
      type: NotificationType.CASE_ASSIGNED,
      title: 'Walk-in Patient Added',
      message: `${dto.firstName} has been added to the intake queue.`,
      relatedEntityId: childId,
      relatedEntityType: 'child',
    }).catch(() => { });

    return {
      id: created.id,
      firstName: created.firstName,
      dateOfBirth: created.dateOfBirth,
      gender: created.gender,
      clinicStatus: created.clinicStatus,
      createdAt: created.createdAt,
      // The parent's REAL details, read from the Guardian row — NOT from the shadow
      // user, whose address is synthetic. Returning the shadow's email here would
      // put `walkin.<uuid>@ancc.internal` in front of clinic staff as if it were the
      // family's address.
      parent: {
        id: null,
        name: guardian.name,
        email: guardian.email || null,
        phone: guardian.phone ?? null,
        onPlatform: false,
      },
      claimSent: Boolean(rawToken),
    };
  }

  async getTherapistsList(clinicId: string | null) {
    const profiles = await this.prisma.therapistProfile.findMany({
      where: {
        isActive: true,
        // Phase D2: scoped by facility membership, not TherapistProfile.clinicId.
        ...therapistInFacility(clinicId),
      },
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
