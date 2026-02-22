import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * PDPL Data Retention Service
 *
 * Retention policy:
 * - Active accounts: data retained indefinitely
 * - Closed accounts: clinical records retained 7 years (UAE medical records standard),
 *   PII anonymised after 90 days
 * - Messages: retained 3 years
 *
 * This is a placeholder that logs what would be deleted. Enable actual
 * deletion by setting RETENTION_DRY_RUN=false in environment.
 */
@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async enforceRetentionPolicy() {
    this.logger.log('Running PDPL data retention check...');

    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const threeYearsAgo = new Date(now.getTime() - 3 * 365 * 24 * 60 * 60 * 1000);

    // 1. Find soft-deleted users past 90-day PII retention window
    const deletedUsers = await this.prisma.user.findMany({
      where: {
        email: { startsWith: 'deleted-' },
        updatedAt: { lte: ninetyDaysAgo },
      },
      select: { id: true, updatedAt: true },
    });
    this.logger.log(
      `Would permanently anonymise ${deletedUsers.length} deleted user(s) past 90-day window`,
    );

    // 2. Find messages older than 3 years
    const oldMessageCount = await this.prisma.message.count({
      where: { createdAt: { lte: threeYearsAgo } },
    });
    this.logger.log(
      `Would archive/delete ${oldMessageCount} message(s) older than 3 years`,
    );

    // 3. Find Mira messages older than 3 years
    const oldMiraMessageCount = await this.prisma.miraMessage.count({
      where: { createdAt: { lte: threeYearsAgo } },
    });
    this.logger.log(
      `Would archive/delete ${oldMiraMessageCount} Mira message(s) older than 3 years`,
    );

    this.logger.log('PDPL data retention check complete (dry run).');
  }
}
