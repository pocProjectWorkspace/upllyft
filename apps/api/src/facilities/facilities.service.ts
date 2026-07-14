import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { FacilityType, LicenseAuthority, OrgKind, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertFacilityMember,
  facilitiesVisibleTo,
  FACILITY_ADMIN_ROLES,
  type FacilityActor,
} from '../common/facility-scope';
import {
  authorityValidFor,
  FACILITY_CAPABILITIES,
  type FacilityType as CapFacilityType,
  type LicenseAuthority as CapLicenseAuthority,
} from '../common/facility-capabilities';
import {
  CreateFacilityDto,
  UpdateFacilityDto,
  CreateRoomDto,
  UpdateRoomDto,
  AddFacilityMemberDto,
  UpdateFacilityMemberDto,
} from './dto/facilities.dto';

/** Which OrgKind a facility of this type implies, when we mint the org ourselves. */
const ORG_KIND_FOR: Record<FacilityType, OrgKind> = {
  CLINIC: 'CLINIC_GROUP',
  NURSERY: 'NURSERY_GROUP',
  SCHOOL: 'SCHOOL_GROUP',
};

@Injectable()
export class FacilitiesService {
  private readonly logger = new Logger(FacilitiesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a facility.
   *
   * CLINIC IS DELIBERATELY NOT CREATABLE HERE. `Child.clinicId` is still an FK to
   * the legacy `Clinic` table, so a clinic facility only works if a `Clinic` row
   * exists under the same id — the invariant the Phase C backfill established. We
   * cannot honour that here, because `Clinic.adminId` is `@unique`: one clinic per
   * admin. A clinic GROUP with two sites therefore cannot have two Clinic rows
   * under one owner, so "just dual-write the legacy row" is not merely ugly, it is
   * unrepresentable — it is blocker 2 of the tenancy design, and the reason
   * `Facility` exists at all. Clinic creation stays on the legacy path until Phase F
   * drops `Child.clinicId`; then this restriction lifts and the `if` below dies.
   */
  async create(actor: FacilityActor, dto: CreateFacilityDto) {
    if (dto.type === 'CLINIC') {
      throw new BadRequestException(
        'Clinics cannot yet be created here — the legacy clinic record is still the ' +
          'system of record for patients. Create the clinic through clinic setup; it is ' +
          'mirrored to a facility automatically.',
      );
    }

    this.assertAuthorityFitsType(dto.type, dto.licenseAuthority);

    const organizationId = await this.resolveOrganization(actor, dto);
    const slug = await this.uniqueSlug(dto.name);

    const facility = await this.prisma.$transaction(async tx => {
      const created = await tx.facility.create({
        data: {
          organizationId,
          type: dto.type,
          name: dto.name,
          slug,
          licenseNo: dto.licenseNo ?? null,
          licenseAuthority: dto.licenseAuthority ?? null,
          emirate: dto.emirate ?? null,
          address: dto.address ?? null,
          phone: dto.phone ?? null,
          email: dto.email ?? null,
          // Stays DRAFT until a human reviews the licence. This gates nothing a
          // nursery does — `complianceStatus === ACTIVE` gates CASE CREATION, which
          // a nursery cannot do anyway — so a nursery is fully usable while its
          // paperwork is in review. That is intentional: the alternative is to
          // loosen the clinic compliance gate, which is what the separate
          // FacilityType exists to avoid.
          complianceStatus: 'DRAFT',
        },
      });

      // The creator owns it. Without this the facility is unreachable the moment
      // the request ends — membership is the only way back in.
      await tx.facilityMember.create({
        data: { facilityId: created.id, userId: actor.id, role: 'OWNER', status: 'ACTIVE' },
      });

      return created;
    });

    this.logger.log(
      `Facility created: ${facility.id} (${facility.type}) by user ${actor.id}`,
    );

    return this.detail(actor, facility.id);
  }

  /** Facilities the caller staffs. */
  async list(actor: FacilityActor) {
    return this.prisma.facility.findMany({
      where: facilitiesVisibleTo(actor),
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        complianceStatus: true,
        licenseAuthority: true,
        emirate: true,
        _count: { select: { rooms: true, members: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async detail(actor: FacilityActor, facilityId: string) {
    await assertFacilityMember(this.prisma, actor, facilityId);

    const facility = await this.prisma.facility.findUniqueOrThrow({
      where: { id: facilityId },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        licenseNo: true,
        licenseAuthority: true,
        emirate: true,
        complianceStatus: true,
        address: true,
        phone: true,
        email: true,
        organization: { select: { id: true, name: true, slug: true, kind: true } },
        rooms: {
          select: {
            id: true,
            name: true,
            ageBandLabel: true,
            _count: { select: { affiliations: true } },
          },
          orderBy: { name: 'asc' },
        },
      },
    });

    // Ship the capability map with the facility so the UI never has to infer what a
    // nursery may do from its type. One source of truth, and the client cannot
    // disagree with the server about it.
    return {
      ...facility,
      capabilities: FACILITY_CAPABILITIES[facility.type as CapFacilityType],
    };
  }

  async update(actor: FacilityActor, facilityId: string, dto: UpdateFacilityDto) {
    await assertFacilityMember(this.prisma, actor, facilityId, FACILITY_ADMIN_ROLES);

    const facility = await this.prisma.facility.findUniqueOrThrow({
      where: { id: facilityId },
      select: { type: true },
    });

    // Re-check on UPDATE, not just create. A licence authority that could be swapped
    // to DHA after the fact would make the create-time check theatre.
    this.assertAuthorityFitsType(facility.type, dto.licenseAuthority);

    await this.prisma.facility.update({
      where: { id: facilityId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.licenseNo !== undefined && { licenseNo: dto.licenseNo }),
        ...(dto.licenseAuthority !== undefined && { licenseAuthority: dto.licenseAuthority }),
        ...(dto.emirate !== undefined && { emirate: dto.emirate }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
      },
    });

    return this.detail(actor, facilityId);
  }

  // ─── Rooms ────────────────────────────────────────────────────────────────

  async listRooms(actor: FacilityActor, facilityId: string) {
    await assertFacilityMember(this.prisma, actor, facilityId);

    return this.prisma.room.findMany({
      where: { facilityId },
      select: {
        id: true,
        name: true,
        ageBandLabel: true,
        staff: {
          select: { id: true, role: true, user: { select: { id: true, name: true } } },
        },
        _count: { select: { affiliations: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createRoom(actor: FacilityActor, facilityId: string, dto: CreateRoomDto) {
    await assertFacilityMember(this.prisma, actor, facilityId, FACILITY_ADMIN_ROLES);

    try {
      return await this.prisma.room.create({
        data: { facilityId, name: dto.name, ageBandLabel: dto.ageBandLabel ?? null },
        select: { id: true, name: true, ageBandLabel: true },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002' // @@unique([facilityId, name])
      ) {
        throw new ConflictException(`This facility already has a room called "${dto.name}".`);
      }
      throw e;
    }
  }

  async updateRoom(
    actor: FacilityActor,
    facilityId: string,
    roomId: string,
    dto: UpdateRoomDto,
  ) {
    await assertFacilityMember(this.prisma, actor, facilityId, FACILITY_ADMIN_ROLES);
    await this.assertRoomInFacility(facilityId, roomId);

    return this.prisma.room.update({
      where: { id: roomId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.ageBandLabel !== undefined && { ageBandLabel: dto.ageBandLabel }),
      },
      select: { id: true, name: true, ageBandLabel: true },
    });
  }

  /**
   * Delete a room. REFUSES while children are in it.
   *
   * `Room.affiliations` is `onDelete: SetNull`, so deleting an occupied room would
   * succeed and quietly empty every child's room assignment — a roster that loses
   * children without saying so. Make the caller move them first.
   */
  async deleteRoom(actor: FacilityActor, facilityId: string, roomId: string) {
    await assertFacilityMember(this.prisma, actor, facilityId, FACILITY_ADMIN_ROLES);
    await this.assertRoomInFacility(facilityId, roomId);

    const occupants = await this.prisma.childAffiliation.count({
      where: { roomId, endedAt: null },
    });

    if (occupants > 0) {
      throw new ConflictException(
        `This room still has ${occupants} child${occupants === 1 ? '' : 'ren'} in it. ` +
          'Move them to another room before deleting it.',
      );
    }

    await this.prisma.room.delete({ where: { id: roomId } });
    return { deleted: true };
  }

  // ─── Staff ────────────────────────────────────────────────────────────────

  async listMembers(actor: FacilityActor, facilityId: string) {
    await assertFacilityMember(this.prisma, actor, facilityId);

    return this.prisma.facilityMember.findMany({
      where: { facilityId },
      select: {
        id: true,
        role: true,
        status: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, image: true } },
        rooms: { select: { id: true, name: true } },
        _count: { select: { keyworkerFor: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Add an EXISTING user as staff.
   *
   * Staff are invited, never fabricated. We do not mint a shadow account for an
   * educator the way walk-in intake once did for guardians — a staff member who
   * cannot log in is not staff, and an account someone did not create is not theirs.
   * If they are not on Upllyft yet, they sign up first.
   */
  async addMember(actor: FacilityActor, facilityId: string, dto: AddFacilityMemberDto) {
    await assertFacilityMember(this.prisma, actor, facilityId, FACILITY_ADMIN_ROLES);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      throw new NotFoundException(
        `No Upllyft account for ${dto.email}. Ask them to sign up, then add them.`,
      );
    }

    const existing = await this.prisma.facilityMember.findUnique({
      where: { userId_facilityId: { userId: user.id, facilityId } },
      select: { id: true, status: true },
    });

    if (existing) {
      if (existing.status === 'ACTIVE') {
        throw new ConflictException(`${user.email} already staffs this facility.`);
      }
      // Re-activating a previously-removed member, rather than colliding on the
      // @@unique([userId, facilityId]).
      return this.prisma.facilityMember.update({
        where: { id: existing.id },
        data: { role: dto.role, status: 'ACTIVE' },
        select: { id: true, role: true, status: true },
      });
    }

    return this.prisma.facilityMember.create({
      data: { facilityId, userId: user.id, role: dto.role, status: 'ACTIVE' },
      select: { id: true, role: true, status: true },
    });
  }

  async updateMember(
    actor: FacilityActor,
    facilityId: string,
    memberId: string,
    dto: UpdateFacilityMemberDto,
  ) {
    await assertFacilityMember(this.prisma, actor, facilityId, FACILITY_ADMIN_ROLES);

    const member = await this.assertMemberInFacility(facilityId, memberId);

    // Demoting the last OWNER orphans the facility: nobody can administer it, and
    // membership is the only route back in.
    if (member.role === 'OWNER' && dto.role !== 'OWNER') {
      await this.assertNotLastOwner(facilityId, memberId);
    }

    return this.prisma.facilityMember.update({
      where: { id: memberId },
      data: { role: dto.role },
      select: { id: true, role: true, status: true },
    });
  }

  /**
   * Remove staff. REFUSES if they are the last owner, or if children still name them
   * as keyworker — a child silently losing their keyworker is how a nursery loses
   * track of who is responsible for noticing.
   */
  async removeMember(actor: FacilityActor, facilityId: string, memberId: string) {
    await assertFacilityMember(this.prisma, actor, facilityId, FACILITY_ADMIN_ROLES);

    const member = await this.assertMemberInFacility(facilityId, memberId);

    if (member.role === 'OWNER') {
      await this.assertNotLastOwner(facilityId, memberId);
    }

    const keyworkerFor = await this.prisma.childAffiliation.count({
      where: { keyworkerId: memberId, endedAt: null },
    });

    if (keyworkerFor > 0) {
      throw new ConflictException(
        `This person is still the keyworker for ${keyworkerFor} child` +
          `${keyworkerFor === 1 ? '' : 'ren'}. Reassign them before removing this member.`,
      );
    }

    // Soft-remove: LEFT rather than a delete, so the audit trail of who observed
    // what survives the person leaving.
    await this.prisma.facilityMember.update({
      where: { id: memberId },
      data: { status: 'LEFT' },
    });

    return { removed: true };
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  /**
   * A nursery is never DHA-licensed and a clinic is never KHDA-licensed.
   *
   * This matters more than it looks: `complianceStatus === ACTIVE` gates case
   * creation, so without this check the way to make a nursery behave like a clinic
   * is to give it a health-authority licence and wait for approval.
   */
  private assertAuthorityFitsType(
    type: FacilityType,
    authority: LicenseAuthority | undefined,
  ): void {
    if (!authority) return;

    if (!authorityValidFor(type as CapFacilityType, authority as CapLicenseAuthority)) {
      const valid = FACILITY_CAPABILITIES[type as CapFacilityType].validAuthorities;
      throw new BadRequestException(
        `${authority} does not license a ${type.toLowerCase()}. Valid: ${valid.join(', ')}.`,
      );
    }
  }

  /** Reuse the caller's organization if they named one they administer; else mint it. */
  private async resolveOrganization(
    actor: FacilityActor,
    dto: CreateFacilityDto,
  ): Promise<string> {
    if (dto.organizationId) {
      const membership = await this.prisma.organizationMember.findFirst({
        where: {
          organizationId: dto.organizationId,
          userId: actor.id,
          status: 'ACTIVE',
          role: 'ADMIN',
        },
        select: { id: true },
      });

      // Not an admin of it => as far as this caller is concerned it isn't there.
      if (!membership && actor.role !== 'SUPERADMIN') {
        throw new NotFoundException('Organization not found.');
      }

      return dto.organizationId;
    }

    const slug = await this.uniqueOrgSlug(dto.name);

    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        slug,
        kind: ORG_KIND_FOR[dto.type],
        members: {
          create: { userId: actor.id, role: 'ADMIN', status: 'ACTIVE', joinedAt: new Date() },
        },
      },
      select: { id: true },
    });

    return org.id;
  }

  private slugify(name: string): string {
    return (
      name
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50) || 'facility'
    );
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base = this.slugify(name);
    for (let i = 0; i < 50; i++) {
      const candidate = i === 0 ? base : `${base}-${i + 1}`;
      const taken = await this.prisma.facility.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!taken) return candidate;
    }
    throw new ConflictException('Could not derive a unique slug — try a different name.');
  }

  private async uniqueOrgSlug(name: string): Promise<string> {
    const base = this.slugify(name);
    for (let i = 0; i < 50; i++) {
      const candidate = i === 0 ? base : `${base}-${i + 1}`;
      const taken = await this.prisma.organization.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!taken) return candidate;
    }
    throw new ConflictException('Could not derive a unique slug — try a different name.');
  }

  /** A room id from another facility must 404, not leak that it exists. */
  private async assertRoomInFacility(facilityId: string, roomId: string) {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, facilityId },
      select: { id: true },
    });
    if (!room) throw new NotFoundException('Room not found.');
    return room;
  }

  private async assertMemberInFacility(facilityId: string, memberId: string) {
    const member = await this.prisma.facilityMember.findFirst({
      where: { id: memberId, facilityId },
      select: { id: true, role: true, userId: true },
    });
    if (!member) throw new NotFoundException('Staff member not found.');
    return member;
  }

  private async assertNotLastOwner(facilityId: string, memberId: string) {
    const otherOwners = await this.prisma.facilityMember.count({
      where: { facilityId, role: 'OWNER', status: 'ACTIVE', NOT: { id: memberId } },
    });

    if (otherOwners === 0) {
      throw new ConflictException(
        'This is the facility’s only owner. Promote someone else to OWNER first, ' +
          'otherwise nobody can administer it.',
      );
    }
  }
}
