import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { JourneyAccessService } from '../src/resource-journey/journey-access.service';
import { JourneyLibraryService } from '../src/resource-journey/journey-library.service';
import { ResourceJourneyService } from '../src/resource-journey/resource-journey.service';
import { prisma, scope, mkUser, mkParentWithChild, cleanup, type Scope } from './helpers/fixtures';

/**
 * The Resources journey against the real database: save → three solo tries → Mastered;
 * share with a booked therapist → therapist reads it → revoke → 404; a therapist
 * assigns to a client and only sees their own items.
 *
 * Only rows this run creates are touched: the run's users / children (fixtures), plus a
 * worksheet, session type and booking created here and deleted in afterAll.
 */
describe('Resources journey', () => {
  const s: Scope = scope('t-journey');
  const libraryResources: any = {
    visibleTo: async () => ({ id: 'none' }), // the run uses its own worksheet only
    signedLinks: async () => new Map(),
  };
  const access = new JourneyAccessService(prisma as any);
  const library = new JourneyLibraryService(prisma as any, libraryResources);
  const events = { emit: jest.fn() } as any;
  const journey = new ResourceJourneyService(prisma as any, access, library, events);

  let parent: any;
  let child: any;
  let therapistUser: any;
  let stranger: any;
  let worksheetId: string;
  let sessionTypeId: string;
  let bookingId: string;
  let therapistProfileId: string;

  beforeAll(async () => {
    ({ user: parent, child } = await mkParentWithChild(s, 'Aarav', '2020-05-01'));
    therapistUser = await mkUser(s, 'meera', 'THERAPIST');
    stranger = await mkUser(s, 'stranger', 'THERAPIST');
    const tp = await prisma.therapistProfile.create({ data: { userId: therapistUser.id, title: 'Speech-Language Pathologist' } });
    therapistProfileId = tp.id;
    const st = await prisma.sessionType.create({ data: { name: `${s.tag} session`, duration: 45, defaultPrice: 10, therapistId: tp.id } });
    sessionTypeId = st.id;
    const start = new Date(Date.now() + 3 * 864e5);
    const booking = await prisma.booking.create({
      data: {
        patientId: parent.id,
        therapistId: tp.id,
        sessionTypeId: st.id,
        childId: child.id,
        startDateTime: start,
        endDateTime: new Date(start.getTime() + 45 * 60e3),
        timezone: 'Asia/Dubai',
        duration: 45,
        subtotal: 10,
        platformFee: 1,
        therapistAmount: 9,
        status: 'CONFIRMED',
      },
    });
    bookingId = booking.id;
    const ws = await prisma.worksheet.create({
      data: {
        title: `${s.tag} Feelings Cards`,
        type: 'ACTIVITY',
        subType: 'matching',
        content: {},
        metadata: {},
        status: 'PUBLISHED',
        isPublic: true,
        targetDomains: ['SOCIAL_EMOTIONAL'],
        ageRangeMin: 3,
        ageRangeMax: 9,
        conditionTags: [],
        createdById: therapistUser.id,
      },
    });
    worksheetId = ws.id;
  });

  afterAll(async () => {
    await prisma.worksheetAssignment.deleteMany({ where: { worksheetId } });
    await prisma.childResource.deleteMany({ where: { childId: child.id } });
    await prisma.worksheet.deleteMany({ where: { id: worksheetId } });
    await prisma.booking.deleteMany({ where: { id: bookingId } });
    await prisma.sessionType.deleteMany({ where: { id: sessionTypeId } });
    await prisma.therapistProfile.deleteMany({ where: { id: therapistProfileId } });
    await cleanup(s);
    await prisma.$disconnect();
  });

  const asParent = () => ({ id: parent.id, role: 'USER' });
  const asTherapist = () => ({ id: therapistUser.id, role: 'THERAPIST' });

  it('lists the worksheet in the merged library for the child', async () => {
    const res = await library.list(asParent(), await access.assertGuardian(parent.id, child.id), { q: s.tag });
    expect(res.items.map((i) => i.id)).toContain(worksheetId);
    expect(res.items.find((i) => i.id === worksheetId)).toMatchObject({ domains: ['social'], fitsAge: true });
  });

  it('save → three "did it alone" tries → Mastered, and the item shows it', async () => {
    await journey.saveItem(asParent(), child.id, { kind: 'WORKSHEET', resourceId: worksheetId });
    // Saving twice is harmless.
    await journey.saveItem(asParent(), child.id, { kind: 'WORKSHEET', resourceId: worksheetId });

    let last: any;
    for (const daysBack of [3, 2, 1]) {
      last = await journey.log(asParent(), child.id, {
        kind: 'WORKSHEET',
        resourceId: worksheetId,
        help: 2,
        engagement: 2,
        date: new Date(Date.now() - daysBack * 864e5).toISOString(),
        note: daysBack === 1 ? 'Named three feelings' : undefined,
      });
    }
    expect(last.becameMastered).toBe(true);

    const { items, summary } = await journey.listItems(asParent(), child.id);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ status: 'Mastered', source: 'SAVED' });
    expect(items[0].logs).toHaveLength(3);
    expect(summary.Mastered).toBe(1);

    const progress = await journey.progress(asParent(), child.id, {});
    expect(progress.stats).toMatchObject({ logged30: 3, areas30: 1, mastered: 1 });
    expect(progress.timeline[0]).toMatchObject({ note: 'Named three feelings', milestone: 'Mastered' });
  });

  it('a stranger cannot read or write the child', async () => {
    await expect(journey.listItems({ id: stranger.id, role: 'THERAPIST' }, child.id)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      journey.log({ id: stranger.id, role: 'USER' }, child.id, { kind: 'WORKSHEET', resourceId: worksheetId, help: 1, engagement: 1 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('share with the booked therapist → they read it → revoke → 404', async () => {
    const { targets } = await journey.shareTargets(asParent(), child.id);
    expect(targets.map((t) => t.userId)).toEqual([therapistUser.id]);
    expect(targets[0].nextSession).toBeTruthy();

    const share = await journey.createShare(asParent(), child.id, { therapistUserId: therapistUser.id, periodDays: 30, includeNotes: false });
    const { shares } = await journey.sharedWithMe(asTherapist());
    expect(shares.map((x) => x.id)).toContain(share.id);

    const seen = await journey.sharedProgress(asTherapist(), share.id, {});
    expect(seen.stats.logged30).toBe(3);
    expect(seen.timeline[0]).not.toHaveProperty('note');

    await expect(journey.sharedProgress({ id: stranger.id, role: 'THERAPIST' }, share.id, {})).rejects.toBeInstanceOf(NotFoundException);

    await journey.revokeShare(asParent(), share.id);
    await expect(journey.sharedProgress(asTherapist(), share.id, {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('a booked therapist can assign to the child; a stranger cannot', async () => {
    const { clients } = await journey.myClients(asTherapist());
    expect(clients.map((c) => c.id)).toContain(child.id);

    await expect(
      journey.assign({ id: stranger.id, role: 'THERAPIST' }, child.id, { kind: 'WORKSHEET', resourceId: worksheetId }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await journey.assign(asTherapist(), child.id, { kind: 'WORKSHEET', resourceId: worksheetId, goal: 'Name a feeling at bedtime', assignedArea: 'social' });
    const wa = await prisma.worksheetAssignment.findFirst({ where: { worksheetId, childId: child.id } });
    expect(wa).toMatchObject({ assignedById: therapistUser.id, assignedToId: parent.id });

    // The parent's earlier saved row was promoted, not duplicated…
    expect((await journey.listItems(asParent(), child.id)).items).toHaveLength(1);

    // …but the three tries (and their note) logged BEFORE the assignment stay private.
    let { items } = await journey.assignedTo(asTherapist(), child.id);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ source: 'ASSIGNED', goal: 'Name a feeling at bedtime', status: 'To try' });
    expect(items[0].logs).toHaveLength(0);

    // A try logged after the assignment is the therapist's to see, note included.
    await journey.log(asParent(), child.id, { kind: 'WORKSHEET', resourceId: worksheetId, help: 1, engagement: 2, note: 'At bedtime' });
    ({ items } = await journey.assignedTo(asTherapist(), child.id));
    expect(items[0].logs).toHaveLength(1);
    expect(items[0].logs[0]).toMatchObject({ help: 1, note: 'At bedtime' });
  });
});
