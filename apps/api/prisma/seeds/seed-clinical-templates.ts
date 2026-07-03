/**
 * Seed the global clinical template catalog (the 18 digitized clinic forms).
 * Idempotent — upserts by (code, version, organizationId=null).
 *
 *   pnpm --filter @upllyft/api db:seed:clinical
 */
import { PrismaClient, TherapyDiscipline, ClinicalActivityType } from '@prisma/client';
import { ALL_CLINICAL_TEMPLATES } from '../../src/clinical-templates/templates';

const prisma = new PrismaClient();

async function main() {
  console.log(`Seeding ${ALL_CLINICAL_TEMPLATES.length} clinical templates…`);
  let created = 0;
  let updated = 0;

  for (const t of ALL_CLINICAL_TEMPLATES) {
    const version = t.version ?? 1;
    const existing = await prisma.clinicalTemplate.findFirst({
      where: { code: t.code, version, organizationId: null },
    });

    const data = {
      code: t.code,
      name: t.name,
      description: t.description ?? null,
      discipline: t.discipline as TherapyDiscipline,
      activityType: t.activityType as ClinicalActivityType,
      version,
      schema: t.schema as any,
      isGlobal: true,
      organizationId: null,
      isActive: true,
    };

    if (existing) {
      await prisma.clinicalTemplate.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.clinicalTemplate.create({ data });
      created++;
    }
    console.log(`  ✓ ${t.code} (${t.discipline} / ${t.activityType})`);
  }

  console.log(`Done. Created ${created}, updated ${updated}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
