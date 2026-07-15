import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../src/prisma/prisma.module';
import { FacilitiesService } from '../src/facilities/facilities.service';
import { prisma, scope, mkUser, cleanup, type Scope } from './helpers/fixtures';

/**
 * Platform-admin nursery onboarding — the combined action.
 *
 * One step creates the organisation, its first site, and the two memberships the named
 * admin needs: OrganizationMember ADMIN (runs the account — what the "My Organisation"
 * resolver reads) and FacilityMember OWNER (runs the site — what the /nursery shell gates
 * on). Miss either and the front door dead-ends.
 *
 * (The platform-admin ROLE gate lives on the controller via @Roles(ADMIN, SUPERADMIN);
 * these tests exercise the service's data behaviour.)
 */
describe('Nursery onboarding (platform admin)', () => {
  const s: Scope = scope('t-onb');
  let mod: TestingModule;
  let svc: FacilitiesService;
  const platformAdmin = { id: 'seed-admin', role: 'ADMIN' };

  beforeAll(async () => {
    mod = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [FacilitiesService],
    }).compile();
    svc = mod.get(FacilitiesService);
  });

  afterAll(async () => {
    await cleanup(s);
    await prisma.$disconnect();
    await mod.close();
  });

  it('creates org + facility + BOTH memberships for the named admin', async () => {
    const admin = await mkUser(s, 'nursery-admin', 'EDUCATOR');

    const res = await svc.onboardNursery(platformAdmin, {
      name: `${s.tag} Nursery`,
      type: 'NURSERY',
      adminEmail: admin.email,
      licenseAuthority: 'KHDA',
      emirate: 'DUBAI',
    } as any);

    // The org is a NURSERY_GROUP, the facility is a NURSERY under it.
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: res.organizationId } });
    expect(org.kind).toBe('NURSERY_GROUP');
    const facility = await prisma.facility.findUniqueOrThrow({ where: { id: res.facilityId } });
    expect(facility.type).toBe('NURSERY');
    expect(facility.organizationId).toBe(org.id);

    // BOTH memberships, both ACTIVE, for the named admin.
    const om = await prisma.organizationMember.findUniqueOrThrow({
      where: { userId_organizationId: { userId: admin.id, organizationId: org.id } },
    });
    expect(om.role).toBe('ADMIN');
    expect(om.status).toBe('ACTIVE');

    const fm = await prisma.facilityMember.findUniqueOrThrow({
      where: { userId_facilityId: { userId: admin.id, facilityId: facility.id } },
    });
    expect(fm.role).toBe('OWNER');
    expect(fm.status).toBe('ACTIVE');
  });

  it('the onboarded admin can then reach their org and their nursery', async () => {
    const admin = await mkUser(s, 'reachable-admin', 'EDUCATOR');
    const res = await svc.onboardNursery(platformAdmin, {
      name: `${s.tag} Reachable Nursery`,
      type: 'NURSERY',
      adminEmail: admin.email,
      licenseAuthority: 'KHDA',
    } as any);

    // GET /organizations/my reads OrganizationMember → the resolver would land them here.
    const myOrgs = await prisma.organizationMember.findMany({
      where: { userId: admin.id, status: 'ACTIVE' },
      include: { organization: { select: { slug: true } } },
    });
    expect(myOrgs.map((m) => m.organization.slug)).toContain(res.organizationSlug);

    // facilitiesVisibleTo(admin) → the /nursery shell would show this facility.
    const staffs = await prisma.facility.findFirst({
      where: { id: res.facilityId, members: { some: { userId: admin.id, status: 'ACTIVE' } } },
    });
    expect(staffs).not.toBeNull();
  });

  it('refuses an admin email with no Upllyft account — staff are invited, never fabricated', async () => {
    await expect(
      svc.onboardNursery(platformAdmin, {
        name: `${s.tag} Ghost Nursery`,
        type: 'NURSERY',
        adminEmail: `${s.tag}.ghost@ancc.internal`,
      } as any),
    ).rejects.toThrow(/No Upllyft account/i);
    // ...and nothing was half-created.
    await expect(
      prisma.organization.count({ where: { slug: { contains: `${s.tag}-ghost` } } }),
    ).resolves.toBe(0);
  });

  it('rejects CLINIC (onboarded through the legacy path)', async () => {
    const admin = await mkUser(s, 'clinic-admin', 'EDUCATOR');
    await expect(
      svc.onboardNursery(platformAdmin, {
        name: `${s.tag} Clinic`,
        type: 'CLINIC',
        adminEmail: admin.email,
      } as any),
    ).rejects.toThrow(/nurseries and schools/i);
  });

  it('rejects a health licence on a nursery (DHA does not license a nursery)', async () => {
    const admin = await mkUser(s, 'badlicence-admin', 'EDUCATOR');
    await expect(
      svc.onboardNursery(platformAdmin, {
        name: `${s.tag} BadLicence Nursery`,
        type: 'NURSERY',
        adminEmail: admin.email,
        licenseAuthority: 'DHA',
      } as any),
    ).rejects.toThrow(/does not license a nursery/i);
  });
});
