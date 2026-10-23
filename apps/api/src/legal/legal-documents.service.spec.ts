import { BadRequestException } from '@nestjs/common';
import { LegalDocumentsService } from './legal-documents.service';

/** A tiny in-memory stand-in for prisma.legalDocumentVersion. */
function setup() {
  const rows: any[] = [];
  let n = 0;
  const match = (r: any, where: any = {}) =>
    Object.entries(where).every(([k, v]: [string, any]) => {
      if (v && typeof v === 'object' && 'in' in v) return v.in.includes(r[k]);
      return r[k] === v;
    });
  const table = {
    count: jest.fn(async ({ where }: any) => rows.filter((r) => match(r, where)).length),
    findFirst: jest.fn(async ({ where }: any) =>
      rows.filter((r) => match(r, where)).sort((a, b) => +(b.publishedAt ?? 0) - +(a.publishedAt ?? 0))[0] ?? null),
    findMany: jest.fn(async ({ where }: any) => rows.filter((r) => match(r, where))),
    findUnique: jest.fn(async ({ where }: any) => rows.find((r) => r.id === where.id) ?? null),
    create: jest.fn(async ({ data }: any) => {
      const row = { id: `v${++n}`, status: 'DRAFT', edition: 'GLOBAL', version: null, acceptanceVersion: null, publishedAt: null, changeSummary: null, ...data };
      rows.push(row);
      return row;
    }),
    update: jest.fn(async ({ where, data }: any) => Object.assign(rows.find((r) => r.id === where.id), data)),
    delete: jest.fn(async ({ where }: any) => rows.splice(rows.findIndex((r) => r.id === where.id), 1)[0]),
  };
  const prisma: any = { legalDocumentVersion: table, $transaction: (fn: any) => fn(prisma) };
  const audit: any = { log: jest.fn() };
  return { service: new LegalDocumentsService(prisma, audit), rows, audit };
}

describe('LegalDocumentsService', () => {
  it('seeds Terms and Privacy from the built-in text, once', async () => {
    const { service, rows } = setup();
    await service.onModuleInit();
    await service.onModuleInit();
    expect(rows.map((r) => `${r.type}:${r.status}:${r.version}`)).toEqual([
      'TERMS:PUBLISHED:2026-10-18',
      'PRIVACY:PUBLISHED:2026-10-18',
    ]);
    expect(rows[0].content).toContain('MindsSparc Private Limited');
  });

  it('a wording fix publishes a new version without asking anyone to accept again', async () => {
    const { service, rows, audit } = setup();
    await service.onModuleInit();
    const draft = await service.startDraft('admin', 'terms');
    expect(draft.content).toBe(rows[0].content);
    await service.updateDraft('admin', draft.id, { content: `${draft.content}\nFixed a typo.` });
    const pub = await service.publish('super', draft.id, { requireAcceptance: false, changeSummary: 'Typo' });

    expect(pub.status).toBe('PUBLISHED');
    expect(pub.version).not.toBe('2026-10-18');
    expect(pub.acceptanceVersion).toBe('2026-10-18');
    expect(rows[0].status).toBe('SUPERSEDED'); // the old text stays, unchanged
    expect(rows[0].content).not.toContain('Fixed a typo.');
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'LEGAL_PUBLISHED' }));

    const current = await service.current('TERMS');
    expect(current!.content).toContain('Fixed a typo.');
  });

  it('a material change moves the acceptance version, so everyone is asked again', async () => {
    const { service } = setup();
    await service.onModuleInit();
    const draft = await service.startDraft('admin', 'PRIVACY');
    await service.updateDraft('admin', draft.id, { content: 'New privacy text' });
    const pub = await service.publish('super', draft.id, { requireAcceptance: true, changeSummary: 'New processors' });
    expect(pub.acceptanceVersion).toBe(pub.version);
  });

  it('published versions are read-only; a publish needs a change and a summary', async () => {
    const { service, rows } = setup();
    await service.onModuleInit();
    await expect(service.updateDraft('admin', rows[0].id, { content: 'x' })).rejects.toBeInstanceOf(BadRequestException);
    const draft = await service.startDraft('admin', 'terms');
    await expect(service.publish('super', draft.id, { changeSummary: 'none' })).rejects.toBeInstanceOf(BadRequestException);
    await service.updateDraft('admin', draft.id, { content: 'changed' });
    await expect(service.publish('super', draft.id, {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('an unpublished edition falls back to GLOBAL; agreements start empty until written', async () => {
    const { service } = setup();
    await service.onModuleInit();
    expect((await service.current('TERMS', 'AE'))!.edition).toBe('GLOBAL');
    const draft = await service.startDraft('admin', 'clinic-agreement', 'AE');
    expect(draft).toMatchObject({ type: 'CLINIC_AGREEMENT', edition: 'AE', status: 'DRAFT' });
  });
});
