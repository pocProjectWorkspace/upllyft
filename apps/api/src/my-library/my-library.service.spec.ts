import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MyLibraryService } from './my-library.service';

const therapist = { id: 'ther-1', role: 'THERAPIST' };

function setup() {
  const prisma: any = {
    savedResource: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'saved-new' }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    resourceCollection: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'col-1', name: data.name })),
    },
    resourceCollectionItem: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    worksheet: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    libraryResource: { findMany: jest.fn().mockResolvedValue([]) },
    childResource: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const journeyLibrary: any = {
    cardsFor: jest.fn().mockImplementation((_v: string, refs: Array<{ kind: string; id: string }>) =>
      Promise.resolve(new Map(refs.map((r) => [`${r.kind}:${r.id}`, { kind: r.kind, id: r.id, title: r.id }]))),
    ),
    isVisible: jest.fn().mockResolvedValue(true),
  };
  const libraryResources: any = { visibleTo: jest.fn().mockResolvedValue({ audience: 'EVERYONE' }) };
  return { service: new MyLibraryService(prisma, journeyLibrary, libraryResources), prisma, journeyLibrary };
}

describe('MyLibraryService', () => {
  it('is for professionals only', async () => {
    const { service } = setup();
    await expect(service.listSaved({ id: 'p', role: 'USER' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('drops saved items that are no longer in the viewer’s Resource Library', async () => {
    const { service, prisma } = setup();
    prisma.savedResource.findMany.mockResolvedValue([
      { id: 's1', kind: 'WORKSHEET', worksheetId: 'w1', libraryResourceId: null, createdAt: new Date(), collections: [] },
      { id: 's2', kind: 'WORKSHEET', worksheetId: 'w-unpublished', libraryResourceId: null, createdAt: new Date(), collections: [] },
      { id: 's3', kind: 'LIBRARY', worksheetId: null, libraryResourceId: 'l1', createdAt: new Date(), collections: [] },
      { id: 's4', kind: 'LIBRARY', worksheetId: null, libraryResourceId: 'l-hidden', createdAt: new Date(), collections: [] },
    ]);
    prisma.worksheet.findMany.mockResolvedValue([
      { id: 'w1', difficulty: 'FOUNDATIONAL', previewUrl: null, isPublic: true, createdById: 'someone' },
    ]);
    prisma.libraryResource.findMany.mockResolvedValue([{ id: 'l1' }]);

    const res = await service.listSaved(therapist);
    expect(res.items.map((i) => i.savedId)).toEqual(['s1', 's3']);
    expect(res.counts.saved).toBe(2);
    expect(res.items[0]).toMatchObject({ difficulty: 'FOUNDATIONAL', canCustomise: true });
    expect(res.items[1]).toMatchObject({ difficulty: null, canCustomise: false });
  });

  it('counts distinct children and the latest assignment as usage', async () => {
    const { service, prisma } = setup();
    prisma.savedResource.findMany.mockResolvedValue([
      { id: 's1', kind: 'LIBRARY', worksheetId: null, libraryResourceId: 'l1', createdAt: new Date(), collections: [{ collectionId: 'c1' }] },
    ]);
    prisma.libraryResource.findMany.mockResolvedValue([{ id: 'l1' }]);
    prisma.resourceCollection.findMany.mockResolvedValue([{ id: 'c1', name: 'Ava' }]);
    const late = new Date('2026-10-10');
    prisma.childResource.findMany.mockResolvedValue([
      { childId: 'a', worksheetId: null, libraryResourceId: 'l1', assignedAt: new Date('2026-10-01') },
      { childId: 'a', worksheetId: null, libraryResourceId: 'l1', assignedAt: late },
      { childId: 'b', worksheetId: null, libraryResourceId: 'l1', assignedAt: new Date('2026-09-01') },
    ]);

    const res = await service.listSaved(therapist);
    expect(res.items[0].usage).toEqual({ clientCount: 2, lastUsedAt: late });
    expect(res.collections).toEqual([{ id: 'c1', name: 'Ava', count: 1 }]);
  });

  it('only saves what the viewer can see', async () => {
    const { service, journeyLibrary } = setup();
    journeyLibrary.isVisible.mockResolvedValue(false);
    await expect(service.save(therapist, 'LIBRARY', 'l1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('saving twice is a no-op', async () => {
    const { service, prisma } = setup();
    prisma.savedResource.findFirst.mockResolvedValue({ id: 'existing' });
    await expect(service.save(therapist, 'WORKSHEET', 'w1')).resolves.toEqual({ saved: true, id: 'existing' });
    expect(prisma.savedResource.create).not.toHaveBeenCalled();
  });

  it('adds to a collection only resources the viewer saved', async () => {
    const { service, prisma } = setup();
    prisma.resourceCollection.findFirst.mockResolvedValue({ id: 'c1' });
    prisma.savedResource.findMany.mockResolvedValue([{ id: 's1' }]);
    const res = await service.addToCollection(therapist, 'c1', ['s1', 'someone-elses']);
    expect(prisma.savedResource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['s1', 'someone-elses'] }, userId: 'ther-1' } }),
    );
    expect(res).toEqual({ added: 1 });
  });

  it('reads generating worksheets as drafts and counts each status', async () => {
    const { service, prisma } = setup();
    prisma.worksheet.findMany.mockResolvedValue([
      { id: '1', status: 'DRAFT', clonedFrom: null },
      { id: '2', status: 'GENERATING', clonedFrom: null },
      { id: '3', status: 'PUBLISHED', clonedFrom: { title: 'Original' } },
    ]);
    const res = await service.listCreations(therapist);
    expect(res.items.map((i) => i.status)).toEqual(['DRAFT', 'DRAFT', 'PUBLISHED']);
    expect(res.items[2].basedOn).toBe('Original');
    expect(res.counts).toEqual({ all: 3, draft: 2, published: 1 });
  });
});
