/**
 * Daily send allowance for the email outbox. Pure — unit-tested in email-budget.spec.ts.
 *
 * Free SMTP plans cap sends per day (Brevo: 300). Direct emails (password resets,
 * security, notifications) always go; queued bulk emails only use what is left after a
 * reserve kept for those direct ones.
 */

/** Emails claimed per drain pass. */
export const OUTBOX_BATCH = 50;
/** A queued email is given up (FAILED) after this many attempts. */
export const OUTBOX_MAX_ATTEMPTS = 8;
/** A SENDING row older than this was claimed by a replica that died; it is re-queued. */
export const OUTBOX_STALE_MS = 15 * 60 * 1000;

export interface BudgetConfig {
  /** Sends per UTC day the provider allows; null = no cap. */
  limit: number | null;
  /** Kept free each day for direct sends. */
  reserve: number;
}

/** EMAIL_DAILY_LIMIT / EMAIL_DAILY_RESERVE → config. Blank, 0 or junk limit = no cap. */
export function budgetConfig(limit: string | number | undefined | null, reserve: string | number | undefined | null): BudgetConfig {
  const l = Number(limit);
  const r = Number(reserve);
  const cap = Number.isFinite(l) && l > 0 ? Math.floor(l) : null;
  const keep = Number.isFinite(r) && r >= 0 ? Math.floor(r) : 50;
  return { limit: cap, reserve: cap === null ? 0 : Math.min(keep, cap) };
}

/** How many queued emails may go out now, given what was sent today. */
export function queueAllowance(config: BudgetConfig, sentToday: number): number {
  if (config.limit === null) return OUTBOX_BATCH;
  return Math.max(0, Math.min(OUTBOX_BATCH, config.limit - config.reserve - sentToday));
}

/** Queued emails left over today; null = no cap. */
export function remainingForQueue(config: BudgetConfig, sentToday: number): number | null {
  if (config.limit === null) return null;
  return Math.max(0, config.limit - config.reserve - sentToday);
}

/** How many days a batch of `count` queued emails takes to send, today included. */
export function daysToSend(config: BudgetConfig, sentToday: number, alreadyQueued: number, count: number): number {
  if (config.limit === null || count <= 0) return count > 0 ? 1 : 0;
  const perDay = config.limit - config.reserve;
  if (perDay <= 0) return Infinity;
  const today = Math.max(0, perDay - sentToday - alreadyQueued);
  if (count <= today) return 1;
  const backlog = Math.max(0, alreadyQueued - Math.max(0, perDay - sentToday));
  return 1 + Math.ceil((count - today + backlog) / perDay);
}

export function startOfUtcDay(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function startOfNextUtcDay(now = new Date()): Date {
  return new Date(startOfUtcDay(now).getTime() + 864e5);
}

/** Back-off before retry `attempts` (1-based): 5 min, 10, 20, … capped at 6 h. */
export function retryDelayMs(attempts: number): number {
  return Math.min(6 * 3600e3, 5 * 60e3 * 2 ** Math.max(0, attempts - 1));
}
