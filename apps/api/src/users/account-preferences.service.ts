import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EMAIL_FREQUENCIES } from '../notification/email-rules';

/**
 * The toggles on Settings (notifications, privacy, crisis, feed), stored on
 * UserPreferences. Keys that already have a real column use it, so the rest of the app
 * honours them; the others live in the `notificationPrefs` JSON. Defaults match the page.
 */
const COLUMN_KEYS = {
  pushNotifications: 'pushNotifications',
  feedAutoplayMedia: 'autoplayVideos',
  crisisDetectionEnabled: 'crisisAutoDetection',
  showProfile: 'profilePublic',
} as const;

const DEFAULTS: Record<string, boolean> = {
  sessionReminders: true,
  communityReplies: true,
  worksheetAssignments: true,
  screeningResults: true,
  marketingEmails: false,
  pushNotifications: false,
  showProfile: true,
  showOnlineStatus: true,
  allowAnonymousPosting: false,
  crisisDetectionEnabled: true,
  crisisAutoNotify: false,
  crisisShowResources: true,
  feedShowTrending: true,
  feedShowRecommendations: true,
  feedShowAds: true,
  feedAutoplayMedia: false,
  feedFilterSensitive: false,
  feedCompactMode: false,
};

export const PREFERENCE_KEYS = Object.keys(DEFAULTS);

@Injectable()
export class AccountPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const row = await this.prisma.userPreferences.findUnique({ where: { userId } });
    const json = (row?.notificationPrefs && typeof row.notificationPrefs === 'object' ? row.notificationPrefs : {}) as Record<string, unknown>;
    const out: Record<string, unknown> = {
      emailNotifications: row?.emailNotifications ?? true,
      emailFrequency: (EMAIL_FREQUENCIES as readonly string[]).includes(String(row?.notificationFrequency)) ? row!.notificationFrequency : 'daily',
    };
    for (const key of PREFERENCE_KEYS) {
      const col = COLUMN_KEYS[key as keyof typeof COLUMN_KEYS];
      const stored = col ? (row as any)?.[col] : json[key];
      out[key] = typeof stored === 'boolean' ? stored : DEFAULTS[key];
    }
    return out;
  }

  async update(userId: string, body: Record<string, unknown>) {
    const data: Prisma.UserPreferencesUncheckedUpdateInput = {};
    const jsonPatch: Record<string, boolean> = {};

    for (const [key, value] of Object.entries(body ?? {})) {
      if (key === 'emailNotifications') {
        if (typeof value !== 'boolean') throw new BadRequestException('emailNotifications must be true or false.');
        data.emailNotifications = value;
        data.emailEnabled = value;
      } else if (key === 'emailFrequency') {
        if (!(EMAIL_FREQUENCIES as readonly string[]).includes(String(value))) {
          throw new BadRequestException(`emailFrequency must be one of ${EMAIL_FREQUENCIES.join(', ')}.`);
        }
        data.notificationFrequency = String(value);
        data.emailDigestFrequency = String(value);
      } else if (key in DEFAULTS) {
        if (typeof value !== 'boolean') throw new BadRequestException(`${key} must be true or false.`);
        const col = COLUMN_KEYS[key as keyof typeof COLUMN_KEYS];
        if (col) {
          (data as any)[col] = value;
          if (key === 'pushNotifications') data.pushEnabled = value;
        } else {
          jsonPatch[key] = value;
        }
      } else {
        throw new BadRequestException(`Unknown setting: ${key}`);
      }
    }

    const existing = await this.prisma.userPreferences.findUnique({ where: { userId }, select: { notificationPrefs: true } });
    if (Object.keys(jsonPatch).length) {
      const current = (existing?.notificationPrefs && typeof existing.notificationPrefs === 'object' ? existing.notificationPrefs : {}) as Record<string, unknown>;
      data.notificationPrefs = { ...current, ...jsonPatch } as Prisma.InputJsonValue;
    }

    await this.prisma.userPreferences.upsert({
      where: { userId },
      create: { userId, ...(data as any) },
      update: data,
    });
    return this.get(userId);
  }
}
