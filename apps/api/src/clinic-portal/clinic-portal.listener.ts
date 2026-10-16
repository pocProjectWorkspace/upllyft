import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService, NotificationType } from '../notification/notification.service';

/** Emitted by the clinic side whenever something the parent should see changes. */
export interface NotifyParentEvent {
  caseId: string;
  type: keyof typeof NotificationType;
  title: string;
  message: string;
  /** Clinic Portal tab to open: overview | sessions | reports | home | forms. */
  tab: string;
}

/**
 * Clinic → parent notifications for the Clinic Portal. Goes to the child's profile
 * owner and every guardian with authority who has an account, deep-linked to the
 * portal tab for that child. Best-effort: a failed notification never fails the
 * clinic action that raised it.
 */
@Injectable()
export class ClinicPortalListener {
  private readonly logger = new Logger(ClinicPortalListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  @OnEvent('clinic-portal.notify-parent')
  async notifyParent(e: NotifyParentEvent) {
    try {
      const c = await this.prisma.case.findUnique({
        where: { id: e.caseId },
        select: {
          child: {
            select: {
              id: true,
              firstName: true,
              profile: { select: { userId: true } },
              guardians: { where: { hasAuthorityToConsent: true, userId: { not: null } }, select: { userId: true } },
            },
          },
        },
      });
      if (!c) return;
      const parents = new Set<string>();
      if (c.child.profile?.userId) parents.add(c.child.profile.userId);
      for (const g of c.child.guardians) if (g.userId) parents.add(g.userId);

      await Promise.all(
        [...parents].map((userId) =>
          this.notifications.createNotification({
            userId,
            type: NotificationType[e.type],
            title: e.title,
            message: `${c.child.firstName}: ${e.message}`,
            actionUrl: `/clinic-portal?child=${c.child.id}&tab=${e.tab}`,
            relatedEntityId: c.child.id,
            relatedEntityType: 'child',
            priority: 'high',
          }),
        ),
      );
    } catch (err: any) {
      this.logger.error(`Clinic Portal parent notification failed: ${err?.message}`);
    }
  }
}
