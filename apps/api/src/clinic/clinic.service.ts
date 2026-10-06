import {
    Injectable,
    Logger,
    NotFoundException,
    ForbiddenException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { Role } from '@prisma/client';
import { isClinicAdmin, practiceComplianceFor } from '../common/clinic-admin';
import {
    CreateClinicTherapistDto,
    UpdateTherapistScheduleDto,
    CreateSessionTypeDto,
    UpdateSessionTypeDto,
    UpsertSessionPricingDto,
    SetupPracticeDto,
} from './dto/clinic.dto';
import { inferDepartment } from '../marketplace/matching/matching.util';

/** How long an "Add therapist" invite link (a password-set token) stays valid. */
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const escapeHtml = (s: string) =>
    s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Clinic administration. Every method takes the id of the clinic the caller
 * MANAGES — resolved by `ClinicAdminGuard` from facility ownership or the legacy
 * `Clinic.adminId` — rather than the caller's user id, so a therapist who owns
 * their practice and a clinic's ADMIN go through the same code.
 */
@Injectable()
export class ClinicService {
    private readonly logger = new Logger(ClinicService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly emailService: EmailService,
    ) { }

    private async requireClinic(clinicId: string | null) {
        const clinic = clinicId
            ? await this.prisma.clinic.findUnique({ where: { id: clinicId } })
            : null;
        if (!clinic) throw new NotFoundException('Clinic not found for this admin');
        return clinic;
    }

    // --- Practice setup (self-onboarded therapists) ---

    /**
     * Where a therapist stands: running their own practice, on another clinic's
     * staff, or neither (and so able to set one up).
     */
    async getPracticeStatus(actor: { id: string; role: string }) {
        const userId = actor.id;
        const [owned, staffOf, canManageClinic] = await Promise.all([
            this.prisma.facilityMember.findFirst({
                where: { userId, status: 'ACTIVE', role: 'OWNER', facility: { type: 'CLINIC' } },
                select: {
                    facility: {
                        select: {
                            id: true,
                            name: true,
                            complianceStatus: true,
                            organization: { select: { slug: true } },
                        },
                    },
                },
            }),
            this.prisma.facilityMember.findFirst({
                where: { userId, status: 'ACTIVE' },
                select: { facility: { select: { name: true } } },
                orderBy: { createdAt: 'asc' },
            }),
            isClinicAdmin(this.prisma, actor),
        ]);

        if (owned) {
            return {
                status: 'OWNER' as const,
                canManageClinic,
                practice: {
                    id: owned.facility.id,
                    name: owned.facility.name,
                    complianceStatus: owned.facility.complianceStatus,
                    organizationSlug: owned.facility.organization.slug,
                },
            };
        }
        if (staffOf) {
            return { status: 'STAFF' as const, canManageClinic, facilityName: staffOf.facility.name };
        }
        return { status: 'NONE' as const, canManageClinic };
    }

    /**
     * A self-onboarded therapist sets up their own practice and becomes its admin —
     * the same shape a clinic admin has, scoped to this one clinic. In one transaction:
     *
     *   Organization (CLINIC_GROUP)  + OrganizationMember ADMIN   → the /org workspace
     *   Clinic (legacy row, adminId) + Facility under the SAME id  → the /clinic section;
     *     Child.clinicId is still an FK to Clinic, so a clinic facility must dual-write
     *     its Clinic row (see attachChildToFacility)
     *   FacilityMember OWNER                                       → the clinicId claim
     *   TherapistProfile.clinicId                                  → own roster
     *
     * Compliance follows the owner's licence verification (syncPracticeCompliance):
     * a solo practice has no other reviewer.
     *
     * The caller must refresh their token afterwards — tenant claims are minted then.
     */
    async setupPractice(userId: string, dto: SetupPracticeDto) {
        const name = dto.name?.trim();
        if (!name) throw new BadRequestException('Give your practice a name.');

        const current = await this.getPracticeStatus({ id: userId, role: 'THERAPIST' });
        if (current.status === 'OWNER') {
            throw new ConflictException('You already run a practice on Upllyft.');
        }
        if (current.status === 'STAFF') {
            throw new ConflictException(
                `You are on the staff of ${current.facilityName}. Ask its administrator to manage the clinic.`,
            );
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                phone: true,
                country: true,
                verificationStatus: true,
                adminOfClinic: { select: { id: true } },
                therapistProfile: { select: { id: true, clinicId: true } },
            },
        });
        if (!user) throw new NotFoundException('User not found');
        if (user.adminOfClinic) {
            throw new ConflictException('You already administer a clinic on Upllyft.');
        }
        if (user.therapistProfile?.clinicId) {
            throw new ConflictException(
                'Your therapist profile belongs to a clinic. Ask its administrator to manage it.',
            );
        }

        const complianceStatus = practiceComplianceFor(user.verificationStatus);
        const reviewed =
            complianceStatus === 'ACTIVE'
                ? { complianceReviewedAt: new Date(), complianceReviewedBy: 'licence-verification' }
                : {};
        const contact = {
            phone: dto.phone?.trim() || user.phone || null,
            email: dto.email?.trim().toLowerCase() || user.email,
            address: dto.address?.trim() || null,
        };

        const orgSlug = await this.uniqueSlug(name, (slug) =>
            this.prisma.organization.findUnique({ where: { slug }, select: { id: true } }),
        );
        const facilitySlug = await this.uniqueSlug(name, (slug) =>
            this.prisma.facility.findUnique({ where: { slug }, select: { id: true } }),
        );

        const result = await this.prisma.$transaction(async (tx) => {
            const org = await tx.organization.create({
                data: {
                    name,
                    slug: orgSlug,
                    kind: 'CLINIC_GROUP',
                    members: {
                        create: { userId, role: 'ADMIN', status: 'ACTIVE', joinedAt: new Date() },
                    },
                },
                select: { id: true, slug: true },
            });

            const clinic = await tx.clinic.create({
                data: {
                    name,
                    ...contact,
                    country: dto.country?.trim() || user.country || null,
                    description: dto.description?.trim() || null,
                    adminId: userId,
                    organizationId: org.id,
                    // Not listed in the public directory until compliance is ACTIVE
                    // (updateClinic enforces the same rule).
                    isPublic: complianceStatus === 'ACTIVE',
                    complianceStatus,
                    ...reviewed,
                },
                select: { id: true },
            });

            await tx.facility.create({
                data: {
                    id: clinic.id,
                    migratedFromClinicId: clinic.id,
                    organizationId: org.id,
                    type: 'CLINIC',
                    name,
                    slug: facilitySlug,
                    ...contact,
                    complianceStatus,
                    ...reviewed,
                    members: { create: { userId, role: 'OWNER', status: 'ACTIVE' } },
                },
            });

            if (user.therapistProfile) {
                await tx.therapistProfile.update({
                    where: { id: user.therapistProfile.id },
                    data: { clinicId: clinic.id },
                });
            } else {
                await tx.therapistProfile.create({
                    data: { userId, clinicId: clinic.id, isActive: true },
                });
            }

            return { clinicId: clinic.id, organizationSlug: org.slug };
        });

        this.logger.log(`Practice ${result.clinicId} set up by therapist ${userId} (${complianceStatus})`);
        return { ...result, complianceStatus };
    }

    private async uniqueSlug(
        name: string,
        taken: (slug: string) => Promise<{ id: string } | null>,
    ): Promise<string> {
        const base =
            name
                .toLowerCase()
                .normalize('NFKD')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .slice(0, 50) || 'practice';
        for (let i = 0; i < 50; i++) {
            const candidate = i === 0 ? base : `${base}-${i + 1}`;
            if (!(await taken(candidate))) return candidate;
        }
        throw new ConflictException('Could not derive a unique name — try a different one.');
    }

    // --- Clinic ---

    async getClinic(clinicId: string | null) {
        if (!clinicId) return null;
        return this.prisma.clinic.findUnique({
            where: { id: clinicId },
            include: {
                admin: { select: { id: true, name: true, email: true, image: true } },
                therapists: {
                    include: {
                        user: { select: { id: true, name: true, email: true, image: true, specialization: true } },
                    },
                    orderBy: { user: { name: 'asc' } },
                },
            },
        });
    }

    async updateClinic(clinicId: string | null, data: any) {
        const clinic = await this.requireClinic(clinicId);

        // Phase 0 (UAE): a clinic cannot be made public until its compliance
        // review is ACTIVE.
        if (data?.isPublic === true && clinic.complianceStatus !== 'ACTIVE') {
            throw new ForbiddenException(
                'Clinic cannot be made public until compliance review is ACTIVE.',
            );
        }

        const updated = await this.prisma.clinic.update({ where: { id: clinic.id }, data });

        // Keep the facility mirror's presentation in step (same id).
        const mirror: Record<string, unknown> = {};
        for (const key of ['name', 'phone', 'email', 'address', 'logoUrl', 'primaryColor'] as const) {
            if (data?.[key] !== undefined) mirror[key] = data[key];
        }
        if (Object.keys(mirror).length) {
            await this.prisma.facility.updateMany({ where: { id: clinic.id }, data: mirror });
        }

        return updated;
    }

    async getClinicTherapists(clinicId: string | null) {
        if (!clinicId) return [];

        const profiles = await this.prisma.therapistProfile.findMany({
            where: { clinicId, isActive: true },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        image: true,
                        specialization: true,
                    },
                },
                availability: true,
                sessionTypes: true,
            },
            orderBy: { user: { name: 'asc' } },
        });

        return profiles.map((p) => ({
            id: p.user.id,
            profileId: p.id,
            name: p.user.name,
            email: p.user.email,
            phone: p.user.phone,
            avatar: p.user.image,
            specializations: p.specializations,
            title: p.title,
            isActive: p.isActive,
            acceptingBookings: p.acceptingBookings,
            sessionTypes: p.sessionTypes,
            availabilityCount: p.availability.length,
        }));
    }

    /**
     * Add a therapist to the clinic.
     *
     * Beyond the profile link, this makes them facility STAFF (FacilityMember
     * THERAPIST) — that row is what mints their clinicId claim and what the
     * patients/therapists/outcomes screens scope by. Without it, therapists added
     * here were 403'd out of their own clinic's pages.
     *
     * A brand-new account gets no password; they are emailed a link to set one.
     * An existing therapist account with no clinic is attached rather than
     * duplicated. Anyone else with that email is a conflict.
     */
    async createClinicTherapist(clinicId: string | null, dto: CreateClinicTherapistDto) {
        const clinic = await this.requireClinic(clinicId);
        const email = dto.email.trim().toLowerCase();

        const existing = await this.prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                role: true,
                therapistProfile: { select: { id: true, clinicId: true, department: true } },
            },
        });
        if (existing) {
            if (existing.role !== Role.THERAPIST) {
                throw new ConflictException(
                    'An Upllyft account with this email exists and is not a therapist account.',
                );
            }
            if (existing.therapistProfile?.clinicId && existing.therapistProfile.clinicId !== clinic.id) {
                throw new ConflictException('This therapist already belongs to another clinic.');
            }
        }

        const inviteToken = existing ? null : randomBytes(32).toString('hex');

        const { user, profile } = await this.prisma.$transaction(async (tx) => {
            const user = existing
                ? await tx.user.findUniqueOrThrow({ where: { id: existing.id } })
                : await tx.user.create({
                    data: {
                        email,
                        name: dto.name,
                        phone: dto.phone,
                        role: Role.THERAPIST,
                        specialization: dto.specializations,
                        isEmailVerified: false,
                        resetPasswordToken: inviteToken,
                        resetPasswordExpiry: new Date(Date.now() + INVITE_TTL_MS),
                    },
                });

            const profile = existing?.therapistProfile
                ? await tx.therapistProfile.update({
                    where: { id: existing.therapistProfile.id },
                    data: {
                        clinicId: clinic.id,
                        ...(dto.title ? { title: dto.title } : {}),
                        ...(dto.specializations?.length ? { specializations: dto.specializations } : {}),
                        ...(!existing.therapistProfile.department && (dto.title || dto.specializations?.length)
                            ? { department: inferDepartment(dto.title, dto.specializations) }
                            : {}),
                    },
                })
                : await tx.therapistProfile.create({
                    data: {
                        userId: user.id,
                        title: dto.title,
                        specializations: dto.specializations,
                        department: inferDepartment(dto.title, dto.specializations),
                        clinicId: clinic.id,
                        isActive: true,
                        acceptingBookings: true,
                        credentialStatus: 'PENDING',
                    },
                });

            // Staff membership — only where the clinic has its facility mirror.
            const facility = await tx.facility.findUnique({ where: { id: clinic.id }, select: { id: true } });
            if (facility) {
                await tx.facilityMember.upsert({
                    where: { userId_facilityId: { userId: user.id, facilityId: facility.id } },
                    create: { userId: user.id, facilityId: facility.id, role: 'THERAPIST', status: 'ACTIVE' },
                    update: { status: 'ACTIVE' },
                });
            }

            return { user, profile };
        });

        if (inviteToken) {
            this.sendTherapistInvite(email, dto.name, clinic.name, inviteToken);
        }

        return {
            id: user.id,
            profileId: profile.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            specializations: profile.specializations,
            title: profile.title,
            clinicId: clinic.id,
            invited: !!inviteToken,
        };
    }

    private sendTherapistInvite(email: string, name: string, clinicName: string, token: string) {
        const base = process.env.FRONTEND_URL || 'http://localhost:3000';
        const link = `${base}/reset-password?token=${token}`;
        this.emailService
            .sendEmail({
                to: email,
                subject: `${clinicName} added you on Upllyft`,
                html: `
                    <p>Hi ${escapeHtml(name)},</p>
                    <p>${escapeHtml(clinicName)} has added you as a therapist on Upllyft.</p>
                    <p><a href="${link}">Set your password</a> to sign in. This link is valid for 7 days;
                    after that, use "Forgot password" on the sign-in page.</p>
                `,
            })
            .catch((err: Error) => this.logger.error(`Therapist invite to ${email} failed: ${err.message}`));
    }

    async updateTherapistSchedule(
        therapistUserId: string,
        dto: UpdateTherapistScheduleDto,
        clinicId: string | null,
    ) {
        const profile = await this.resolveTherapistProfile(clinicId, therapistUserId);

        // Delete existing availability for this therapist
        await this.prisma.therapistAvailability.deleteMany({
            where: { therapistId: profile.id },
        });

        // Re-create with new schedule
        if (dto.availability && dto.availability.length > 0) {
            await this.prisma.therapistAvailability.createMany({
                data: dto.availability.map((slot) => ({
                    therapistId: profile.id,
                    dayOfWeek: slot.dayOfWeek,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    isActive: true,
                })),
            });
        }

        return { success: true, therapistId: therapistUserId, slotsSet: dto.availability?.length ?? 0 };
    }

    // --- Session Types & Pricing ---

    private async resolveTherapistProfile(clinicId: string | null, therapistUserId: string) {
        const clinic = await this.requireClinic(clinicId);

        const profile = await this.prisma.therapistProfile.findUnique({
            where: { userId: therapistUserId },
        });
        if (!profile || profile.clinicId !== clinic.id) {
            throw new NotFoundException('Therapist not found in this clinic');
        }

        return profile;
    }

    async getTherapistSessionTypes(clinicId: string | null, therapistUserId: string) {
        const profile = await this.resolveTherapistProfile(clinicId, therapistUserId);
        return this.prisma.sessionType.findMany({
            where: { therapistId: profile.id, isActive: true },
            include: { sessionPricing: true },
        });
    }

    async createSessionType(clinicId: string | null, therapistUserId: string, dto: CreateSessionTypeDto) {
        const profile = await this.resolveTherapistProfile(clinicId, therapistUserId);
        return this.prisma.sessionType.create({
            data: {
                name: dto.name,
                description: dto.description,
                duration: dto.duration,
                defaultPrice: dto.defaultPrice,
                currency: dto.currency || 'INR',
                therapistId: profile.id,
                isActive: true,
            },
        });
    }

    async updateSessionType(
        clinicId: string | null,
        therapistUserId: string,
        sessionTypeId: string,
        dto: UpdateSessionTypeDto,
    ) {
        const profile = await this.resolveTherapistProfile(clinicId, therapistUserId);

        const sessionType = await this.prisma.sessionType.findUnique({
            where: { id: sessionTypeId },
        });
        if (!sessionType || sessionType.therapistId !== profile.id) {
            throw new NotFoundException('Session type not found for this therapist');
        }

        return this.prisma.sessionType.update({
            where: { id: sessionTypeId },
            data: dto,
        });
    }

    async deleteSessionType(clinicId: string | null, therapistUserId: string, sessionTypeId: string) {
        const profile = await this.resolveTherapistProfile(clinicId, therapistUserId);

        const sessionType = await this.prisma.sessionType.findUnique({
            where: { id: sessionTypeId },
        });
        if (!sessionType || sessionType.therapistId !== profile.id) {
            throw new NotFoundException('Session type not found for this therapist');
        }

        return this.prisma.sessionType.update({
            where: { id: sessionTypeId },
            data: { isActive: false },
        });
    }

    async getTherapistPricing(clinicId: string | null, therapistUserId: string) {
        const profile = await this.resolveTherapistProfile(clinicId, therapistUserId);
        return this.prisma.sessionPricing.findMany({
            where: { therapistId: profile.id },
            include: { sessionType: true },
        });
    }

    async upsertSessionPricing(clinicId: string | null, therapistUserId: string, dto: UpsertSessionPricingDto) {
        const profile = await this.resolveTherapistProfile(clinicId, therapistUserId);

        // Verify the session type belongs to this therapist
        const sessionType = await this.prisma.sessionType.findUnique({
            where: { id: dto.sessionTypeId },
        });
        if (!sessionType || sessionType.therapistId !== profile.id) {
            throw new NotFoundException('Session type not found for this therapist');
        }

        return this.prisma.sessionPricing.upsert({
            where: {
                therapistId_sessionTypeId: {
                    therapistId: profile.id,
                    sessionTypeId: dto.sessionTypeId,
                },
            },
            create: {
                therapistId: profile.id,
                sessionTypeId: dto.sessionTypeId,
                price: dto.basePrice,
                currency: dto.currency || sessionType.currency,
                isActive: true,
            },
            update: {
                price: dto.basePrice,
                currency: dto.currency || undefined,
            },
        });
    }
}
