import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { Organization, OrganizationMember, OrganizationRole, OrganizationStatus, Prisma } from '@prisma/client';
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

    async getMembers(slug: string) {
        const org = await this.findOne(slug);
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

    async updateSettings(slug: string, userId: string, dto: { name?: string; description?: string; website?: string; logo?: string; banner?: string }) {
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

        return this.prisma.organization.update({
            where: { id: org.id },
            data: updateData,
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
                            Need help? Contact us at <a href="mailto:support@upllyft.com">support@upllyft.com</a>
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

