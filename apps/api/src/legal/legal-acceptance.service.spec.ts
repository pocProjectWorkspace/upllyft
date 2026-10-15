import { BadRequestException } from '@nestjs/common';
import { LegalAcceptanceService } from './legal-acceptance.service';
import { LEGAL_DOCUMENTS, statementHash } from './legal-documents';

const doc = (type: string) => LEGAL_DOCUMENTS.find((d) => d.type === type)!;

function setup() {
  const prisma: any = {
    legalAcceptance: {
      findMany: jest.fn().mockResolvedValue([]),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
  return { service: new LegalAcceptanceService(prisma), prisma };
}

describe('LegalAcceptanceService', () => {
  it('lists every current document as pending for a user with no acceptances', async () => {
    const { service } = setup();
    const pending = await service.pending('u1');
    expect(pending.map((d) => d.type)).toEqual(['TERMS', 'PRIVACY', 'AGE_18_PLUS']);
  });

  it('only counts acceptances of the current version', async () => {
    const { service, prisma } = setup();
    prisma.legalAcceptance.findMany.mockResolvedValue([{ documentType: 'TERMS' }]);
    const pending = await service.pending('u1');
    expect(pending.map((d) => d.type)).toEqual(['PRIVACY', 'AGE_18_PLUS']);
    // The query itself is pinned to current versions, so an old acceptance never matches.
    const where = prisma.legalAcceptance.findMany.mock.calls[0][0].where;
    expect(where.OR).toContainEqual({ documentType: 'TERMS', version: doc('TERMS').version, edition: 'GLOBAL' });
  });

  it('records each accepted document with the hash of its exact wording', async () => {
    const { service, prisma } = setup();
    await service.accept('u1', [{ type: 'TERMS', version: doc('TERMS').version }], {
      source: 'GATE',
      ipAddress: '1.2.3.4',
      userAgent: 'jest',
    });
    expect(prisma.legalAcceptance.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: 'u1',
          documentType: 'TERMS',
          version: doc('TERMS').version,
          statementHash: statementHash(doc('TERMS')),
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
    await service.recordAtRegistration('u1', { TERMS: doc('TERMS').version, PRIVACY: 'old', AGE_18_PLUS: undefined }, {});
    const rows = prisma.legalAcceptance.createMany.mock.calls[0][0].data;
    expect(rows.map((r: any) => r.documentType)).toEqual(['TERMS']);
    expect(rows[0].source).toBe('REGISTER');

    prisma.legalAcceptance.createMany.mockClear();
    await expect(service.recordAtRegistration('u2', {}, {})).resolves.toBeUndefined();
    expect(prisma.legalAcceptance.createMany).not.toHaveBeenCalled();
  });

  it('changing the wording changes the hash', () => {
    const terms = doc('TERMS');
    expect(statementHash({ ...terms, statement: `${terms.statement} ` })).not.toBe(statementHash(terms));
  });
});
