// apps/api/src/tasks/preauth-expiry.task.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PreAuthStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Phase 2 (UAE): pre-authorisation lifecycle automation.
 * Marks approved pre-auths EXPIRED once their validity passes, and surfaces
 * pre-auths that have exhausted their approved sessions so coordinators can
 * renew before the next encounter is blocked at clearance.
 */
@Injectable()
export class PreAuthExpiryTask {
  private readonly logger = new Logger(PreAuthExpiryTask.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async expireAndFlag() {
    const now = new Date();

    const expired = await this.prisma.preAuthorization.updateMany({
      where: { status: PreAuthStatus.APPROVED, validUntil: { lt: now } },
      data: { status: PreAuthStatus.EXPIRED },
    });
    if (expired.count > 0) {
      this.logger.warn(`Marked ${expired.count} pre-authorisation(s) as EXPIRED (validity passed).`);
    }

    const active = await this.prisma.preAuthorization.findMany({
      where: { status: PreAuthStatus.APPROVED, approvedSessions: { not: null } },
      select: { id: true, approvedSessions: true, usedSessions: true },
    });
    const exhausted = active.filter(
      (p) => p.approvedSessions != null && p.usedSessions >= p.approvedSessions,
    );
    if (exhausted.length > 0) {
      this.logger.warn(
        `${exhausted.length} pre-authorisation(s) have exhausted approved sessions — renewal needed.`,
      );
    }
  }
}
