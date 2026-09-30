import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../src/prisma/prisma.module';
import { ClinicService } from '../src/clinic/clinic.service';
import { EmailService } from '../src/email/email.service';
import { ClinicTherapistsService } from '../src/clinic-therapists/clinic-therapists.service';
import {
  isClinicAdmin,
  managedClinicFor,
  syncPracticeCompliance,
} from '../src/common/clinic-admin';
import { prisma, scope, mkUser, cleanup, type Scope } from './helpers/fixtures';

/**
 * A self-onboarded therapist sets up their own practice and becomes its admin.
 *
 * The practice must come out in the same shape a clinic admin's clinic has —
 * org + OrganizationMember ADMIN, Clinic + Facility under ONE id, FacilityMember
 * OWNER — or some screen dead-ends: /org reads the org membership, /admin/clinic/*
 * reads the managed clinic, everything else reads the clinicId claim minted from
 * FacilityMember.
 */
describe('Practice setup (self-onboarded therapist)', () => {
  const s: Scope = scope('t-prac');
  let mod: TestingModule;
  let svc: ClinicService;
  let therapists: ClinicTherapistsService;
  const sendEmail = jest.fn().mockResolvedValue({ success: true });

  beforeAll(async () => {
    mod = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        ClinicService,
        ClinicTherapistsService,
        { provide: EmailService, useValue: { sendEmail } },
      ],
    }).compile();
    svc = mod.get(ClinicService);
    therapists = mod.get(ClinicTherapistsService);
  });

  afterAll(async () => {
    // TherapistProfile rows point at the practices' Clinic rows; drop them first.
    await prisma.therapistProfile.deleteMany({ where: { user: { email: { contains: s.tag } } } });
    await cleanup(s);
    await prisma.$disconnect();
    await mod.close();
  });

  it('creates org, clinic and facility under one id, with the therapist as owner/admin', async () => {
    const t = await mkUser(s, 'owner', 'THERAPIST');

    const res = await svc.setupPractice(t.id, { name: `${s.tag} Practice` });

    const clinic = await prisma.clinic.findUniqueOrThrow({ where: { id: res.clinicId } });
    const facility = await prisma.facility.findUniqueOrThrow({ where: { id: res.clinicId } });
    expect(clinic.adminId).toBe(t.id);
    expect(facility.type).toBe('CLINIC');
    expect(facility.migratedFromClinicId).toBe(clinic.id);
    expect(clinic.organizationId).toBe(facility.organizationId);

    const org = await prisma.organization.findUniqueOrThrow({ where: { id: facility.organizationId } });
    expect(org.kind).toBe('CLINIC_GROUP');
    expect(org.slug).toBe(res.organizationSlug);

    const om = await prisma.organizationMember.findUniqueOrThrow({
      where: { userId_organizationId: { userId: t.id, organizationId: org.id } },
    });
    expect(om).toMatchObject({ role: 'ADMIN', status: 'ACTIVE' });

    const fm = await prisma.facilityMember.findUniqueOrThrow({
      where: { userId_facilityId: { userId: t.id, facilityId: facility.id } },
    });
    expect(fm).toMatchObject({ role: 'OWNER', status: 'ACTIVE' });

    const profile = await prisma.therapistProfile.findUniqueOrThrow({ where: { userId: t.id } });
    expect(profile.clinicId).toBe(clinic.id);

    // An unverified therapist's practice waits for their licence review, and stays
    // out of the public directory meanwhile.
    expect(facility.complianceStatus).toBe('IN_REVIEW');
    expect(clinic.isPublic).toBe(false);

    // And they now administer exactly this clinic.
    const actor = { id: t.id, role: 'THERAPIST' };
    expect(await managedClinicFor(prisma, actor)).toBe(clinic.id);
    expect(await isClinicAdmin(prisma, actor)).toBe(true);
    const status = await svc.getPracticeStatus(actor);
    expect(status.status).toBe('OWNER');
    expect(status.canManageClinic).toBe(true);
  });

  it('refuses a second practice', async () => {
    const t = await mkUser(s, 'twice', 'THERAPIST');
    await svc.setupPractice(t.id, { name: `${s.tag} First` });
    await expect(svc.setupPractice(t.id, { name: `${s.tag} Second` })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('a therapist with no practice is not a clinic admin', async () => {
    const t = await mkUser(s, 'plain', 'THERAPIST');
    const actor = { id: t.id, role: 'THERAPIST' };
    expect(await managedClinicFor(prisma, actor)).toBeNull();
    expect(await isClinicAdmin(prisma, actor)).toBe(false);
    expect((await svc.getPracticeStatus(actor)).status).toBe('NONE');
  });

  it('practice compliance follows the owner’s licence verification', async () => {
    const t = await mkUser(s, 'verified', 'THERAPIST');
    await prisma.user.update({ where: { id: t.id }, data: { verificationStatus: 'VERIFIED' } });

    const res = await svc.setupPractice(t.id, { name: `${s.tag} Verified` });
    expect(res.complianceStatus).toBe('ACTIVE');

    await syncPracticeCompliance(prisma, t.id, 'REJECTED');
    const facility = await prisma.facility.findUniqueOrThrow({ where: { id: res.clinicId } });
    const clinic = await prisma.clinic.findUniqueOrThrow({ where: { id: res.clinicId } });
    expect(facility.complianceStatus).toBe('SUSPENDED');
    expect(clinic.complianceStatus).toBe('SUSPENDED');
  });

  it('"Add therapist" makes them facility staff and emails a password link', async () => {
    const owner = await mkUser(s, 'hiring-owner', 'THERAPIST');
    const { clinicId } = await svc.setupPractice(owner.id, { name: `${s.tag} Hiring` });
    sendEmail.mockClear();

    const created = await svc.createClinicTherapist(clinicId, {
      name: 'New Hire',
      email: `  ${s.tag}.New.Hire@ANCC.internal `,
    });

    expect(created.email).toBe(`${s.tag}.new.hire@ancc.internal`);
    expect(created.invited).toBe(true);
    expect(sendEmail).toHaveBeenCalledTimes(1);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: created.id } });
    expect(user.resetPasswordToken).toBeTruthy();
    const fm = await prisma.facilityMember.findUniqueOrThrow({
      where: { userId_facilityId: { userId: created.id, facilityId: clinicId } },
    });
    expect(fm).toMatchObject({ role: 'THERAPIST', status: 'ACTIVE' });
  });

  it('"Add therapist" attaches an existing unaffiliated therapist and rejects a parent’s email', async () => {
    const owner = await mkUser(s, 'attach-owner', 'THERAPIST');
    const { clinicId } = await svc.setupPractice(owner.id, { name: `${s.tag} Attach` });
    const existing = await mkUser(s, 'existing-therapist', 'THERAPIST');
    const parent = await mkUser(s, 'a-parent', 'USER');

    const attached = await svc.createClinicTherapist(clinicId, { name: 'X', email: existing.email });
    expect(attached.id).toBe(existing.id);
    expect(attached.invited).toBe(false);

    await expect(
      svc.createClinicTherapist(clinicId, { name: 'Y', email: parent.email }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('an owner cannot verify their own credentials', async () => {
    const owner = await mkUser(s, 'self-verify', 'THERAPIST');
    const { clinicId } = await svc.setupPractice(owner.id, { name: `${s.tag} Self` });
    const profile = await prisma.therapistProfile.findUniqueOrThrow({ where: { userId: owner.id } });

    await expect(
      therapists.updateCredentials(profile.id, { credentialStatus: 'VERIFIED' } as any, clinicId, {
        id: owner.id,
        role: 'THERAPIST',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
