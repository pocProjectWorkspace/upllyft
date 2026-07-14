import { attachChildToFacility, childInFacility, childOnRoster } from '../src/common/child-scope';
import { prisma, scope, mkFacility, mkParentWithChild, cleanup, type Scope } from './helpers/fixtures';

/**
 * `attachChildToFacility` is the only helper that creates an affiliation, and it once
 * defaulted to `status: 'ACTIVE'`. That meant a nursery adding a child to its roster
 * would have GRANTED ITSELF ACCESS to that child — the facility consenting on the
 * guardian's behalf, which is the one thing consent exists to prevent.
 *
 * It also mirrored `Child.clinicId = facilityId` unconditionally, which for a nursery
 * would have surfaced an enrolled child inside every un-migrated CLINIC reader. The
 * helper written to make scoping safe would have been manufacturing the leak.
 */
describe('attachChildToFacility — the F2 consent gate', () => {
  const s: Scope = scope('t-scope');
  let nursery: string;
  let backfilledClinic: string;
  let nativeClinic: string;

  beforeAll(async () => {
    nursery = (await mkFacility(s, 'Nursery', 'NURSERY')).facility.id;
    backfilledClinic = (await mkFacility(s, 'Backfilled', 'CLINIC', { withLegacyClinic: true })).facility.id;
    nativeClinic = (await mkFacility(s, 'Native', 'CLINIC')).facility.id;
  });

  afterAll(async () => {
    await cleanup(s);
    await prisma.$disconnect();
  });

  it('a nursery enrolment starts PENDING_CONSENT, never ACTIVE', async () => {
    const { child } = await mkParentWithChild(s, 'Enrolled', '2023-03-12');
    const { affiliationId } = await attachChildToFacility(prisma, child.id, nursery);
    const aff = await prisma.childAffiliation.findUniqueOrThrow({ where: { id: affiliationId } });

    expect(aff.status).toBe('PENDING_CONSENT');
    expect(aff.status).not.toBe('ACTIVE');
    expect(aff.type).toBe('ENROLLED');
    expect(aff.dataScope).toBe('OBSERVATIONS_ONLY');
  });

  it('does NOT mirror the legacy Child.clinicId for a nursery', async () => {
    const { child } = await mkParentWithChild(s, 'NoMirror', '2023-03-12');
    await attachChildToFacility(prisma, child.id, nursery);
    const after = await prisma.child.findUniqueOrThrow({ where: { id: child.id } });
    expect(after.clinicId).toBeNull();
  });

  it('the roster shows a pending child; clinical readers do not (list is not read)', async () => {
    const { child } = await mkParentWithChild(s, 'Pending', '2023-03-12');
    await attachChildToFacility(prisma, child.id, nursery);

    // childInFacility is ACTIVE-only, so a reader that forgets to think about consent
    // gets the fail-closed answer. Seeing a pending child is an explicit opt-in.
    await expect(prisma.child.count({ where: { id: child.id, ...childInFacility(nursery) } })).resolves.toBe(0);
    await expect(prisma.child.count({ where: { id: child.id, ...childOnRoster(nursery) } })).resolves.toBe(1);
  });

  it('a nursery cannot hold a PATIENT affiliation', async () => {
    const { child } = await mkParentWithChild(s, 'NotPatient', '2023-03-12');
    await expect(
      attachChildToFacility(prisma, child.id, nursery, { type: 'PATIENT' }),
    ).rejects.toThrow(/cannot hold a PATIENT affiliation/i);
  });

  it('a nursery cannot be talked into FULL_CLINICAL scope', async () => {
    const { child } = await mkParentWithChild(s, 'NotFull', '2023-03-12');
    await expect(
      attachChildToFacility(prisma, child.id, nursery, { dataScope: 'FULL_CLINICAL' }),
    ).rejects.toThrow(/may not hold FULL_CLINICAL/i);
  });

  it('clinic behaviour is unchanged: PATIENT, ACTIVE, FULL_CLINICAL, clinicId mirrored', async () => {
    const { child } = await mkParentWithChild(s, 'Patient', '2021-03-12');
    const { affiliationId } = await attachChildToFacility(prisma, child.id, backfilledClinic);
    const aff = await prisma.childAffiliation.findUniqueOrThrow({ where: { id: affiliationId } });

    expect(aff.type).toBe('PATIENT');
    expect(aff.status).toBe('ACTIVE');
    expect(aff.dataScope).toBe('FULL_CLINICAL');

    const after = await prisma.child.findUniqueOrThrow({ where: { id: child.id } });
    expect(after.clinicId).toBe(backfilledClinic);
  });

  it('a NATIVELY-created clinic facility does not blow up on the legacy mirror', async () => {
    // Child.clinicId is an FK to `Clinic`, not `Facility`. Every clinic facility today
    // came from the backfill (ids preserved), so the mirror always happened to resolve —
    // but a natively-created one has no legacy row and used to raise P2003, taking the
    // whole enrolment down with it.
    const { child } = await mkParentWithChild(s, 'NativeKid', '2021-03-12');
    const { created } = await attachChildToFacility(prisma, child.id, nativeClinic);
    expect(created).toBe(true);

    const after = await prisma.child.findUniqueOrThrow({ where: { id: child.id } });
    expect(after.clinicId).toBeNull(); // nothing to mirror INTO

    // ...but the affiliation still scopes it correctly.
    await expect(
      prisma.child.count({ where: { id: child.id, ...childInFacility(nativeClinic) } }),
    ).resolves.toBe(1);
  });

  it('re-attaching is idempotent', async () => {
    const { child } = await mkParentWithChild(s, 'Idem', '2023-03-12');
    const a = await attachChildToFacility(prisma, child.id, nursery);
    const b = await attachChildToFacility(prisma, child.id, nursery);
    expect(b.created).toBe(false);
    expect(b.affiliationId).toBe(a.affiliationId);
  });
});
