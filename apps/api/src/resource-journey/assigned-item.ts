import { Prisma } from '@prisma/client';

/**
 * The child-library row for an assignment — created, or a parent-saved row promoted to
 * ASSIGNED. Shared with the existing worksheet-assignment flow so both paths agree.
 */
export async function upsertAssignedItem(
  tx: Prisma.TransactionClient,
  a: {
    childId: string;
    kind: 'WORKSHEET' | 'LIBRARY';
    resourceId: string;
    parentId: string;
    assignedById: string;
    goal?: string | null;
    targetDate?: Date | null;
    assignedArea?: string | null;
  },
) {
  const where =
    a.kind === 'WORKSHEET'
      ? { childId_worksheetId: { childId: a.childId, worksheetId: a.resourceId } }
      : { childId_libraryResourceId: { childId: a.childId, libraryResourceId: a.resourceId } };
  const assignment = {
    source: 'ASSIGNED',
    assignedById: a.assignedById,
    goal: a.goal ?? null,
    targetDate: a.targetDate ?? null,
    assignedArea: a.assignedArea ?? null,
    unassignedAt: null,
  };
  return tx.childResource.upsert({
    where,
    create: {
      childId: a.childId,
      kind: a.kind,
      ...(a.kind === 'WORKSHEET' ? { worksheetId: a.resourceId } : { libraryResourceId: a.resourceId }),
      savedById: a.parentId,
      ...assignment,
    },
    update: assignment,
  });
}
