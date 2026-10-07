import { OUTBOX_BATCH, budgetConfig, daysToSend, queueAllowance, remainingForQueue, retryDelayMs, startOfUtcDay } from './email-budget';

describe('budgetConfig', () => {
  it('reads the limit and reserve', () => {
    expect(budgetConfig('300', '50')).toEqual({ limit: 300, reserve: 50 });
  });
  it('treats blank, zero and junk limits as no cap', () => {
    expect(budgetConfig(undefined, '50')).toEqual({ limit: null, reserve: 0 });
    expect(budgetConfig('0', '50')).toEqual({ limit: null, reserve: 0 });
    expect(budgetConfig('lots', undefined)).toEqual({ limit: null, reserve: 0 });
  });
  it('defaults the reserve to 50 and never above the limit', () => {
    expect(budgetConfig('300', undefined)).toEqual({ limit: 300, reserve: 50 });
    expect(budgetConfig('20', '50')).toEqual({ limit: 20, reserve: 20 });
  });
});

describe('queueAllowance', () => {
  const brevo = budgetConfig(300, 50);
  it('sends a batch at a time when there is no cap', () => {
    expect(queueAllowance(budgetConfig(null, null), 10_000)).toBe(OUTBOX_BATCH);
  });
  it('leaves the reserve for direct sends', () => {
    expect(queueAllowance(brevo, 0)).toBe(OUTBOX_BATCH);
    expect(queueAllowance(brevo, 230)).toBe(20);
    expect(queueAllowance(brevo, 250)).toBe(0);
    expect(queueAllowance(brevo, 299)).toBe(0);
    expect(remainingForQueue(brevo, 100)).toBe(150);
  });
});

describe('daysToSend', () => {
  const brevo = budgetConfig(300, 50); // 250 queued emails a day
  it('is one day when it fits today', () => {
    expect(daysToSend(brevo, 0, 0, 250)).toBe(1);
    expect(daysToSend(brevo, 0, 0, 0)).toBe(0);
    expect(daysToSend(budgetConfig(null, null), 0, 0, 5000)).toBe(1);
  });
  it('spreads a big import over the next days', () => {
    expect(daysToSend(brevo, 0, 0, 500)).toBe(2);
    expect(daysToSend(brevo, 0, 0, 501)).toBe(3);
    expect(daysToSend(brevo, 200, 0, 100)).toBe(2); // 50 today, 50 tomorrow
  });
  it('waits behind emails already queued', () => {
    expect(daysToSend(brevo, 0, 250, 10)).toBe(2);
    expect(daysToSend(brevo, 0, 400, 10)).toBe(2); // 150 backlog + 10 fit tomorrow
  });
});

describe('time helpers', () => {
  it('starts the day at UTC midnight', () => {
    expect(startOfUtcDay(new Date('2026-10-07T23:59:00+04:00')).toISOString()).toBe('2026-10-07T00:00:00.000Z');
  });
  it('backs off and caps at six hours', () => {
    expect(retryDelayMs(1)).toBe(5 * 60e3);
    expect(retryDelayMs(2)).toBe(10 * 60e3);
    expect(retryDelayMs(20)).toBe(6 * 3600e3);
  });
});
