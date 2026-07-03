import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, TherapyDiscipline, ClinicalActivityType } from '@prisma/client';
import { ALL_CLINICAL_TEMPLATES } from './templates';

interface ListTemplateFilters {
  discipline?: TherapyDiscipline;
  activityType?: ClinicalActivityType;
  organizationId?: string | null;
}

@Injectable()
export class ClinicalTemplatesService {
  constructor(private prisma: PrismaService) {}

  /**
   * List active templates, optionally filtered by discipline / activity. Returns
   * global templates plus any org-scoped overrides for the given organization.
   */
  async list(filters: ListTemplateFilters = {}) {
    const where: Prisma.ClinicalTemplateWhereInput = { isActive: true };

    if (filters.discipline) where.discipline = filters.discipline;
    if (filters.activityType) where.activityType = filters.activityType;

    // Global templates + this org's templates (if any).
    where.OR = [
      { isGlobal: true, organizationId: null },
      ...(filters.organizationId
        ? [{ organizationId: filters.organizationId }]
        : []),
    ];

    return this.prisma.clinicalTemplate.findMany({
      where,
      orderBy: [{ discipline: 'asc' }, { activityType: 'asc' }, { name: 'asc' }],
    });
  }

  async getById(id: string) {
    const template = await this.prisma.clinicalTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Clinical template not found');
    return template;
  }

  async getByCode(code: string, organizationId?: string | null) {
    // Prefer an org-scoped template, fall back to the latest global version.
    const template = await this.prisma.clinicalTemplate.findFirst({
      where: {
        code,
        isActive: true,
        OR: [
          ...(organizationId ? [{ organizationId }] : []),
          { isGlobal: true, organizationId: null },
        ],
      },
      orderBy: [{ organizationId: 'desc' }, { version: 'desc' }],
    });
    if (!template) throw new NotFoundException(`Template "${code}" not found`);
    return template;
  }

  /**
   * The picker catalog: disciplines, each with the activity templates available.
   * Drives the "pick therapy type → pick template" flow.
   */
  async getCatalog(organizationId?: string | null) {
    const templates = await this.list({ organizationId });

    const byDiscipline = new Map<
      TherapyDiscipline,
      { code: string; name: string; activityType: ClinicalActivityType; id: string }[]
    >();

    for (const t of templates) {
      const list = byDiscipline.get(t.discipline) ?? [];
      list.push({
        id: t.id,
        code: t.code,
        name: t.name,
        activityType: t.activityType,
      });
      byDiscipline.set(t.discipline, list);
    }

    return Array.from(byDiscipline.entries()).map(([discipline, activities]) => ({
      discipline,
      activities,
    }));
  }

  /**
   * Idempotently upsert the built-in global template catalog. Used by the seed
   * script and safe to run repeatedly (keyed by code+version+null org).
   */
  async seedGlobalTemplates() {
    let created = 0;
    let updated = 0;

    for (const t of ALL_CLINICAL_TEMPLATES) {
      const existing = await this.prisma.clinicalTemplate.findFirst({
        where: { code: t.code, version: t.version ?? 1, organizationId: null },
      });

      const data = {
        code: t.code,
        name: t.name,
        description: t.description,
        discipline: t.discipline as TherapyDiscipline,
        activityType: t.activityType as ClinicalActivityType,
        version: t.version ?? 1,
        schema: t.schema as unknown as Prisma.InputJsonValue,
        isGlobal: true,
        organizationId: null,
        isActive: true,
      };

      if (existing) {
        await this.prisma.clinicalTemplate.update({
          where: { id: existing.id },
          data,
        });
        updated++;
      } else {
        await this.prisma.clinicalTemplate.create({ data });
        created++;
      }
    }

    return { created, updated, total: ALL_CLINICAL_TEMPLATES.length };
  }
}
