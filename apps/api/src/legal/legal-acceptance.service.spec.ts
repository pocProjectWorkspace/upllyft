import { BadRequestException } from '@nestjs/common';
import { LegalAcceptanceService } from './legal-acceptance.service';
import { STATEMENTS, statementHash } from './legal-documents';

/** Terms / Privacy as LegalDocumentsService would publish them. */
function published(type: 'TERMS' | 'PRIVACY', acceptanceVersion = '2026-10-16') {
  return {
    type,
    edition: 'GLOBAL',
    title: type === 'TERMS' ? 'Terms of Service' : 'Privacy Policy',
    version: '2026-10-20',
    acceptanceVersion,
    content: '...',
    contentHash: 'h',
    publishedAt: new Date('2026-10-20T00:00:00Z'),
    url: type === 'TERMS' ? '/terms-of-service' : '/privacy-policy',
  };
}

function setup(acceptanceVersion = '2026-10-16') {
  const prisma: any = {
    legalAcceptance: {
      findMany: jest.fn().mockResolvedValue([]),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
  const documents: any = { current: jest.fn(async (type: 'TERMS' | 'PRIVACY') => published(type, acceptanceVersion)) };
  return { service: new LegalAcceptanceService(prisma, documents), prisma, documents };
}

describe('LegalAcceptanceService', () => {
  it('lists every current document as pending for a user with no acceptances', async () => {
    const { service } = setup();
    const pending = await service.pending('u1');
    expect(pending.map((d) => d.type)).toEqual(['TERMS', 'PRIVACY', 'AGE_18_PLUS']);
  });

  it('asks for the ACCEPTANCE version, so a wording fix does not prompt anyone', async () => {
    const { service } = setup('2026-10-16');
    const docs = await service.currentDocuments();
    // Published 2026-10-20 as a wording fix: users still accept 2026-10-16.
    expect(docs.find((d) => d.type === 'TERMS')).toMatchObject({ version: '2026-10-16', lastUpdated: '2026-10-20T00:00:00.000Z' });
  });

  it('only counts acceptances of the current version', async () => {
    const { service, prisma } = setup();
    prisma.legalAcceptance.findMany.mockResolvedValue([{ documentType: 'TERMS' }]);
    const pending = await service.pending('u1');
    expect(pending.map((d) => d.type)).toEqual(['PRIVACY', 'AGE_18_PLUS']);
    const where = prisma.legalAcceptance.findMany.mock.calls[0][0].where;
    expect(where.OR).toContainEqual({ documentType: 'TERMS', version: '2026-10-16', edition: 'GLOBAL' });
  });

  it('records each accepted document with the hash of its exact wording', async () => {
    const { service, prisma } = setup();
    await service.accept('u1', [{ type: 'TERMS', version: '2026-10-16' }], {
      source: 'GATE',
      ipAddress: '1.2.3.4',
      userAgent: 'jest',
    });
    const expected = statementHash({ type: 'TERMS', edition: 'GLOBAL', version: '2026-10-16', statement: STATEMENTS.TERMS });
    expect(prisma.legalAcceptance.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: 'u1',
          documentType: 'TERMS',
          version: '2026-10-16',
          statementHash: expected,
          source: 'GATE',
          ipAddress: '1.2.3.4',
        }),
      ],
    });
  });

  it('refuses a stale version or an unknown document', async () => {
    const { service } = setup();
    await expect(service.accept('u1', [{ type: 'TERMS', version: '1999-01-01' }], { source: 'GATE' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.accept('u1', [{ type: 'NOPE', version: '1' }], { source: 'GATE' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.accept('u1', [], { source: 'GATE' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('at sign-up records only the ticked boxes with current versions, and never throws for missing ones', async () => {
    const { service, prisma } = setup();
    await service.recordAtRegistration('u1', { TERMS: '2026-10-16', PRIVACY: 'old', AGE_18_PLUS: undefined }, {});
    const rows = prisma.legalAcceptance.createMany.mock.calls[0][0].data;
    expect(rows.map((r: any) => r.documentType)).toEqual(['TERMS']);
    expect(rows[0].source).toBe('REGISTER');

    prisma.legalAcceptance.createMany.mockClear();
    await expect(service.recordAtRegistration('u2', {}, {})).resolves.toBeUndefined();
    expect(prisma.legalAcceptance.createMany).not.toHaveBeenCalled();
  });

  it('changing the wording changes the hash', () => {
    const base = { type: 'TERMS' as const, edition: 'GLOBAL', version: '2026-10-16', statement: STATEMENTS.TERMS };
    expect(statementHash({ ...base, statement: `${base.statement} ` })).not.toBe(statementHash(base));
  });
});
