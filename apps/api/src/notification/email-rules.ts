/**
 * When an in-app notification also goes out by email. Pure, so it is unit-tested
 * (email-rules.spec.ts).
 *
 *   never     — no notification emails at all (security / crisis still go).
 *   instant   — every allowed notification is emailed as it happens.
 *   daily     — urgent / high-priority ones go now; the rest wait for the daily digest.
 *   weekly    — the same, with a Monday digest.
 *
 * Categories match the toggles on Settings → Notifications. Anything not in a category
 * follows the master switch only.
 */

import { hubActionUrl } from './action-url';

export type EmailFrequency = 'instant' | 'daily' | 'weekly' | 'never';
export const EMAIL_FREQUENCIES: readonly EmailFrequency[] = ['instant', 'daily', 'weekly', 'never'];

export type EmailCategory = 'sessionReminders' | 'communityReplies' | 'worksheetAssignments' | 'screeningResults';

/** Sent whatever the preferences say — the user has to know. */
const ALWAYS = new Set(['SECURITY_ALERT', 'CRISIS_ALERT']);

/** In-app only: too frequent or too minor to email. */
const NEVER = new Set(['LIKE', 'VOTE', 'BOOKMARK', 'FOLLOW', 'POST_CREATED', 'POST_PUBLISHED', 'FIRST_POST']);

const CATEGORY: Record<string, EmailCategory> = {
  SESSION_REMINDER: 'sessionReminders',
  SESSION_BOOKED: 'sessionReminders',
  EVENT_REMINDER: 'sessionReminders',
  COMMENT: 'communityReplies',
  REPLY: 'communityReplies',
  MENTION: 'communityReplies',
  QUESTION_ANSWERED: 'communityReplies',
  ANSWER_ACCEPTED: 'communityReplies',
  WORKSHEET_ASSIGNED: 'worksheetAssignments',
  WORKSHEET_COMPLETED: 'worksheetAssignments',
  RESOURCE_ASSIGNED: 'worksheetAssignments',
  PROGRESS_SHARED: 'worksheetAssignments',
};

export interface EmailPrefs {
  /** Master switch (Settings → email). */
  enabled: boolean;
  frequency: EmailFrequency;
  /** Per-category toggles; missing = on. */
  categories: Partial<Record<EmailCategory, boolean>>;
}

export type EmailDecision = 'now' | 'digest' | 'skip';

export function emailDecision(
  n: { type: string; priority?: string | null },
  prefs: EmailPrefs,
): EmailDecision {
  if (ALWAYS.has(n.type)) return 'now';
  if (NEVER.has(n.type)) return 'skip';
  if (!prefs.enabled || prefs.frequency === 'never') return 'skip';
  const category = CATEGORY[n.type];
  if (category && prefs.categories[category] === false) return 'skip';
  if (prefs.frequency === 'instant') return 'now';
  if (n.priority === 'urgent' || n.priority === 'high') return 'now';
  return 'digest';
}

/** Read preferences from a UserPreferences row (or none — all defaults). */
export function emailPrefsFrom(row: {
  emailNotifications?: boolean | null;
  emailEnabled?: boolean | null;
  notificationFrequency?: string | null;
  notificationPrefs?: unknown;
} | null): EmailPrefs {
  const json = (row?.notificationPrefs && typeof row.notificationPrefs === 'object' ? row.notificationPrefs : {}) as Record<string, unknown>;
  const frequency = (EMAIL_FREQUENCIES as readonly string[]).includes(String(row?.notificationFrequency))
    ? (row!.notificationFrequency as EmailFrequency)
    : 'daily';
  const categories: EmailPrefs['categories'] = {};
  for (const key of ['sessionReminders', 'communityReplies', 'worksheetAssignments', 'screeningResults'] as const) {
    if (typeof json[key] === 'boolean') categories[key] = json[key] as boolean;
  }
  return {
    enabled: (row?.emailNotifications ?? true) && (row?.emailEnabled ?? true),
    frequency,
    categories,
  };
}

/** Is a digest due for this frequency today? Weekly digests go on Mondays (UTC). */
export function digestDue(frequency: EmailFrequency, now = new Date()): boolean {
  if (frequency === 'daily') return true;
  if (frequency === 'weekly') return now.getUTCDay() === 1;
  return false;
}

/** Look-back window for a digest. */
export function digestWindowStart(frequency: EmailFrequency, now = new Date()): Date {
  const days = frequency === 'weekly' ? 7 : 1;
  return new Date(now.getTime() - days * 864e5);
}

/** An app-relative or absolute action URL as an absolute link into the web app (hub routes). */
export function absoluteLink(frontendUrl: string, link?: string | null): string {
  const base = frontendUrl.replace(/\/+$/, '');
  const actionUrl = hubActionUrl(link);
  if (!actionUrl) return `${base}/notifications`;
  if (/^https?:\/\//i.test(actionUrl)) return actionUrl;
  return `${base}${actionUrl.startsWith('/') ? '' : '/'}${actionUrl}`;
}
