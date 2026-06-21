import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsentTemplateDto, PublishConsentVersionDto } from './dto/clinic-intake.dto';

/**
 * Phase 1 (UAE): clinic-configured consent templates with immutable versions.
 * A published version is never edited — a change publishes a new version.
 */
@Injectable()
export class ConsentTemplateService {
  constructor(private prisma: PrismaService) {}

  async listTemplates(clinicId?: string) {
    return this.prisma.consentTemplate.findMany({
      where: clinicId ? { clinicId } : {},
      include: { versions: { orderBy: { version: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTemplate(dto: CreateConsentTemplateDto) {
    return this.prisma.consentTemplate.create({
      data: { type: dto.type, name: dto.name, clinicId: dto.clinicId },
    });
  }

  /** Publish a new immutable version (auto-increments if version omitted). */
  async publishVersion(templateId: string, dto: PublishConsentVersionDto) {
    const template = await this.prisma.consentTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new NotFoundException('Consent template not found');

    const latest = await this.prisma.consentVersion.findFirst({
      where: { templateId },
      orderBy: { version: 'desc' },
    });
    const nextVersion = dto.version ?? (latest ? latest.version + 1 : 1);

    const existing = await this.prisma.consentVersion.findUnique({
      where: { templateId_version: { templateId, version: nextVersion } },
    });
    if (existing) {
      throw new BadRequestException(
        `Version ${nextVersion} already exists and is immutable — publish a new version instead.`,
      );
    }

    return this.prisma.consentVersion.create({
      data: {
        templateId,
        version: nextVersion,
        purpose: dto.purpose,
        bodyUrl: dto.bodyUrl,
        bodyHash: dto.bodyHash,
      },
    });
  }
}
