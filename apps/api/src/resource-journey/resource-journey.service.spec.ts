import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JourneyAccessService } from './journey-access.service';
import { JourneyLibraryService } from './journey-library.service';
import { ResourceJourneyService } from './resource-journey.service';

const parent = { id: 'parent-1', role: 'USER' };
const therapist = { id: 'ther-1', role: 'THERAPIST' };

function childRow(over: Record<string, any> = {}) {
  return {
    id: 'child-1',
    firstName: 'Aarav',
    dateOfBirth: new Date('2020-05-01'),
    profile: { userId: 'parent-1' },
    guardians: [],
    ...over,
  };
}

function makePrisma(over: Record<string, any> = {}) {
  const prisma: any = {
    child: {
      findUnique: jest.fn().mockResolvedValue(childRow()),
      findFirst: jest.fn().mockResolvedValue(childRow()),
      findMany: jest.fn().mockResolvedValue([]),
    },
    worksheet: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(1),
    },
    libraryResource: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(1),
    },
    childResource: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'item-1', logs: [], masteredOverride: null, ...data })),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
      upsert: jest.fn().mockResolvedValue({ id: 'item-9' }),
    },
    activityLog: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'log-1', ...data })),
    },
    assessment: { findFirst: jest.fn().mockResolvedValue(null) },
    booking: { findMany: jest.fn().mockResolvedValue([]) },
    progressShare: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'share-1', ...data })),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    worksheetAssignment: { upsert: jest.fn().mockResolvedValue({}) },
    ...over,
  };
  prisma.$transaction = jest.fn().mockImplementation((arg: any) => (Array.isArray(arg) ? Promise.all(arg) : arg(prisma)));
  return prisma;
}

function setup(over: Record<string, any> = {}) {
  const prisma = makePrisma(over);
  const libraryResources: any = {
    visibleTo: jest.fn().mockResolvedValue({ audience: 'EVERYONE' }),
    signedLinks: jest.fn().mockResolvedValue(new Map()),
  };
  const access = new JourneyAccessService(prisma);
  const library = new JourneyLibraryService(prisma, libraryResources);
  const events: any = { emit: jest.fn() };
  const service = new ResourceJourneyService(prisma, access, library, events);
  return { prisma, access, library, service, events, libraryResources };
}

describe('access', () => {
  it('lets the profile owner and consenting guardians in, nobody else', async () => {
    const { access, prisma } = setup();
    await expect(access.assertGuardian('parent-1', 'child-1')).resolves.toMatchObject({ id: 'child-1', ownerId: 'parent-1' });

    prisma.child.findUnique.mockResolvedValueOnce(childRow({ guardians: [{ id: 'g' }] }));
    await expect(access.assertGuardian('grandma', 'child-1')).resolves.toBeTruthy();

    prisma.child.findUnique.mockResolvedValueOnce(childRow());
    await expect(access.assertGuardian('stranger', 'child-1')).rejects.toBeInstanceOf(ForbiddenException);

    prisma.child.findUnique.mockResolvedValueOnce(null);
    await expect(access.assertGuardian('parent-1', 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects assigning to a child the therapist does not work with', async () => {
    const { service, prisma } = setup();
    prisma.child.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.assign(therapist, 'child-1', { kind: 'LIBRARY', resourceId: 'lib-1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('library list', () => {
  const ws = (over: Record<string, any> = {}) => ({
    id: 'w1', title: 'Feelings Cards', subType: 'matching', targetDomains: ['SOCIAL_EMOTIONAL'],
    ageRangeMin: 3, ageRangeMax: 9, durationMinutes: 10, practises: null, forText: null,
    createdAt: new Date('2026-09-01'), createdById: 'someone', metadata: {}, ...over,
  });
  const lib = (over: Record<string, any> = {}) => ({
    id: 'l1', title: 'Noise-Busting Toolkit', description: null, resourceType: 'GUIDE', tags: [],
    domains: ['sensory'], ageMin: 4, ageMax: 10, durationMinutes: 15, practises: 'Coping with loud places',
    forText: null, createdAt: new Date('2026-08-01'), mimeType: 'application/pdf', storagePath: 'p/x.pdf',
    fileUrl: 'u', downloadable: true, organization: { name: 'Al Noor Centre' }, ...over,
  });

  it('merges both kinds, ranks screening matches first and uses a fixed number of queries', async () => {
    const { library, prisma, libraryResources } = setup();
    prisma.worksheet.findMany.mockResolvedValue([ws(), ws({ id: 'w2', title: 'Old', targetDomains: ['GROSS_MOTOR'], createdAt: new Date('2026-01-01') })]);
    prisma.libraryResource.findMany.mockResolvedValue([lib()]);
    prisma.assessment.findFirst.mockResolvedValue({ id: 'a', domainScores: { sensoryProcessing: { status: 'RED' } }, flaggedDomains: [] });

    const child = { id: 'child-1', firstName: 'Aarav', dateOfBirth: new Date('2020-05-01'), ownerId: 'parent-1' };
    const res = await library.list(parent, child, {});

    expect(res.items.map((i) => i.id)).toEqual(['l1', 'w1', 'w2']);
    expect(res.items[0]).toMatchObject({ kind: 'LIBRARY', type: 'Guide', domains: ['sensory'], matchesScreening: true, source: 'Al Noor Centre' });
    expect(res.items[1]).toMatchObject({ kind: 'WORKSHEET', domains: ['social'], matchesScreening: false });
    expect(res.facets.byDomain.sensory).toBe(1);

    // One call each, however many rows — no per-item queries.
    expect(prisma.worksheet.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.libraryResource.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.childResource.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.assessment.findFirst).toHaveBeenCalledTimes(1);
    expect(libraryResources.signedLinks).toHaveBeenCalledTimes(1);
  });

  it('filters by area, type, age fit and screening match', async () => {
    const { library, prisma } = setup();
    prisma.worksheet.findMany.mockResolvedValue([ws(), ws({ id: 'w3', ageRangeMin: 10, ageRangeMax: 12 })]);
    prisma.libraryResource.findMany.mockResolvedValue([lib()]);
    const child = { id: 'child-1', firstName: 'Aarav', dateOfBirth: new Date('2020-05-01'), ownerId: 'parent-1' };

    expect((await library.list(parent, child, { domain: 'sensory' })).items.map((i) => i.id)).toEqual(['l1']);
    expect((await library.list(parent, child, { type: 'Worksheet' })).total).toBe(2);
    expect((await library.list(parent, child, { ageFit: 'true' })).items.map((i) => i.id)).not.toContain('w3');
    expect((await library.list(parent, child, { matchOnly: 'true' })).total).toBe(0);
  });
});

describe('logging', () => {
  it('saves an unsaved resource first, then logs the try', async () => {
    const { service, prisma } = setup();
    const res = await service.log(parent, 'child-1', { kind: 'LIBRARY', resourceId: 'l1', help: 2, engagement: 2, note: ' Loved it ' });
    expect(prisma.childResource.create).toHaveBeenCalledTimes(1);
    expect(prisma.activityLog.create.mock.calls[0][0].data).toMatchObject({ help: 2, engagement: 2, note: 'Loved it', childId: 'child-1' });
    expect(res.status).toBe('Practising');
  });

  it('reports the try that makes an item Mastered', async () => {
    const { service, prisma } = setup();
    prisma.childResource.findUnique.mockResolvedValue({
      id: 'item-1', masteredOverride: null,
      logs: [{ date: new Date('2026-09-01'), help: 2 }, { date: new Date('2026-09-02'), help: 2 }],
    });
    const res = await service.log(parent, 'child-1', { kind: 'LIBRARY', resourceId: 'l1', help: 2, engagement: 1 });
    expect(res.becameMastered).toBe(true);
    expect(prisma.childResource.create).not.toHaveBeenCalled();
  });

  it('rejects future dates and out-of-range scales', async () => {
    const { service } = setup();
    const tomorrow = new Date(Date.now() + 2 * 864e5).toISOString();
    await expect(service.log(parent, 'child-1', { kind: 'LIBRARY', resourceId: 'l1', help: 2, engagement: 1, date: tomorrow })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.log(parent, 'child-1', { kind: 'LIBRARY', resourceId: 'l1', help: 3, engagement: 1 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.log(parent, 'child-1', { kind: 'OTHER', resourceId: 'l1', help: 1, engagement: 1 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('will not save a resource the parent cannot see', async () => {
    const { service, prisma } = setup();
    prisma.libraryResource.count.mockResolvedValue(0);
    await expect(service.saveItem(parent, 'child-1', { kind: 'LIBRARY', resourceId: 'hidden' })).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('items', () => {
  it('a parent cannot remove a therapist-assigned item', async () => {
    const { service, prisma } = setup();
    prisma.childResource.findUnique.mockResolvedValue({ id: 'i', childId: 'child-1', source: 'ASSIGNED', unassignedAt: null });
    await expect(service.removeItem(parent, 'i')).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('sharing', () => {
  it('shares only with a therapist the parent works with', async () => {
    const { service } = setup();
    await expect(service.createShare(parent, 'child-1', { therapistUserId: 'random', periodDays: 30 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('replaces the previous live share and notifies the therapist', async () => {
    const { service, prisma, events } = setup();
    prisma.booking.findMany.mockResolvedValue([
      { startDateTime: new Date(Date.now() + 864e5), therapist: { userId: 'ther-1', title: 'SLP', user: { id: 'ther-1', name: 'Meera', image: null } } },
    ]);
    const share = await service.createShare(parent, 'child-1', { therapistUserId: 'ther-1', periodDays: 30, includeNotes: true });
    expect(prisma.progressShare.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { revokedAt: expect.any(Date) } }));
    expect(share).toMatchObject({ therapistUserId: 'ther-1', periodDays: 30, includeNotes: true });
    expect(events.emit).toHaveBeenCalledWith('progress.shared', expect.objectContaining({ therapistUserId: 'ther-1' }));
  });

  it('rejects other share periods', async () => {
    const { service, prisma } = setup();
    prisma.booking.findMany.mockResolvedValue([
      { startDateTime: new Date(), therapist: { userId: 'ther-1', title: null, user: { id: 'ther-1', name: 'M', image: null } } },
    ]);
    await expect(service.createShare(parent, 'child-1', { therapistUserId: 'ther-1', periodDays: 7 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('a revoked or foreign share reads as not found, and notes are hidden unless included', async () => {
    const { service, prisma } = setup();
    await expect(service.sharedProgress(therapist, 'share-x', {})).rejects.toBeInstanceOf(NotFoundException);

    prisma.progressShare.findFirst.mockResolvedValue({
      id: 's', periodDays: null, includeNotes: false, createdAt: new Date(), parent: { name: 'P' },
      child: { id: 'child-1', firstName: 'Aarav', dateOfBirth: null, profile: { userId: 'parent-1' } },
    });
    prisma.childResource.findMany.mockResolvedValue([
      { id: 'i', kind: 'LIBRARY', worksheetId: null, libraryResourceId: 'l1', assignedArea: null, masteredOverride: null,
        logs: [{ id: 'g', date: new Date(), help: 2, engagement: 2, note: 'private note' }] },
    ]);
    const res = await service.sharedProgress(therapist, 's', {});
    expect(res.timeline).toHaveLength(1);
    expect(res.timeline[0]).not.toHaveProperty('note');
  });
});

describe('therapist assignment', () => {
  it('a worksheet assignment writes the assignment and the library item together', async () => {
    const { service, prisma, events } = setup();
    await service.assign(therapist, 'child-1', { kind: 'WORKSHEET', resourceId: 'w1', goal: 'Practise at bath time', assignedArea: 'daily' });
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.worksheetAssignment.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ worksheetId: 'w1', assignedById: 'ther-1', assignedToId: 'parent-1', childId: 'child-1' }),
    }));
    expect(prisma.childResource.upsert.mock.calls[0][0].update).toMatchObject({ source: 'ASSIGNED', assignedById: 'ther-1', assignedArea: 'daily' });
    expect(events.emit).toHaveBeenCalledWith('resource.assigned', expect.objectContaining({ parentId: 'parent-1' }));
  });

  it('rejects an unknown area', async () => {
    const { service } = setup();
    await expect(service.assign(therapist, 'child-1', { kind: 'LIBRARY', resourceId: 'l1', assignedArea: 'vision' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('un-assigning keeps an item that already has the parent’s logs', async () => {
    const { service, prisma } = setup();
    prisma.childResource.findUnique.mockResolvedValue({ id: 'i', assignedById: 'ther-1', _count: { logs: 2 } });
    await expect(service.unassign(therapist, 'i')).resolves.toEqual({ removed: false, unassigned: true });
    expect(prisma.childResource.delete).not.toHaveBeenCalled();

    prisma.childResource.findUnique.mockResolvedValue({ id: 'i', assignedById: 'someone-else', _count: { logs: 0 } });
    await expect(service.unassign(therapist, 'i')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
