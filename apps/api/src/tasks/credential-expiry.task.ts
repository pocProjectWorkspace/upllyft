// apps/api/src/tasks/credential-expiry.task.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CredentialStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Phase 0 (UAE): derive expired professional licences.
 * Flips VERIFIED therapist profiles to EXPIRED once their `licenceExpiry`
 * has passed, so the allocation guard (CasesService.assertTherapistAssignable)
 * automatically blocks new case assignments for lapsed licences.
 */
@Injectable()
export class CredentialExpiryTask {
  private readonly logger = new Logger(CredentialExpiryTask.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async expireLapsedLicences() {
    const now = new Date();
    const result = await this.prisma.therapistProfile.updateMany({
      where: {
        credentialStatus: CredentialStatus.VERIFIED,
        licenceExpiry: { lt: now },
      },
      data: { credentialStatus: CredentialStatus.EXPIRED },
    });

    if (result.count > 0) {
      this.logger.warn(
        `Marked ${result.count} therapist licence(s) as EXPIRED (licence expiry passed).`,
      );
    }
  }
}
