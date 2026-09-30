import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService, NotificationType } from '../notification/notification.service';

export interface JoinWaitlistInput {
  childId?: string;
  country?: string;
  concern?: string;
  domains?: string[];
}

/**
 * Care waitlist (backlog #1). When Find Care has nothing for a family, they can ask
 * to be told when a provider joins in their country. The same rows are the demand
 * signal for the team: where families are waiting, and for what.
 *
 * Only providers ON Upllyft are ever offered to families — off-platform listings
 * are a later, separate decision.
 */
@Injectable()
export class CareWaitlistService {
  private readonly logger = new Logger(CareWaitlistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  /** Idempotent: one WAITING entry per parent, child, country and concern. */
  async join(userId: string, input: JoinWaitlistInput) {
    // The page sends the region it searched in; fall back to the parent's profile so
    // an entry is always tied to a country when we know one (notifications match on
    // country exactly).
    let country = input.country?.trim().toUpperCase() || null;
    if (!country) {
      const me = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { country: true, preferredRegion: true },
      });
      country = (me?.country || me?.preferredRegion)?.trim().toUpperCase() || null;
    }
    const concern = input.concern?.trim() || null;
    const childId = input.childId || null;

    if (childId) {
      const own = await this.prisma.child.findFirst({
        where: { id: childId, OR: [{ profile: { userId } }, { guardians: { some: { userId } } }] },
        select: { id: true },
      });
      if (!own) throw new ForbiddenException('You do not have access to this child.');
    }

    const existing = await this.prisma.careWaitlistEntry.findFirst({
      where: { userId, childId, country, concern, status: 'WAITING' },
    });
    if (existing) return existing;

    return this.prisma.careWaitlistEntry.create({
      data: { userId, childId, country, concern, domains: input.domains ?? [] },
    });
  }

  mine(userId: string) {
    return this.prisma.careWaitlistEntry.findMany({
      where: { userId, status: 'WAITING' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancel(userId: string, id: string) {
    const entry = await this.prisma.careWaitlistEntry.findFirst({ where: { id, userId } });
    if (!entry) throw new NotFoundException('Waitlist entry not found.');
    return this.prisma.careWaitlistEntry.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  /** Where families are waiting — for the admin console. */
  async demand() {
    const rows = await this.prisma.careWaitlistEntry.groupBy({
      by: ['country', 'concern'],
      where: { status: 'WAITING' },
      _count: { _all: true },
    });
    return rows
      .map((r) => ({ country: r.country, concern: r.concern, waiting: r._count._all }))
      .sort((a, b) => b.waiting - a.waiting);
  }

  /**
   * A provider just became available to families (therapist verified, clinic
   * approved). Tell everyone waiting in that country, once each, and close their
   * entries. Never throws: this runs inside approval flows that must not fail
   * because a notification did.
   */
  async notifyProviderJoined(provider: { country: string | null; kind: 'therapist' | 'clinic'; name: string }) {
    try {
      const country = provider.country?.trim().toUpperCase();
      if (!country) return;

      const waiting = await this.prisma.careWaitlistEntry.findMany({
        // Exact country only: an entry with no known country is demand data for the
        // team, not a licence to notify on every provider anywhere.
        where: { status: 'WAITING', country },
        select: { id: true, userId: true },
      });
      if (waiting.length === 0) return;

      const what = provider.kind === 'clinic' ? 'clinic' : 'therapist';
      for (const userId of new Set(waiting.map((w) => w.userId))) {
        await this.notifications
          .createNotification({
            userId,
            type: NotificationType.SYSTEM_ANNOUNCEMENT,
            title: `A new ${what} is available`,
            message: `${provider.name} just joined Upllyft near you. Take a look and see if they are a good fit.`,
            actionUrl: '/booking/find-care',
            priority: 'medium',
          })
          .catch((err: Error) => this.logger.warn(`Waitlist notify ${userId}: ${err.message}`));
      }

      await this.prisma.careWaitlistEntry.updateMany({
        where: { id: { in: waiting.map((w) => w.id) } },
        data: { status: 'NOTIFIED', notifiedAt: new Date() },
      });
      this.logger.log(`${provider.name} (${what}, ${country}): notified ${waiting.length} waitlist entr(ies)`);
    } catch (err) {
      this.logger.error(`Waitlist notification failed: ${(err as Error).message}`);
    }
  }
}
