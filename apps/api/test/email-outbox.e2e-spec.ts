import { EmailOutboxService } from '../src/email/email-outbox.service';
import { startOfUtcDay } from '../src/email/email-budget';
import { prisma, scope, type Scope } from './helpers/fixtures';

/**
 * The email outbox against the real database: the daily cap holds, and two replicas
 * draining at once send every email exactly once. Email is a fake; rows use the run tag.
 */
describe('Email outbox', () => {
  const s: Scope = scope('t-outbox');
  const sent: string[] = [];
  const email: any = {
    sendEmail: jest.fn(async (o: any) => {
      sent.push(typeof o.to === 'string' ? o.to : o.to.email);
      return { success: true, messageId: 'fake', timestamp: new Date() };
    }),
  };
  const outboxWith = (env: Record<string, string>) => new EmailOutboxService(prisma as any, email, { get: (k: string) => env[k] } as any);
  const mine = { toEmail: { contains: s.tag } };
  const queue = (n: number, prefix: string) =>
    Array.from({ length: n }, (_, i) => ({
      to: s.email(`${prefix}${i}`),
      subject: `Test ${i}`,
      text: 'hello',
      idempotencyKey: `${s.tag}-${prefix}-${i}`,
    }));
  /** enqueue() starts a drain in the background; let it finish. */
  const settle = async () => {
    for (let i = 0; i < 50; i++) {
      if (!(await prisma.emailOutbox.count({ where: { ...mine, status: 'SENDING' } }))) return;
      await new Promise((r) => setTimeout(r, 200));
    }
  };

  afterEach(async () => {
    await settle();
    await prisma.emailOutbox.deleteMany({ where: mine });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('stops at the daily limit minus the reserve, and ignores repeat enqueues', async () => {
    // Other rows may already count towards today; set the cap so exactly 2 of ours fit.
    const already = await prisma.emailOutbox.count({ where: { status: 'SENT', sentAt: { gte: startOfUtcDay() } } });
    const capped = outboxWith({ EMAIL_DAILY_LIMIT: String(already + 3), EMAIL_DAILY_RESERVE: '1' });

    const emails = queue(5, 'cap');
    expect(await capped.enqueue(emails)).toBe(5);
    expect(await capped.enqueue(emails)).toBe(0);
    await settle();
    await capped.drain();

    expect(await prisma.emailOutbox.count({ where: { ...mine, status: 'SENT' } })).toBe(2);
    expect(await prisma.emailOutbox.count({ where: { ...mine, status: 'QUEUED' } })).toBe(3);
    // Nothing left today; 3 queued + 1 new at 2 a day from tomorrow.
    expect((await capped.forecast(1)).days).toBe(1 + Math.ceil(4 / (already + 2)));
  });

  it('two replicas draining together send each email once', async () => {
    sent.length = 0;
    const a = outboxWith({});
    const b = outboxWith({});
    await prisma.emailOutbox.createMany({
      data: queue(30, 'race').map((e) => ({ toEmail: e.to, subject: e.subject, text: e.text, idempotencyKey: e.idempotencyKey })),
    });
    await Promise.all([a.drain(), b.drain()]);

    const ours = sent.filter((to) => to.includes(s.tag));
    expect(ours).toHaveLength(30);
    expect(new Set(ours).size).toBe(30);
    expect(await prisma.emailOutbox.count({ where: { ...mine, status: 'SENT', attempts: 1 } })).toBe(30);
  });

  it('retries a failed send later and gives up after the last attempt', async () => {
    const failing: any = { sendEmail: jest.fn(async () => ({ success: false, error: 'rate limited', timestamp: new Date() })) };
    const outbox = new EmailOutboxService(prisma as any, failing, { get: () => undefined } as any);
    await prisma.emailOutbox.create({ data: { toEmail: s.email('retry'), subject: 'x', text: 'x', idempotencyKey: `${s.tag}-retry`, attempts: 7 } });
    await outbox.drain();
    expect(await prisma.emailOutbox.findUnique({ where: { idempotencyKey: `${s.tag}-retry` } })).toMatchObject({
      status: 'FAILED',
      attempts: 8,
      lastError: 'rate limited',
    });
  });
});
