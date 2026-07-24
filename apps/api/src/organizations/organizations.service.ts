import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { Organization, OrganizationMember, OrganizationRole, OrganizationStatus, AvailabilityExceptionType, TherapistApprovalStatus, LicenseAuthority, Prisma } from '@prisma/client';

interface SaveTherapistProfileInput {
    name?: string;
    title?: string;
    bio?: string;
    department?: string;
    phone?: string;
    branch?: string;
    country?: string;
    qualification?: string;
    university?: string;
    yearsExperience?: number;
    specializations?: string[];
    licenceNumber?: string;
    licenceExpiry?: string;
    licenseAuthority?: string;
    rciNumber?: string;
    councilNumber?: string;
    bcbaNumber?: string;
    emiratesId?: string;
    visaStatus?: string;
    insuranceProvider?: string;
    insurancePolicyNumber?: string;
    insuranceExpiry?: string;
}
import { randomBytes } from 'crypto';
import { AppLoggerService } from '../common/logging';
import * as XLSX from 'xlsx';

// Exported interfaces for bulk invitation validation results
export interface InviteItem {
    email: string;
    role: string;
    error?: string;
}

export interface InviteResult {
    email: string;
    role: string;
    error?: string;
}

export interface BulkValidationResult {
    summary: {
        total: number;
        valid: number;
        invalid: number;
        existing: number;
    };
    validInvites: InviteItem[];
    invalidEntries: InviteItem[];
    existingMembers: InviteItem[];
    existingInvitations: InviteItem[];
}

export interface BulkInviteResult {
    message: string;
    results: {
        successful: InviteResult[];
        failed: InviteResult[];
    };
}

@Injectable()
export class OrganizationsService {
    private readonly logger = new Logger(OrganizationsService.name);
    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
        private appLogger: AppLoggerService,
    ) {
        this.appLogger.setContext('OrganizationsService');
    }

    /**
     * Parses an uploaded Excel/CSV file and validates its content for bulk invitation
     * @param fileBuffer The buffer of the uploaded file
     * @param slug The organization slug
     * @param adminId The ID of the admin performing the action
     */
    async validateBulkInviteFile(fileBuffer: Buffer, slug: string, adminId: string) {
        const org = await this.findOne(slug);

        // Verify admin permissions
        const adminMember = await this.prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId: adminId,
                    organizationId: org.id,
                },
            },
        });

        if (!adminMember || adminMember.role !== 'ADMIN') {
            throw new BadRequestException('Only admins can perform bulk invitations');
        }

        let data: any[];
        try {
            // Read Excel file - 'xlsx' library is safe against macros by default (it doesn't execute them)
            const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            data = XLSX.utils.sheet_to_json(worksheet);
        } catch (error) {
            this.logger.error(`Error parsing Excel file: ${error.message}`);
            throw new BadRequestException('Invalid Excel file format');
        }

        if (!data || data.length === 0) {
            throw new BadRequestException('The uploaded file is empty');
        }

        const validInvites: InviteItem[] = [];
        const invalidEntries: InviteItem[] = [];
        const existingMembers: InviteItem[] = [];
        const existingInvitations: InviteItem[] = [];

        // Fetch all existing members and pending invites for this org to cross-reference
        const [orgMembers, orgInvites] = await Promise.all([
            this.prisma.organizationMember.findMany({
                where: { organizationId: org.id },
                include: { user: { select: { email: true } } }
            }),
            this.prisma.organizationInvitation.findMany({
                where: { organizationId: org.id, status: 'PENDING' }
            })
        ]);

        const memberEmails = new Set(orgMembers.map(m => m.user.email.toLowerCase()));
        const inviteEmails = new Set(orgInvites.map(i => i.email.toLowerCase()));

        for (const row of data) {
            // Normalizing keys (case-insensitive search for email/role)
            const emailKey = Object.keys(row).find(k => k.toLowerCase() === 'email');
            const roleKey = Object.keys(row).find(k => k.toLowerCase() === 'role');

            if (!emailKey) {
                invalidEntries.push({ email: 'Unknown', role: 'Unknown', error: 'Missing Email column' });
                continue;
            }

            const email = (row[emailKey] || '').toString().trim().toLowerCase();
            const role = roleKey ? (row[roleKey] || 'MEMBER').toString().trim().toUpperCase() : 'MEMBER';

            // 1. Basic format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailRegex.test(email)) {
                invalidEntries.push({ email, role, error: 'Invalid email format' });
                continue;
            }

            const validRoles = Object.values(OrganizationRole);
            if (!validRoles.includes(role as any)) {
                invalidEntries.push({ email, role, error: `Invalid role: ${role}` });
                continue;
            }

            // 2. Check for duplicates in the file itself
            if (validInvites.some(v => v.email === email)) {
                invalidEntries.push({ email, role, error: 'Duplicate email in file' });
                continue;
            }

            // 3. Check against existing members
            if (memberEmails.has(email)) {
                existingMembers.push({ email, role, error: 'User is already a member' });
                continue;
            }

            // 4. Check against pending invitations
            if (inviteEmails.has(email)) {
                existingInvitations.push({ email, role, error: 'User already has a pending invitation' });
                continue;
            }

            validInvites.push({ email, role });
        }

        return {
            summary: {
                total: data.length,
                valid: validInvites.length,
                invalid: invalidEntries.length,
                existing: existingMembers.length + existingInvitations.length,
            },
            validInvites,
            invalidEntries,
            existingMembers,
            existingInvitations,
        };
    }

    /**
     * Executes the bulk invitation process
     */
    async bulkInvite(slug: string, invites: { email: string; role: string }[], adminId: string) {
        const results = {
            successful: [] as InviteResult[],
            failed: [] as InviteResult[],
        };

        for (const invite of invites) {
            try {
                await this.inviteMember(slug, invite.email, invite.role, adminId);
                results.successful.push({ email: invite.email, role: invite.role });
            } catch (error) {
                this.logger.error(`Failed to bulk invite ${invite.email}: ${error.message}`);
                results.failed.push({ email: invite.email, role: invite.role, error: error.message });
            }
        }

        return {
            message: `Bulk invitation process completed. ${results.successful.length} sent, ${results.failed.length} failed.`,
            results,
        };
    }

    async create(data: { name: string; description?: string; userId: string }) {
        const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        // Check for existing slug
        const existing = await this.prisma.organization.findUnique({ where: { slug } });
        if (existing) {
            throw new BadRequestException('Organization name already taken');
        }

        const org = await this.prisma.organization.create({
            data: {
                name: data.name,
                slug,
                description: data.description,
                members: {
                    create: {
                        userId: data.userId,
                        role: 'ADMIN',
                        status: 'ACTIVE',
                        joinedAt: new Date(),
                    },
                },
            },
        });

        // Log organization creation
        this.appLogger.logOrganization('CREATE_ORGANIZATION', org.id, data.userId, {
            slug: org.slug,
        });

        return org;
    }

    /**
     * Assert `userId` belongs to this org (any role) before serving org-internal
     * data. Platform admins pass through. Use for anything that exposes member
     * PII or internal counts — org *profile* data stays public.
     */
    private async assertMember(organizationId: string, userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });
        if (user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') return;

        const member = await this.prisma.organizationMember.findUnique({
            where: { userId_organizationId: { userId, organizationId } },
            select: { status: true },
        });

        if (!member || member.status !== 'ACTIVE') {
            throw new ForbiddenException('You are not a member of this organization');
        }
    }

    async findAll() {
        return this.prisma.organization.findMany({
            include: {
                _count: {
                    select: { members: true, communities: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(slug: string) {
        const org = await this.prisma.organization.findUnique({
            where: { slug },
            include: {
                communities: true,
                _count: {
                    select: { members: true },
                },
            },
        });

        if (!org) throw new NotFoundException('Organization not found');
        return org;
    }

    async join(slug: string, userId: string) {
        const org = await this.findOne(slug);

        const existingMember = await this.prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId,
                    organizationId: org.id,
                },
            },
        });

        if (existingMember) {
            throw new BadRequestException('Already a member or request pending');
        }

        return this.prisma.organizationMember.create({
            data: {
                userId,
                organizationId: org.id,
                status: 'PENDING',
            },
        });
    }

    async getMembers(slug: string, userId: string) {
        const org = await this.findOne(slug);
        await this.assertMember(org.id, userId);
        return this.prisma.organizationMember.findMany({
            where: { organizationId: org.id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        role: true,
                        verificationStatus: true,
                    }
                }
            },
        });
    }

    async getCommunities(slug: string) {
        const org = await this.findOne(slug);
        return this.prisma.community.findMany({
            where: {
                organizationId: org.id,
                isActive: true,
            },
            include: {
                _count: {
                    select: { members: true },
                },
                organization: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        logo: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async createCommunity(slug: string, data: any, userId: string) {
        const org = await this.findOne(slug);

        const member = await this.prisma.organizationMember.findUnique({
            where: { userId_organizationId: { userId, organizationId: org.id } },
        });

        if (!member) {
            throw new BadRequestException('Only members can create a community in this organization');
        }

        let communitySlug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        communitySlug += '-' + randomBytes(4).toString('hex');

        return this.prisma.$transaction(async (tx) => {
            const community = await tx.community.create({
                data: {
                    name: data.name,
                    description: data.description,
                    slug: communitySlug,
                    type: data.type || 'professional',
                    isPrivate: data.isPrivate || false,
                    organizationId: org.id,
                    creatorId: userId,
                }
            });

            await tx.communityMember.create({
                data: {
                    userId,
                    communityId: community.id,
                    role: 'ADMIN',
                    status: 'ACTIVE',
                }
            });

            return community;
        });
    }

    async updateMemberStatus(
        slug: string,
        memberId: string,
        status: OrganizationStatus,
        adminId: string
    ) {
        // Verify admin permissions
        const org = await this.findOne(slug);
        const adminMember = await this.prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId: adminId,
                    organizationId: org.id,
                },
            },
        });

        if (!adminMember || adminMember.role !== 'ADMIN') {
            throw new BadRequestException('Only admins can update member status');
        }

        return this.prisma.organizationMember.update({
            where: { id: memberId },
            data: {
                status,
                joinedAt: status === 'ACTIVE' ? new Date() : undefined,
            },
        });
    }

    /**
     * Invite a member to the organization
     * Handles both existing and non-existing users
     */
    async inviteMember(slug: string, email: string, role: string, adminId: string) {
        const org = await this.findOne(slug);

        const adminMember = await this.prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId: adminId,
                    organizationId: org.id,
                },
            },
            include: {
                user: {
                    select: { name: true, email: true }
                }
            }
        });

        if (!adminMember || adminMember.role !== 'ADMIN') {
            throw new BadRequestException('Only admins can invite members');
        }

        const existingUser = await this.prisma.user.findUnique({ where: { email } });

        if (existingUser) {
            const existingMember = await this.prisma.organizationMember.findUnique({
                where: {
                    userId_organizationId: {
                        userId: existingUser.id,
                        organizationId: org.id,
                    },
                },
            });

            if (existingMember) {
                throw new BadRequestException('User is already a member of this organization');
            }
        }

        const existingInvitation = await this.prisma.organizationInvitation.findUnique({
            where: {
                email_organizationId: {
                    email,
                    organizationId: org.id,
                },
            },
        });

        if (existingInvitation && existingInvitation.status === 'PENDING') {
            if (existingInvitation.expiresAt > new Date()) {
                throw new BadRequestException('An invitation has already been sent to this email');
            }
            await this.prisma.organizationInvitation.delete({
                where: { id: existingInvitation.id },
            });
        }

        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const invitation = await this.prisma.organizationInvitation.create({
            data: {
                email,
                organizationId: org.id,
                role: role.toUpperCase() as OrganizationRole,
                token,
                status: 'PENDING',
                invitedById: adminId,
                expiresAt,
            },
            include: {
                organization: {
                    select: { name: true, slug: true }
                },
                invitedBy: {
                    select: { name: true, email: true }
                }
            }
        });

        try {
            await this.emailService.sendInvitationEmail(
                email,
                token,
                adminMember.user.name || 'An admin',
                org.name,
            );
        } catch (error) {
            console.error('Failed to send invitation email:', error);
        }

        return {
            success: true,
            message: existingUser
                ? 'Invitation sent to existing user'
                : 'Invitation sent to new user',
            invitation: {
                id: invitation.id,
                email: invitation.email,
                role: invitation.role,
                status: invitation.status,
                expiresAt: invitation.expiresAt,
                organization: invitation.organization,
            },
            userExists: !!existingUser,
        };
    }

    async verifyInvitation(token: string) {
        const invitation = await this.prisma.organizationInvitation.findUnique({
            where: { token },
            include: {
                organization: {
                    select: { id: true, name: true, slug: true, logo: true }
                },
                invitedBy: {
                    select: { name: true }
                }
            }
        });

        if (!invitation) {
            throw new NotFoundException('Invitation not found');
        }

        if (invitation.status !== 'PENDING') {
            throw new BadRequestException(`Invitation has already been ${invitation.status.toLowerCase()}`);
        }

        if (invitation.expiresAt < new Date()) {
            await this.prisma.organizationInvitation.update({
                where: { id: invitation.id },
                data: { status: 'EXPIRED' }
            });
            throw new BadRequestException('Invitation has expired');
        }

        const existingUser = await this.prisma.user.findUnique({
            where: { email: invitation.email }
        });

        return {
            valid: true,
            invitation: {
                id: invitation.id,
                email: invitation.email,
                role: invitation.role,
                organization: invitation.organization,
                invitedBy: invitation.invitedBy,
                expiresAt: invitation.expiresAt,
            },
            userExists: !!existingUser,
        };
    }

    async getInvitationsForUser(email: string) {
        const invitations = await this.prisma.organizationInvitation.findMany({
            where: {
                email: { equals: email, mode: 'insensitive' },
                status: 'PENDING',
                expiresAt: { gt: new Date() },
            },
            include: {
                organization: {
                    select: { id: true, name: true, slug: true, logo: true },
                },
                invitedBy: {
                    select: { name: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return invitations.map((inv) => ({
            id: inv.id,
            token: inv.token,
            email: inv.email,
            role: inv.role,
            organization: inv.organization,
            invitedBy: inv.invitedBy,
            expiresAt: inv.expiresAt,
            createdAt: inv.createdAt,
        }));
    }

    async declineInvitation(token: string, userEmail: string) {
        const invitation = await this.prisma.organizationInvitation.findUnique({
            where: { token },
        });

        if (!invitation) {
            throw new NotFoundException('Invitation not found');
        }

        if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
            throw new BadRequestException('This invitation was sent to a different email address');
        }

        if (invitation.status !== 'PENDING') {
            throw new BadRequestException(`Invitation has already been ${invitation.status.toLowerCase()}`);
        }

        await this.prisma.organizationInvitation.update({
            where: { id: invitation.id },
            data: { status: 'CANCELLED' },
        });

        return { success: true, message: 'Invitation declined' };
    }

    async acceptInvitation(token: string, userId: string) {
        const invitation = await this.prisma.organizationInvitation.findUnique({
            where: { token },
            include: {
                organization: true
            }
        });

        if (!invitation) {
            throw new NotFoundException('Invitation not found');
        }

        if (invitation.status !== 'PENDING') {
            throw new BadRequestException(`Invitation has already been ${invitation.status.toLowerCase()}`);
        }

        if (invitation.expiresAt < new Date()) {
            await this.prisma.organizationInvitation.update({
                where: { id: invitation.id },
                data: { status: 'EXPIRED' }
            });
            throw new BadRequestException('Invitation has expired');
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
            throw new BadRequestException('This invitation was sent to a different email address');
        }

        const existingMember = await this.prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId,
                    organizationId: invitation.organizationId,
                },
            },
        });

        if (existingMember) {
            await this.prisma.organizationInvitation.update({
                where: { id: invitation.id },
                data: {
                    status: 'ACCEPTED',
                    acceptedAt: new Date()
                }
            });
            throw new BadRequestException('You are already a member of this organization');
        }

        const result = await this.prisma.$transaction(async (tx) => {
            const member = await tx.organizationMember.create({
                data: {
                    userId,
                    organizationId: invitation.organizationId,
                    role: invitation.role,
                    status: 'ACTIVE',
                    joinedAt: new Date(),
                },
                include: {
                    organization: {
                        select: { name: true, slug: true }
                    }
                }
            });

            await tx.organizationInvitation.update({
                where: { id: invitation.id },
                data: {
                    status: 'ACCEPTED',
                    acceptedAt: new Date(),
                }
            });

            return member;
        });

        return {
            success: true,
            message: `Successfully joined ${result.organization.name}`,
            membership: {
                id: result.id,
                role: result.role,
                organization: result.organization,
            }
        };
    }

    async getPendingInvitations(slug: string, adminId: string) {
        const org = await this.findOne(slug);

        const adminMember = await this.prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId: adminId,
                    organizationId: org.id,
                },
            },
        });

        if (!adminMember || adminMember.role !== 'ADMIN') {
            throw new BadRequestException('Only admins can view invitations');
        }

        return this.prisma.organizationInvitation.findMany({
            where: {
                organizationId: org.id,
                status: 'PENDING',
            },
            include: {
                invitedBy: {
                    select: { name: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async cancelInvitation(invitationId: string, adminId: string) {
        const invitation = await this.prisma.organizationInvitation.findUnique({
            where: { id: invitationId },
            include: { organization: true }
        });

        if (!invitation) {
            throw new NotFoundException('Invitation not found');
        }

        const adminMember = await this.prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId: adminId,
                    organizationId: invitation.organizationId,
                },
            },
        });

        if (!adminMember || adminMember.role !== 'ADMIN') {
            throw new BadRequestException('Only admins can cancel invitations');
        }

        if (invitation.status !== 'PENDING') {
            throw new BadRequestException('Can only cancel pending invitations');
        }

        await this.prisma.organizationInvitation.update({
            where: { id: invitationId },
            data: { status: 'CANCELLED' }
        });

        return { success: true, message: 'Invitation cancelled' };
    }

    async updateSettings(slug: string, userId: string, dto: { name?: string; description?: string; website?: string; logo?: string; banner?: string; primaryColor?: string; secondaryColor?: string; accentColor?: string }) {
        const org = await this.findOne(slug);

        const member = await this.prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId,
                    organizationId: org.id,
                },
            },
        });

        if (!member || member.role !== 'ADMIN') {
            throw new BadRequestException('Only admins can update organization settings');
        }

        const updateData: any = {};

        if (dto.name !== undefined) updateData.name = dto.name;
        if (dto.description !== undefined) updateData.description = dto.description;
        if (dto.website !== undefined) updateData.website = dto.website;
        if (dto.logo !== undefined) updateData.logo = dto.logo;
        if (dto.banner !== undefined) updateData.banner = dto.banner;

        // An empty string clears the colour, so the UI falls back to the theme default.
        if (dto.primaryColor !== undefined) updateData.primaryColor = dto.primaryColor || null;
        if (dto.secondaryColor !== undefined) updateData.secondaryColor = dto.secondaryColor || null;
        if (dto.accentColor !== undefined) updateData.accentColor = dto.accentColor || null;

        return this.prisma.organization.update({
            where: { id: org.id },
            data: updateData,
        });
    }

    /** Organizations the current user belongs to, with their role in each. */
    async findMine(userId: string) {
        const memberships = await this.prisma.organizationMember.findMany({
            where: { userId, status: 'ACTIVE' },
            include: {
                organization: {
                    select: { id: true, name: true, slug: true, logo: true, primaryColor: true },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        return memberships.map((m) => ({
            role: m.role,
            status: m.status,
            joinedAt: m.joinedAt,
            organization: m.organization,
        }));
    }

    /** Headline counts for the org dashboard. */
    async getStats(slug: string, userId: string) {
        const org = await this.prisma.organization.findUnique({
            where: { slug },
            select: { id: true, name: true, slug: true, logo: true, banner: true },
        });
        if (!org) throw new NotFoundException('Organization not found');

        await this.assertMember(org.id, userId);

        const [memberCount, communityCount, upcomingEventCount] = await Promise.all([
            this.prisma.organizationMember.count({
                where: { organizationId: org.id, status: 'ACTIVE' },
            }),
            this.prisma.community.count({
                where: { organizationId: org.id, isActive: true },
            }),
            // Mirrors findEvents(): org-owned events plus those owned by its communities.
            this.prisma.event.count({
                where: {
                    isActive: true,
                    isCancelled: false,
                    startDate: { gte: new Date() },
                    OR: [
                        { organizationId: org.id },
                        { community: { organizationId: org.id } },
                    ],
                },
            }),
        ]);

        return { org, memberCount, communityCount, upcomingEventCount };
    }

    /**
     * Events belonging to the org — both directly attached and those owned by one
     * of the org's communities.
     */
    async findEvents(slug: string) {
        const org = await this.prisma.organization.findUnique({
            where: { slug },
            select: { id: true },
        });
        if (!org) throw new NotFoundException('Organization not found');

        return this.prisma.event.findMany({
            where: {
                isActive: true,
                OR: [
                    { organizationId: org.id },
                    { community: { organizationId: org.id } },
                ],
            },
            include: {
                community: { select: { id: true, name: true, slug: true } },
                creator: { select: { id: true, name: true, image: true } },
                _count: { select: { interests: true } },
            },
            orderBy: { startDate: 'asc' },
        });
    }

    async updateLogo(slug: string, userId: string, logoUrl: string) {
        const org = await this.findOne(slug);

        const member = await this.prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId,
                    organizationId: org.id,
                },
            },
        });

        if (!member || member.role !== 'ADMIN') {
            throw new BadRequestException('Only admins can update organization logo');
        }

        return this.prisma.organization.update({
            where: { id: org.id },
            data: { logo: logoUrl },
        });
    }

    async updateBanner(slug: string, userId: string, bannerUrl: string) {
        const org = await this.findOne(slug);

        const member = await this.prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId,
                    organizationId: org.id,
                },
            },
        });

        if (!member || member.role !== 'ADMIN') {
            throw new BadRequestException('Only admins can update organization banner');
        }

        return this.prisma.organization.update({
            where: { id: org.id },
            data: { banner: bannerUrl },
        });
    }

    /**
     * Suspend a member's profile - they can be reactivated later
     * Can be done by organization admin or platform admin
     */
    async suspendMember(slug: string, memberId: string, adminId: string, reason?: string) {
        const org = await this.findOne(slug);

        // Check if admin has permission
        const adminMember = await this.prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId: adminId,
                    organizationId: org.id,
                },
            },
        });

        // Also check if user is a platform admin
        const adminUser = await this.prisma.user.findUnique({
            where: { id: adminId },
            select: { role: true }
        });

        const isPlatformAdmin = adminUser?.role === 'ADMIN';
        const isOrgAdmin = adminMember?.role === 'ADMIN';

        if (!isPlatformAdmin && !isOrgAdmin) {
            throw new BadRequestException('Only organization admins or platform admins can suspend members');
        }

        // Get the target member
        const targetMember = await this.prisma.organizationMember.findUnique({
            where: { id: memberId },
            include: { user: { select: { email: true, name: true } } }
        });

        if (!targetMember) {
            throw new NotFoundException('Member not found');
        }

        if (targetMember.organizationId !== org.id) {
            throw new BadRequestException('Member does not belong to this organization');
        }

        // Cannot suspend yourself
        if (targetMember.userId === adminId) {
            throw new BadRequestException('You cannot suspend your own account');
        }

        // Cannot suspend another admin unless you're platform admin
        if (targetMember.role === 'ADMIN' && !isPlatformAdmin) {
            throw new BadRequestException('Only platform admins can suspend organization admins');
        }

        const updatedMember = await this.prisma.organizationMember.update({
            where: { id: memberId },
            data: {
                status: OrganizationStatus.SUSPENDED,
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
                organization: { select: { name: true, slug: true } }
            }
        });

        // Send notification email to the suspended user
        try {
            await this.emailService.sendEmail({
                to: updatedMember.user.email,
                subject: `Your account has been suspended - ${updatedMember.organization.name}`,
                html: this.getSuspendedEmailTemplate(
                    updatedMember.user.name || 'User',
                    updatedMember.organization.name,
                    reason
                ),
            });
        } catch (error) {
            console.error('Failed to send suspension email:', error);
        }

        return {
            success: true,
            message: `Member ${targetMember.user.name || targetMember.user.email} has been suspended`,
            member: updatedMember
        };
    }

    /**
     * Deactivate a member's profile - permanent deactivation
     * Can be done by organization admin or platform admin
     */
    async deactivateMember(slug: string, memberId: string, adminId: string, reason?: string) {
        const org = await this.findOne(slug);

        // Check if admin has permission
        const adminMember = await this.prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId: adminId,
                    organizationId: org.id,
                },
            },
        });

        // Also check if user is a platform admin
        const adminUser = await this.prisma.user.findUnique({
            where: { id: adminId },
            select: { role: true }
        });

        const isPlatformAdmin = adminUser?.role === 'ADMIN';
        const isOrgAdmin = adminMember?.role === 'ADMIN';

        if (!isPlatformAdmin && !isOrgAdmin) {
            throw new BadRequestException('Only organization admins or platform admins can deactivate members');
        }

        // Get the target member
        const targetMember = await this.prisma.organizationMember.findUnique({
            where: { id: memberId },
            include: { user: { select: { email: true, name: true } } }
        });

        if (!targetMember) {
            throw new NotFoundException('Member not found');
        }

        if (targetMember.organizationId !== org.id) {
            throw new BadRequestException('Member does not belong to this organization');
        }

        // Cannot deactivate yourself
        if (targetMember.userId === adminId) {
            throw new BadRequestException('You cannot deactivate your own account');
        }

        // Cannot deactivate another admin unless you're platform admin
        if (targetMember.role === 'ADMIN' && !isPlatformAdmin) {
            throw new BadRequestException('Only platform admins can deactivate organization admins');
        }

        const updatedMember = await this.prisma.organizationMember.update({
            where: { id: memberId },
            data: {
                status: 'DEACTIVATED' as OrganizationStatus,
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
                organization: { select: { name: true, slug: true } }
            }
        });

        // Send notification email to the deactivated user
        try {
            await this.emailService.sendEmail({
                to: updatedMember.user.email,
                subject: `Your account has been deactivated - ${updatedMember.organization.name}`,
                html: this.getDeactivatedEmailTemplate(
                    updatedMember.user.name || 'User',
                    updatedMember.organization.name,
                    reason
                ),
            });
        } catch (error) {
            console.error('Failed to send deactivation email:', error);
        }

        return {
            success: true,
            message: `Member ${targetMember.user.name || targetMember.user.email} has been deactivated`,
            member: updatedMember
        };
    }

    /**
     * Reactivate a suspended member's profile back to active status
     * Only works for SUSPENDED members, not DEACTIVATED
     */
    async reactivateMember(slug: string, memberId: string, adminId: string) {
        const org = await this.findOne(slug);

        // Check if admin has permission
        const adminMember = await this.prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId: adminId,
                    organizationId: org.id,
                },
            },
        });

        // Also check if user is a platform admin
        const adminUser = await this.prisma.user.findUnique({
            where: { id: adminId },
            select: { role: true }
        });

        const isPlatformAdmin = adminUser?.role === 'ADMIN';
        const isOrgAdmin = adminMember?.role === 'ADMIN';

        if (!isPlatformAdmin && !isOrgAdmin) {
            throw new BadRequestException('Only organization admins or platform admins can reactivate members');
        }

        // Get the target member
        const targetMember = await this.prisma.organizationMember.findUnique({
            where: { id: memberId },
            include: { user: { select: { email: true, name: true } } }
        });

        if (!targetMember) {
            throw new NotFoundException('Member not found');
        }

        if (targetMember.organizationId !== org.id) {
            throw new BadRequestException('Member does not belong to this organization');
        }

        // Can only reactivate suspended members
        if (targetMember.status !== OrganizationStatus.SUSPENDED) {
            throw new BadRequestException(
                targetMember.status === ('DEACTIVATED' as OrganizationStatus)
                    ? 'Deactivated accounts cannot be reactivated. Please create a new invitation.'
                    : 'Only suspended members can be reactivated'
            );
        }

        const updatedMember = await this.prisma.organizationMember.update({
            where: { id: memberId },
            data: {
                status: OrganizationStatus.ACTIVE,
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
                organization: { select: { name: true, slug: true } }
            }
        });

        // Send notification email to the reactivated user
        try {
            await this.emailService.sendEmail({
                to: updatedMember.user.email,
                subject: `Your account has been reactivated - ${updatedMember.organization.name}`,
                html: this.getReactivatedEmailTemplate(
                    updatedMember.user.name || 'User',
                    updatedMember.organization.name
                ),
            });
        } catch (error) {
            console.error('Failed to send reactivation email:', error);
        }

        return {
            success: true,
            message: `Member ${targetMember.user.name || targetMember.user.email} has been reactivated`,
            member: updatedMember
        };
    }

    /**
     * Resolve an OrganizationMember id to their TherapistProfile id, after checking
     * the requester is an org or platform admin and the member belongs to the org.
     * Shared by the leave-management endpoints.
     */
    private async resolveMemberTherapist(slug: string, memberId: string, adminId: string) {
        const org = await this.findOne(slug);

        const adminMember = await this.prisma.organizationMember.findUnique({
            where: { userId_organizationId: { userId: adminId, organizationId: org.id } },
        });
        const adminUser = await this.prisma.user.findUnique({
            where: { id: adminId },
            select: { role: true },
        });
        const isPlatformAdmin = adminUser?.role === 'ADMIN';
        const isOrgAdmin = adminMember?.role === 'ADMIN';
        if (!isPlatformAdmin && !isOrgAdmin) {
            throw new BadRequestException('Only organization admins or platform admins can manage leave');
        }

        const targetMember = await this.prisma.organizationMember.findUnique({
            where: { id: memberId },
        });
        if (!targetMember) {
            throw new NotFoundException('Member not found');
        }
        if (targetMember.organizationId !== org.id) {
            throw new BadRequestException('Member does not belong to this organization');
        }

        const therapist = await this.prisma.therapistProfile.findUnique({
            where: { userId: targetMember.userId },
            select: { id: true },
        });
        if (!therapist) {
            throw new BadRequestException('This member does not have a therapist profile');
        }
        return therapist.id;
    }

    /** Leave records (blocked dates) for a member's therapist profile. */
    async getMemberLeave(slug: string, memberId: string, adminId: string) {
        const therapistId = await this.resolveMemberTherapist(slug, memberId, adminId);
        return this.prisma.availabilityException.findMany({
            where: { therapistId, type: AvailabilityExceptionType.BLOCKED },
            orderBy: { date: 'asc' },
        });
    }

    /**
     * Add leave on the therapist's behalf. A From→To range is stored as one
     * BLOCKED AvailabilityException per day (the model keys on a single date).
     */
    async addMemberLeave(
        slug: string,
        memberId: string,
        adminId: string,
        body: { fromDate: string; toDate?: string; reason?: string },
    ) {
        const therapistId = await this.resolveMemberTherapist(slug, memberId, adminId);
        if (!body?.fromDate) {
            throw new BadRequestException('fromDate is required');
        }
        const from = new Date(`${body.fromDate}T00:00:00`);
        const to = new Date(`${body.toDate || body.fromDate}T00:00:00`);
        if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
            throw new BadRequestException('Invalid date');
        }
        if (to < from) {
            throw new BadRequestException('toDate must be on or after fromDate');
        }

        const created = [] as unknown[];
        for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
            created.push(
                await this.prisma.availabilityException.create({
                    data: {
                        therapistId,
                        date: new Date(d),
                        type: AvailabilityExceptionType.BLOCKED,
                        reason: body.reason || null,
                    },
                }),
            );
        }
        return { success: true, created };
    }

    /** Remove a leave record, scoped to the member's therapist profile. */
    async removeMemberLeave(slug: string, memberId: string, adminId: string, exceptionId: string) {
        const therapistId = await this.resolveMemberTherapist(slug, memberId, adminId);
        const exception = await this.prisma.availabilityException.findUnique({
            where: { id: exceptionId },
        });
        if (!exception || exception.therapistId !== therapistId) {
            throw new NotFoundException('Leave record not found');
        }
        await this.prisma.availabilityException.delete({ where: { id: exceptionId } });
        return { success: true };
    }

    /**
     * Approve & Activate (or Request Changes for) a member from the Add Therapist
     * wizard's Review step. Flips the OrganizationMember status and mirrors the
     * decision onto the therapist's org link if one exists.
     */
    async approveMember(slug: string, memberId: string, adminId: string, approve: boolean) {
        const org = await this.findOne(slug);

        const adminMember = await this.prisma.organizationMember.findUnique({
            where: { userId_organizationId: { userId: adminId, organizationId: org.id } },
        });
        const adminUser = await this.prisma.user.findUnique({
            where: { id: adminId },
            select: { role: true },
        });
        const isPlatformAdmin = adminUser?.role === 'ADMIN';
        const isOrgAdmin = adminMember?.role === 'ADMIN';
        if (!isPlatformAdmin && !isOrgAdmin) {
            throw new BadRequestException('Only organization admins or platform admins can approve members');
        }

        const targetMember = await this.prisma.organizationMember.findUnique({
            where: { id: memberId },
            include: { user: { select: { id: true, name: true, email: true } } },
        });
        if (!targetMember) {
            throw new NotFoundException('Member not found');
        }
        if (targetMember.organizationId !== org.id) {
            throw new BadRequestException('Member does not belong to this organization');
        }

        const updated = await this.prisma.organizationMember.update({
            where: { id: memberId },
            data: { status: approve ? OrganizationStatus.ACTIVE : OrganizationStatus.PENDING },
        });

        // Mirror onto the therapist's org link, if the member has one.
        const therapist = await this.prisma.therapistProfile.findUnique({
            where: { userId: targetMember.userId },
            select: { id: true },
        });
        if (therapist) {
            const link = await this.prisma.therapistOrganizationLink.findUnique({
                where: {
                    therapistId_organizationId: {
                        therapistId: therapist.id,
                        organizationId: org.id,
                    },
                },
            });
            if (link) {
                await this.prisma.therapistOrganizationLink.update({
                    where: { id: link.id },
                    data: approve
                        ? {
                              status: TherapistApprovalStatus.APPROVED,
                              approvedAt: new Date(),
                              approvedBy: adminId,
                          }
                        : { status: TherapistApprovalStatus.PENDING },
                });
            }
        }

        return {
            success: true,
            message: approve
                ? `${targetMember.user.name || targetMember.user.email} has been approved and activated`
                : `Changes requested from ${targetMember.user.name || targetMember.user.email}`,
            member: updated,
        };
    }

    /** Shared: resolve org and assert the requester is an org or platform admin. */
    private async getOrgAndAssertAdmin(slug: string, adminId: string) {
        const org = await this.findOne(slug);
        const adminMember = await this.prisma.organizationMember.findUnique({
            where: { userId_organizationId: { userId: adminId, organizationId: org.id } },
        });
        const adminUser = await this.prisma.user.findUnique({
            where: { id: adminId },
            select: { role: true },
        });
        if (adminUser?.role !== 'ADMIN' && adminMember?.role !== 'ADMIN') {
            throw new BadRequestException('Only organization admins or platform admins can perform this action');
        }
        return org;
    }

    private async getMemberInOrg(org: { id: string }, memberId: string) {
        const targetMember = await this.prisma.organizationMember.findUnique({ where: { id: memberId } });
        if (!targetMember) {
            throw new NotFoundException('Member not found');
        }
        if (targetMember.organizationId !== org.id) {
            throw new BadRequestException('Member does not belong to this organization');
        }
        return targetMember;
    }

    /** Add Therapist wizard: read a member's therapist profile for pre-fill. */
    async getMemberTherapistProfile(slug: string, memberId: string, adminId: string) {
        const org = await this.getOrgAndAssertAdmin(slug, adminId);
        const targetMember = await this.getMemberInOrg(org, memberId);
        const user = await this.prisma.user.findUnique({
            where: { id: targetMember.userId },
            select: { id: true, name: true, email: true },
        });
        const profile = await this.prisma.therapistProfile.findUnique({
            where: { userId: targetMember.userId },
        });
        const sessionTypes = profile
            ? await this.prisma.sessionType.findMany({
                  where: { therapistId: profile.id, isActive: true },
                  orderBy: { name: 'asc' },
              })
            : [];
        const availability = profile
            ? await this.prisma.therapistAvailability.findMany({
                  where: { therapistId: profile.id, isActive: true },
              })
            : [];
        return { member: targetMember, user, profile, sessionTypes, availability };
    }

    /** Resolve a member to their TherapistProfile id, creating a bare one if absent. */
    private async ensureMemberTherapist(org: { id: string }, memberId: string) {
        const targetMember = await this.getMemberInOrg(org, memberId);
        const existing = await this.prisma.therapistProfile.findUnique({
            where: { userId: targetMember.userId },
            select: { id: true },
        });
        if (existing) return existing.id;
        const created = await this.prisma.therapistProfile.create({
            data: { userId: targetMember.userId },
            select: { id: true },
        });
        return created.id;
    }

    /** Add Therapist wizard, Schedule step: replace the member's weekly availability. */
    async saveMemberAvailability(
        slug: string,
        memberId: string,
        adminId: string,
        slots: { dayOfWeek: number; startTime: string; endTime: string }[],
        timezone?: string,
    ) {
        const org = await this.getOrgAndAssertAdmin(slug, adminId);
        const therapistId = await this.ensureMemberTherapist(org, memberId);
        await this.prisma.therapistAvailability.deleteMany({ where: { therapistId } });
        if (slots?.length) {
            await this.prisma.therapistAvailability.createMany({
                data: slots.map((s) => ({
                    therapistId,
                    dayOfWeek: s.dayOfWeek,
                    startTime: s.startTime,
                    endTime: s.endTime,
                    timezone: timezone || 'Asia/Kolkata',
                })),
            });
        }
        return { success: true };
    }

    /** Add Therapist wizard, Fees step: upsert the member's session types by name+duration. */
    async saveMemberSessionTypes(
        slug: string,
        memberId: string,
        adminId: string,
        items: { name: string; duration: number; price: number; currency: string }[],
    ) {
        const org = await this.getOrgAndAssertAdmin(slug, adminId);
        const therapistId = await this.ensureMemberTherapist(org, memberId);
        const results: Prisma.SessionTypeGetPayload<{}>[] = [];
        for (const it of items || []) {
            const existing = await this.prisma.sessionType.findFirst({
                where: { therapistId, name: it.name, duration: it.duration },
            });
            if (existing) {
                results.push(
                    await this.prisma.sessionType.update({
                        where: { id: existing.id },
                        data: { defaultPrice: it.price, currency: it.currency, isActive: true },
                    }),
                );
            } else {
                results.push(
                    await this.prisma.sessionType.create({
                        data: {
                            therapistId,
                            name: it.name,
                            duration: it.duration,
                            defaultPrice: it.price,
                            currency: it.currency,
                        },
                    }),
                );
            }
        }
        return { success: true, sessionTypes: results };
    }

    /** Add Therapist wizard: save Basic Info + Credentials. Upserts the profile. */
    async saveMemberTherapistProfile(
        slug: string,
        memberId: string,
        adminId: string,
        data: SaveTherapistProfileInput,
    ) {
        const org = await this.getOrgAndAssertAdmin(slug, adminId);
        const targetMember = await this.getMemberInOrg(org, memberId);

        if (data.name) {
            await this.prisma.user.update({
                where: { id: targetMember.userId },
                data: { name: data.name },
            });
        }

        const profileData = {
            title: data.title,
            bio: data.bio,
            department: data.department,
            phone: data.phone,
            branch: data.branch,
            country: data.country,
            qualification: data.qualification,
            university: data.university,
            yearsExperience: data.yearsExperience,
            specializations: data.specializations,
            licenceNumber: data.licenceNumber,
            licenceExpiry: data.licenceExpiry ? new Date(data.licenceExpiry) : undefined,
            licenseAuthority: data.licenseAuthority
                ? (data.licenseAuthority as LicenseAuthority)
                : undefined,
            rciNumber: data.rciNumber,
            councilNumber: data.councilNumber,
            bcbaNumber: data.bcbaNumber,
            emiratesId: data.emiratesId,
            visaStatus: data.visaStatus,
            insuranceProvider: data.insuranceProvider,
            insurancePolicyNumber: data.insurancePolicyNumber,
            insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry) : undefined,
        };

        const profile = await this.prisma.therapistProfile.upsert({
            where: { userId: targetMember.userId },
            create: { userId: targetMember.userId, ...profileData },
            update: profileData,
        });
        return { success: true, profile };
    }

    // ── Family Intake Journey (org-scoped by Case.organizationId) ──

    /** Approved/linked therapists in the org, for the assign dropdown. */
    async getOrgTherapists(slug: string, adminId: string) {
        const org = await this.getOrgAndAssertAdmin(slug, adminId);
        const links = await this.prisma.therapistOrganizationLink.findMany({
            where: { organizationId: org.id },
            select: {
                therapist: {
                    select: { id: true, department: true, user: { select: { name: true } } },
                },
            },
        });
        return links.map((l) => ({
            id: l.therapist.id,
            name: l.therapist.user?.name ?? 'Therapist',
            department: l.therapist.department,
        }));
    }

    /** Families queue: every case belonging to this org. */
    async getOrgFamilies(slug: string, adminId: string) {
        const org = await this.getOrgAndAssertAdmin(slug, adminId);
        const cases = await this.prisma.case.findMany({
            where: { organizationId: org.id },
            select: {
                id: true,
                caseNumber: true,
                status: true,
                createdAt: true,
                child: {
                    select: {
                        firstName: true,
                        dateOfBirth: true,
                        guardians: {
                            where: { isPrimaryContact: true },
                            take: 1,
                            select: { fullName: true, email: true, userId: true },
                        },
                        // The account that owns the child's profile — a real (password-set)
                        // owner means the parent can already log in and see their child.
                        profile: { select: { user: { select: { name: true, password: true } } } },
                    },
                },
                primaryTherapist: { select: { id: true, user: { select: { name: true } } } },
                intake: { select: { state: true, createdAt: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return cases.map((c) => {
            const guardian = c.child.guardians[0];
            const owner = c.child.profile?.user;
            const hasAccess = !!owner?.password;
            return {
                caseId: c.id,
                caseNumber: c.caseNumber,
                childName: c.child.firstName,
                childDob: c.child.dateOfBirth,
                parentName: guardian?.fullName ?? owner?.name ?? null,
                submittedAt: c.intake?.createdAt ?? c.createdAt,
                assignedTherapistId: c.primaryTherapist?.id ?? null,
                assignedTherapistName: c.primaryTherapist?.user?.name ?? null,
                status: hasAccess ? 'ACCESS_GRANTED' : 'PENDING_REVIEW',
            };
        });
    }

    /** Full detail for one family/case (guardian, child, intake summary). */
    async getOrgFamilyDetail(slug: string, adminId: string, caseId: string) {
        const org = await this.getOrgAndAssertAdmin(slug, adminId);
        const c = await this.prisma.case.findFirst({
            where: { id: caseId, organizationId: org.id },
            select: {
                id: true,
                caseNumber: true,
                status: true,
                createdAt: true,
                child: {
                    select: {
                        id: true,
                        firstName: true,
                        nickname: true,
                        dateOfBirth: true,
                        gender: true,
                        guardians: {
                            select: {
                                fullName: true,
                                relationship: true,
                                email: true,
                                phone: true,
                                isPrimaryContact: true,
                                userId: true,
                            },
                        },
                        profile: { select: { user: { select: { name: true, email: true, password: true } } } },
                    },
                },
                primaryTherapist: { select: { id: true, user: { select: { name: true } } } },
                intake: {
                    select: {
                        state: true,
                        presentingConcern: true,
                        referralQuestions: true,
                        parentGoals: true,
                        urgencyFlag: true,
                        aiSummary: true,
                        consentAssessment: true,
                        consentTherapy: true,
                        consentSharing: true,
                        consentAi: true,
                    },
                },
            },
        });
        if (!c) {
            throw new NotFoundException('Family not found');
        }
        // Access = the child's profile owner can log in. Strip the profile (with its
        // password) from the response and expose only a boolean + safe owner fields.
        const owner = c.child.profile?.user;
        const { profile: _profile, ...child } = c.child;
        return {
            ...c,
            child,
            accessGranted: !!owner?.password,
            profileOwner: owner ? { name: owner.name, email: owner.email } : null,
        };
    }

    /** Assign (or reassign) the primary therapist on a family's case. */
    async assignOrgFamilyTherapist(slug: string, adminId: string, caseId: string, therapistId: string) {
        const org = await this.getOrgAndAssertAdmin(slug, adminId);
        const theCase = await this.prisma.case.findFirst({
            where: { id: caseId, organizationId: org.id },
            select: { id: true },
        });
        if (!theCase) {
            throw new NotFoundException('Family not found');
        }
        const link = await this.prisma.therapistOrganizationLink.findUnique({
            where: { therapistId_organizationId: { therapistId, organizationId: org.id } },
        });
        if (!link) {
            throw new BadRequestException('Therapist is not part of this organization');
        }
        await this.prisma.case.update({
            where: { id: caseId },
            data: { primaryTherapistId: therapistId },
        });
        return { success: true };
    }

    /**
     * Grant Platform Access: activate the account that already owns the child's
     * profile (real or shadow) into a login-capable account for the guardian's
     * email, and send a set-password link — the SAME mechanism as forgot-password.
     * This keeps Child.profileId intact (parent immediately sees their child) and
     * refuses to auto-merge if the guardian email already belongs to a different
     * account, rather than risk data integrity.
     */
    async grantOrgFamilyAccess(slug: string, adminId: string, caseId: string) {
        const org = await this.getOrgAndAssertAdmin(slug, adminId);
        const theCase = await this.prisma.case.findFirst({
            where: { id: caseId, organizationId: org.id },
            select: {
                id: true,
                child: {
                    select: {
                        profileId: true,
                        guardians: {
                            where: { isPrimaryContact: true },
                            take: 1,
                            select: { id: true, fullName: true, email: true, userId: true },
                        },
                    },
                },
            },
        });
        if (!theCase) {
            throw new NotFoundException('Family not found');
        }

        const guardian = theCase.child.guardians[0];

        const profile = await this.prisma.userProfile.findUnique({
            where: { id: theCase.child.profileId },
            select: { user: { select: { id: true, email: true, password: true, name: true } } },
        });
        const owner = profile?.user;
        if (!owner) {
            throw new BadRequestException('This child has no linked profile account.');
        }

        // Prefer the guardian's email; fall back to the profile owner's own address.
        const targetEmail = (guardian?.email || owner.email || '').toLowerCase().trim();
        if (!targetEmail) {
            throw new BadRequestException(
                'No email on file for this family. Add a guardian email before granting access.',
            );
        }

        // If the guardian email already belongs to a different account, merging the two
        // users + relinking the child is out of scope — refuse rather than corrupt data.
        const emailHolder = await this.prisma.user.findUnique({
            where: { email: targetEmail },
            select: { id: true },
        });
        if (emailHolder && emailHolder.id !== owner.id) {
            throw new BadRequestException(
                'An account already exists for this guardian email. Link it manually — automatic merge is not supported.',
            );
        }

        const resetToken = randomBytes(32).toString('hex');
        const data: Prisma.UserUpdateInput = {
            resetPasswordToken: resetToken,
            resetPasswordExpiry: new Date(Date.now() + 3600000),
        };
        if (owner.email.toLowerCase() !== targetEmail) data.email = targetEmail;
        // Never leave a null-password dead-end: seed a random password the parent then resets.
        if (!owner.password) data.password = await bcrypt.hash(randomBytes(24).toString('hex'), 10);
        await this.prisma.user.update({ where: { id: owner.id }, data });

        if (guardian && guardian.userId !== owner.id) {
            await this.prisma.guardian.update({ where: { id: guardian.id }, data: { userId: owner.id } });
        }

        this.emailService
            .sendPasswordResetEmail(targetEmail, resetToken, owner.name ?? guardian?.fullName ?? undefined)
            .catch((e) => this.logger.error(`Failed to send access email: ${e.message}`));

        return { success: true, message: `Access email sent to ${targetEmail}` };
    }

    /**
     * Get member status for a user in an organization
     */
    async getMemberStatus(organizationId: string, userId: string) {
        const member = await this.prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId,
                    organizationId,
                },
            },
            include: {
                organization: { select: { name: true, slug: true } }
            }
        });

        if (!member) {
            return null;
        }

        return {
            status: member.status,
            role: member.role,
            organization: member.organization,
            joinedAt: member.joinedAt
        };
    }

    // Email templates for status changes
    private getSuspendedEmailTemplate(userName: string, orgName: string, reason?: string): string {
        return `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; background: white; }
                    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px; text-align: center; }
                    .header h1 { color: white; margin: 0; }
                    .content { padding: 40px; }
                    .alert-box { background: #FEF3C7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; }
                    .button { display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #4FD1C5 0%, #38B2AC 100%); color: white; text-decoration: none; border-radius: 8px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>⚠️ Account Suspended</h1>
                    </div>
                    <div class="content">
                        <p style="font-size: 18px; font-weight: 600;">Hi ${userName},</p>
                        <p>Your account in <strong>${orgName}</strong> has been temporarily suspended.</p>
                        <div class="alert-box">
                            <strong>What does this mean?</strong><br><br>
                            Your access to ${orgName} has been temporarily restricted. You will not be able to access organization resources until your account is reactivated by an administrator.
                            ${reason ? `<br><br><strong>Reason:</strong> ${reason}` : ''}
                        </div>
                        <p>If you believe this was done in error, please contact your organization administrator to request reactivation.</p>
                        <p style="font-size: 14px; color: #718096; margin-top: 30px;">
                            Need help? Contact us at <a href="mailto:support@safehaven-upllyft.com">support@safehaven-upllyft.com</a>
                        </p>
                    </div>
                </div>
            </body>
        </html>
        `;
    }

    private getDeactivatedEmailTemplate(userName: string, orgName: string, reason?: string): string {
        return `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; background: white; }
                    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px; text-align: center; }
                    .header h1 { color: white; margin: 0; }
                    .content { padding: 40px; }
                    .alert-box { background: #FEE2E2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Account Deactivated</h1>
                    </div>
                    <div class="content">
                        <p style="font-size: 18px; font-weight: 600;">Hi ${userName},</p>
                        <p>Your account in <strong>${orgName}</strong> has been deactivated.</p>
                        <div class="alert-box">
                            <strong>What does this mean?</strong><br><br>
                            Your membership with ${orgName} has been permanently deactivated. You will no longer have access to organization resources.
                            ${reason ? `<br><br><strong>Reason:</strong> ${reason}` : ''}
                        </div>
                        <p>If you wish to rejoin the organization in the future, you will need to receive a new invitation from an administrator.</p>
                        <p style="font-size: 14px; color: #718096; margin-top: 30px;">
                            Need help? Contact us at <a href="mailto:support@upllyft.com">support@upllyft.com</a>
                        </p>
                    </div>
                </div>
            </body>
        </html>
        `;
    }

    private getReactivatedEmailTemplate(userName: string, orgName: string): string {
        return `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; background: white; }
                    .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 40px; text-align: center; }
                    .header h1 { color: white; margin: 0; }
                    .content { padding: 40px; }
                    .success-box { background: #D1FAE5; border-left: 4px solid #10B981; padding: 20px; margin: 20px 0; }
                    .button { display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #4FD1C5 0%, #38B2AC 100%); color: white; text-decoration: none; border-radius: 8px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Account Reactivated</h1>
                    </div>
                    <div class="content">
                        <p style="font-size: 18px; font-weight: 600;">Hi ${userName},</p>
                        <p>Great news! Your account in <strong>${orgName}</strong> has been reactivated.</p>
                        <div class="success-box">
                            <strong>Welcome back!</strong><br><br>
                            Your access to ${orgName} has been restored. You can now log in and access all organization resources as before.
                        </div>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">Log In Now</a>
                        </div>
                        <p style="font-size: 14px; color: #718096;">
                            Need help? Contact us at <a href="mailto:support@upllyft.com">support@upllyft.com</a>
                        </p>
                    </div>
                </div>
            </body>
        </html>
        `;
    }
}

