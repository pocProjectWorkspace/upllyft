// prisma/seeds/import-providers.ts
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();

// State name normalization mapping
const STATE_NORMALIZATION: Record<string, string> = {
  'Uttaranchal': 'Uttarakhand',
  'Kerela': 'Kerala',
  'Online': 'Online',
  'Pondicherry': 'Puducherry',
};

// Organization type normalization
const ORG_TYPE_NORMALIZATION: Record<string, string> = {
  'NGO ': 'NGO',
  'Therapy centre': 'Therapy Centre',
  'Therapy Center': 'Therapy Centre',
  'Social Enterprise ': 'Social Enterprise',
  'Special School ': 'Special School',
  'Special school': 'Special School',
  'Vocational centre': 'Vocational Centre',
  'Child Development centre': 'Child Development Centre',
  'Clinic ': 'Clinic',
  'Individual ': 'Individual',
  'Rehabilitation Centre ': 'Rehabilitation Centre',
  'Rehabilitation centre': 'Rehabilitation Centre',
  'Residential centre': 'Residential Centre',
  'Intervention for Autism ': 'Intervention for Autism',
  'Section-8 Non-for-Profit Organisation': 'NGO',
  'Government aided': 'Government Centre',
  'PVT. LTD.': 'Private Limited',
};

function normalizeState(state: string): string {
  return STATE_NORMALIZATION[state] || state;
}

function normalizeOrgType(orgType: string): string {
  return ORG_TYPE_NORMALIZATION[orgType] || orgType;
}

function cleanEmail(email: string): string | null {
  if (!email) return null;
  return email
    .replace(/\[at\]/g, '@')
    .replace(/\[dot\]/g, '.')
    .trim()
    .toLowerCase();
}

function cleanWebsite(website: string): string | null {
  if (!website) return null;
  let cleaned = website
    .replace(/\[dot\]/g, '.')
    .replace(/www\[dot\]/g, 'www.')
    .trim()
    .toLowerCase();
  
  // Add https:// if not present
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'https://' + cleaned;
  }
  
  return cleaned;
}

function cleanPhone(phone: string): string | null {
  if (!phone) return null;
  // Remove spaces, dashes, and keep only digits and +
  return phone.replace(/[^\d+]/g, '').trim();
}

async function importProviders(filePath: string) {
  console.log('🚀 Starting provider import...\n');

  try {
    // Read Excel file
    console.log('📖 Reading Excel file...');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`✅ Found ${data.length} providers to import\n`);

    // Clear existing providers
    console.log('🧹 Clearing existing providers...');
    await prisma.provider.deleteMany();
    console.log('✅ Existing data cleared\n');

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Import each provider
    for (const row of data as any[]) {
      try {
        const state = row.state?.trim();
        const city = row.city?.trim();
        const organizationName = row.organization_name?.trim();
        const organizationType = row.organization_type?.trim();

        if (!state || !city || !organizationName || !organizationType) {
          errors.push(`Row ${row['Serial Number']}: Missing required fields`);
          errorCount++;
          continue;
        }

        const normalizedState = normalizeState(state);
        const normalizedOrgType = normalizeOrgType(organizationType);

        await prisma.provider.create({
          data: {
            serialNumber: parseInt(row['Serial Number']) || successCount + 1,
            state,
            city,
            organizationName,
            organizationType,
            contactPersonName: row.contact_person_name?.trim() || null,
            contactNumber: cleanPhone(row.contact_number) || null,
            email: cleanEmail(row.email) || null,
            address: row.address?.trim() || null,
            websiteLinkedin: cleanWebsite(row.website_linkedin) || null,
            normalizedState,
            normalizedOrgType,
            searchVector: `${organizationName} ${city} ${state} ${organizationType}`.toLowerCase(),
            isVerified: false,
          },
        });

        successCount++;
        if (successCount % 50 === 0) {
          console.log(`✅ Imported ${successCount} providers...`);
        }
      } catch (error: any) {
        errorCount++;
        errors.push(`Row ${row['Serial Number']}: ${error.message}`);
      }
    }

    console.log('\n📊 Import Summary:');
    console.log(`✅ Successfully imported: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);

    if (errors.length > 0 && errors.length <= 10) {
      console.log('\n⚠️  Errors:');
      errors.forEach((error) => console.log(`  - ${error}`));
    } else if (errors.length > 10) {
      console.log(`\n⚠️  ${errors.length} errors occurred (showing first 10):`);
      errors.slice(0, 10).forEach((error) => console.log(`  - ${error}`));
    }

    // Generate statistics
    const stats = await generateStats();
    console.log('\n📈 Provider Statistics:');
    console.log(`  Total Providers: ${stats.total}`);
    console.log(`  States Covered: ${stats.stateCount}`);
    console.log(`  Top 5 States:`);
    stats.topStates.forEach(({ state, count }) => {
      console.log(`    - ${state}: ${count}`);
    });
    console.log(`\n  Organization Types: ${stats.orgTypeCount}`);
    console.log(`  Top 5 Types:`);
    stats.topOrgTypes.forEach(({ type, count }) => {
      console.log(`    - ${type}: ${count}`);
    });

    console.log('\n✅ Import completed successfully!');
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function generateStats() {
  const total = await prisma.provider.count();
  
  const stateGroups = await prisma.provider.groupBy({
    by: ['normalizedState'],
    _count: true,
    orderBy: {
      _count: {
        normalizedState: 'desc',
      },
    },
    take: 5,
  });

  const orgTypeGroups = await prisma.provider.groupBy({
    by: ['normalizedOrgType'],
    _count: true,
    orderBy: {
      _count: {
        normalizedOrgType: 'desc',
      },
    },
    take: 5,
  });

  const stateCount = await prisma.provider.groupBy({
    by: ['normalizedState'],
  });

  const orgTypeCount = await prisma.provider.groupBy({
    by: ['normalizedOrgType'],
  });

  return {
    total,
    stateCount: stateCount.length,
    orgTypeCount: orgTypeCount.length,
    topStates: stateGroups.map((g) => ({
      state: g.normalizedState,
      count: g._count,
    })),
    topOrgTypes: orgTypeGroups.map((g) => ({
      type: g.normalizedOrgType,
      count: g._count,
    })),
  };
}

// Run import
const filePath = process.argv[2] || path.join(__dirname, '../../uploads/providers.xlsx');

importProviders(filePath)
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });