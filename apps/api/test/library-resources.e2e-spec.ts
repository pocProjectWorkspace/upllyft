import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { LibraryResourcesService } from '../src/library-resources/library-resources.service';
import {
  prisma,
  scope,
  mkUser,
  mkParentWithChild,
  mkFacility,
  cleanup,
  type Scope,
} from './helpers/fixtures';

/**
 * Library resource audiences (2026-10-04).
 *
 * Who SEES a resource is `audience` (EVERYONE / ALL_ORGS / ORGS) × `audienceSegment`
 * (ALL / FAMILIES / STAFF). A user is attached to an org by an ACTIVE membership, or as
 * a family through a child's ACTIVE facility affiliation. Org admins only ever target
 * their own org; only org resources can be view-only.
 *
 * Rows are inserted without a storagePath so no file is ever touched in storage.
 */
describe('Library resources: audiences, view-only, edit', () => {
  const s: Scope = scope('t-libr');
  const service = new LibraryResourcesService(prisma as any);
  const pdf = { buffer: Buffer.from('%PDF'), originalname: 'x.pdf', mimetype: 'application/pdf', size: 4 };
  const docx = {
    buffer: Buffer.from('PK'),
    originalname: 'x.docx',
    mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 2,
  };

  let orgA: { id: string };
  let orgB: { id: string };
  let affiliationId: string;
  const actor: Record<string, { id: string; role: string }> = {};
  const res: Record<string, string> = {};

  async function member(name: string, role: string, orgId: string, orgRole: 'ADMIN' | 'MEMBER' = 'MEMBER') {
    const user = await mkUser(s, name, role);
    await prisma.organizationMember.create({
      data: { userId: user.id, organizationId: orgId, role: orgRole, status: 'ACTIVE' },
    });
    return { id: user.id, role };
  }

  async function mkResource(
    key: string,
    data: {
      scope: 'PLATFORM' | 'ORGANIZATION';
      organizationId?: string;
      audience: string;
      audienceSegment?: string;
      targets?: string[];
      downloadable?: boolean;
      mimeType?: string;
    },
  ) {
    const r = await prisma.libraryResource.create({
      data: {
        title: `${s.tag} ${key}`,
        resourceType: 'GUIDE',
        fileUrl: `https://example.invalid/${key}.pdf`,
        fileName: `${key}.pdf`,
        mimeType: data.mimeType ?? 'application/pdf',
        fileSize: 4,
        scope: data.scope,
        organizationId: data.organizationId ?? null,
        audience: data.audience,
        audienceSegment: data.audienceSegment ?? 'ALL',
        downloadable: data.downloadable ?? true,
        audienceOrgs: { create: (data.targets ?? []).map((organizationId) => ({ organizationId })) },
      },
    });
    res[key] = r.id;
  }

  /** The keys of this run's resources that `who` can see. */
  async function seen(who: { id: string; role: string }, extra: Record<string, string> = {}) {
    const { resources } = await service.list(who, { search: s.tag, ...extra });
    return resources.map((r) => r.title.replace(`${s.tag} `, '')).sort();
  }

  beforeAll(async () => {
    const a = await mkFacility(s, 'Libr Nursery A', 'NURSERY');
    const b = await mkFacility(s, 'Libr Nursery B', 'NURSERY');
    orgA = a.org;
    orgB = b.org;

    actor.adminA = await member('admin-a', 'ORGANIZATION', orgA.id, 'ADMIN');
    actor.therapistA = await member('therapist-a', 'THERAPIST', orgA.id);
    actor.parentMemberA = await member('parent-member-a', 'USER', orgA.id);
    actor.memberB = await member('member-b', 'USER', orgB.id);
    const loner = await mkUser(s, 'loner');
    actor.loner = { id: loner.id, role: 'USER' };
    const superadmin = await mkUser(s, 'superadmin', 'SUPERADMIN');
    actor.superadmin = { id: superadmin.id, role: 'SUPERADMIN' };

    // A family attached to org A only through their child's nursery place.
    const fam = await mkParentWithChild(s, 'LibrKid', '2022-03-01');
    actor.parentAffA = { id: fam.user.id, role: 'USER' };
    const aff = await prisma.childAffiliation.create({
      data: { childId: fam.child.id, facilityId: a.facility.id, type: 'ENROLLED', status: 'ACTIVE' },
    });
    affiliationId = aff.id;

    await mkResource('everyone', { scope: 'PLATFORM', audience: 'EVERYONE' });
    await mkResource('allOrgs', { scope: 'PLATFORM', audience: 'ALL_ORGS' });
    await mkResource('orgsB', { scope: 'PLATFORM', audience: 'ORGS', targets: [orgB.id] });
    await mkResource('familiesA', {
      scope: 'ORGANIZATION',
      organizationId: orgA.id,
      audience: 'ORGS',
      audienceSegment: 'FAMILIES',
      targets: [orgA.id],
    });
    await mkResource('staffA', {
      scope: 'ORGANIZATION',
      organizationId: orgA.id,
      audience: 'ORGS',
      audienceSegment: 'STAFF',
      targets: [orgA.id],
      downloadable: false,
    });
  });

  afterAll(async () => {
    // Platform-owned rows hang off no test org, so they go by title; org rows cascade.
    await prisma.libraryResource.deleteMany({ where: { title: { startsWith: s.tag } } });
    await cleanup(s);
    await prisma.$disconnect();
  });

  describe('visibility', () => {
    it('a user with no organization sees only EVERYONE', async () => {
      expect(await seen(actor.loner)).toEqual(['everyone']);
    });

    it('an org B member sees ALL_ORGS and what targets org B, nothing of org A', async () => {
      expect(await seen(actor.memberB)).toEqual(['allOrgs', 'everyone', 'orgsB']);
    });

    it('families of org A see the families-only resource, not the staff one', async () => {
      expect(await seen(actor.parentMemberA)).toEqual(['allOrgs', 'everyone', 'familiesA']);
    });

    it('a family attached only through an ACTIVE affiliation counts as org A', async () => {
      expect(await seen(actor.parentAffA)).toEqual(['allOrgs', 'everyone', 'familiesA']);
    });

    it('staff of org A see the staff-only resource, not the families one', async () => {
      expect(await seen(actor.therapistA)).toEqual(['allOrgs', 'everyone', 'staffA']);
    });

    it('a family loses access when the affiliation ends', async () => {
      await prisma.childAffiliation.update({ where: { id: affiliationId }, data: { status: 'ENDED' } });
      try {
        expect(await seen(actor.parentAffA)).toEqual(['everyone']);
      } finally {
        await prisma.childAffiliation.update({ where: { id: affiliationId }, data: { status: 'ACTIVE' } });
      }
    });

    it("a plain member asking for org A's shelf still gets only what is aimed at them", async () => {
      expect(await seen(actor.parentMemberA, { organizationId: orgA.id })).toEqual(['familiesA']);
      expect(await seen(actor.memberB, { organizationId: orgA.id })).toEqual([]);
    });

    it("org A's admin sees the whole shelf, with its targets", async () => {
      const { resources } = await service.list(actor.adminA, { search: s.tag, organizationId: orgA.id });
      expect(resources.map((r) => r.title.replace(`${s.tag} `, '')).sort()).toEqual(['familiesA', 'staffA']);
      expect(resources[0].audienceOrgs).toEqual([expect.objectContaining({ id: orgA.id })]);
    });

    it('the admin console oversight list has every org resource; the target list stays private to it', async () => {
      expect(await seen(actor.superadmin, { scope: 'ORGANIZATION' })).toEqual(['familiesA', 'staffA']);
      const { resources } = await service.list(actor.memberB, { search: s.tag });
      expect(resources.every((r) => !('audienceOrgs' in r))).toBe(true);
    });

    it('a view-only resource has no download link', async () => {
      const { resources } = await service.list(actor.therapistA, { search: s.tag });
      const staff = resources.find((r) => r.id === res.staffA)!;
      const everyone = resources.find((r) => r.id === res.everyone)!;
      expect(staff.fileUrl).toBeTruthy();
      expect(staff.downloadUrl).toBeNull();
      expect(everyone.downloadUrl).toBe(everyone.fileUrl);
    });
  });

  describe('upload rules (all rejected before any file is stored)', () => {
    it('a plain org member cannot upload for the org', async () => {
      await expect(
        service.create(actor.therapistA, pdf, {
          title: 'nope',
          resourceType: 'GUIDE',
          scope: 'ORGANIZATION',
          organizationId: orgA.id,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('an org admin cannot publish platform-wide', async () => {
      await expect(
        service.create(actor.adminA, pdf, { title: 'nope', resourceType: 'GUIDE', scope: 'PLATFORM' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('only PDF, image and video files can be view-only', async () => {
      await expect(
        service.create(actor.adminA, docx, {
          title: 'nope',
          resourceType: 'GUIDE',
          scope: 'ORGANIZATION',
          organizationId: orgA.id,
          downloadable: 'false',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('selected organizations needs at least one real organization', async () => {
      await expect(
        service.create(actor.superadmin, pdf, {
          title: 'nope',
          resourceType: 'GUIDE',
          scope: 'PLATFORM',
          audience: 'ORGS',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.create(actor.superadmin, pdf, {
          title: 'nope',
          resourceType: 'GUIDE',
          scope: 'PLATFORM',
          audience: 'ORGS',
          organizationIds: 'not-a-real-org',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('editing', () => {
    it('an org admin changes the segment but cannot aim beyond their own org', async () => {
      const updated = await service.update(actor.adminA, res.familiesA, {
        audience: 'EVERYONE',
        organizationIds: [orgB.id],
        audienceSegment: 'ALL',
      });
      expect(updated.audience).toBe('ORGS');
      expect(updated.audienceSegment).toBe('ALL');
      expect(updated.audienceOrgs).toEqual([expect.objectContaining({ id: orgA.id })]);
      expect(await seen(actor.memberB)).not.toContain('familiesA');
      expect(await seen(actor.therapistA)).toContain('familiesA');
    });

    it('an org admin toggles view-only', async () => {
      const updated = await service.update(actor.adminA, res.staffA, { downloadable: true });
      expect(updated.downloadable).toBe(true);
      expect(updated.downloadUrl).toBeTruthy();
    });

    it('platform resources are always downloadable', async () => {
      const updated = await service.update(actor.superadmin, res.everyone, { downloadable: false });
      expect(updated.downloadable).toBe(true);
    });

    it('a super admin retargets a platform resource to other organizations', async () => {
      await service.update(actor.superadmin, res.orgsB, { organizationIds: [orgA.id] });
      expect(await seen(actor.memberB)).not.toContain('orgsB');
      expect(await seen(actor.parentAffA)).toContain('orgsB');
    });

    it('a super admin shares an org resource with everyone; the owner stays in charge of view-only', async () => {
      await service.update(actor.superadmin, res.familiesA, { audience: 'EVERYONE' });
      expect(await seen(actor.loner)).toContain('familiesA');

      // The org admin's later edit must not quietly narrow it back to their org.
      const updated = await service.update(actor.adminA, res.familiesA, { downloadable: false });
      expect(updated.audience).toBe('EVERYONE');
      expect(updated.downloadable).toBe(false);
      expect(await seen(actor.loner)).toContain('familiesA');
    });

    it('a super admin sharing with selected organisations keeps the owning org', async () => {
      const updated = await service.update(actor.superadmin, res.familiesA, {
        audience: 'ORGS',
        organizationIds: [orgB.id],
      });
      expect(updated.audienceOrgs!.map((o) => o.id).sort()).toEqual([orgA.id, orgB.id].sort());
      expect(await seen(actor.memberB)).toContain('familiesA');
      expect(await seen(actor.therapistA)).toContain('familiesA');
      expect(await seen(actor.loner)).not.toContain('familiesA');
    });

    it('someone from another org cannot edit', async () => {
      await expect(
        service.update(actor.memberB, res.familiesA, { title: 'hijack' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
