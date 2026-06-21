import { Injectable, NotFoundException } from '@nestjs/common';
import { EhrExportStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEhrExportDto, ReconcileEhrExportDto } from './dto/orchestration.dto';

/**
 * Phase 3 (UAE): EHR export / handoff. Engagement-layer posture — authoritative
 * clinical artifacts are exported (PDF/structured now; FHIR/NABIDH later) and a
 * pointer (ehrRef) is reconciled back onto the source record. Upllyft is not the
 * legal record of truth.
 */
@Injectable()
export class EhrExportService {
  constructor(private prisma: PrismaService) {}

  list(clinicId: string) {
    return this.prisma.ehrExport.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(exportedById: string, dto: CreateEhrExportDto) {
    return this.prisma.ehrExport.create({
      data: {
        clinicId: dto.clinicId,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        format: dto.format,
        exportedById,
      },
    });
  }

  /** Mark exported and write the EHR reference back onto the source record. */
  async reconcile(exportId: string, dto: ReconcileEhrExportDto) {
    const exp = await this.prisma.ehrExport.findUnique({ where: { id: exportId } });
    if (!exp) throw new NotFoundException('Export not found');

    const updated = await this.prisma.ehrExport.update({
      where: { id: exportId },
      data: { status: EhrExportStatus.RECONCILED, ehrRef: dto.ehrRef, reconciledAt: new Date() },
    });

    // Write the pointer back onto the source artifact where we model it.
    if (exp.resourceType === 'CaseDocument') {
      await this.prisma.caseDocument.updateMany({
        where: { id: exp.resourceId },
        data: { ehrRef: dto.ehrRef, exportedToEhrAt: new Date() },
      });
    } else if (exp.resourceType === 'CaseSession') {
      await this.prisma.caseSession.updateMany({
        where: { id: exp.resourceId },
        data: { ehrRef: dto.ehrRef, exportedToEhrAt: new Date() },
      });
    }
    return updated;
  }
}
