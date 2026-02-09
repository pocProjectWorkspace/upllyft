// apps/api/prisma/seeds/import-crisis-resources-csv.ts
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Helper: Generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Helper: Clean phone number
function cleanPhoneNumber(phone: string | undefined): string | null {
  if (!phone || phone === 'N/A' || !phone.trim()) return null;
  return phone.replace(/[\s\-\(\)]/g, '').replace(/[^\d+]/g, '');
}

// Helper: Parse array field from CSV
function parseArrayField(field: string | undefined): string[] {
  if (!field || field === 'N/A') return [];
  return field.split(',').map(item => item.trim()).filter(item => item.length > 0);
}

// Map CSV Type to resource type
function mapToResourceType(typeStr: string): string {
  const typeMap: Record<string, string> = {
    'National Helpline': 'HELPLINE',
    'NGO': 'HELPLINE',
    'Emergency Service': 'HELPLINE',
    'LGBTQ+ Support': 'IN_PERSON',
    'Psychosocial Helpline': 'HELPLINE',
    'Hospital Psychiatric Emergency': 'IN_PERSON',
    'ADHD Support': 'IN_PERSON',
    'Parent Support Group': 'CHAT',
  };
  return typeMap[typeStr] || 'HELPLINE';
}

// Map to crisis types
function mapToCrisisTypes(typeStr: string, specializationStr: string): string[] {
  const types: string[] = [];
  
  const typeMap: Record<string, string[]> = {
    'National Helpline': ['MENTAL_HEALTH', 'SUICIDE_PREVENTION'],
    'NGO': ['MENTAL_HEALTH'],
    'Emergency Service': ['MEDICAL_EMERGENCY'],
    'LGBTQ+ Support': ['LGBTQ_SUPPORT'],
    'Psychosocial Helpline': ['GENERAL_COUNSELING'],
    'Hospital Psychiatric Emergency': ['MEDICAL_EMERGENCY'],
    'ADHD Support': ['ADHD_SUPPORT'],
    'Parent Support Group': ['PARENT_SUPPORT'],
  };

  if (typeMap[typeStr]) {
    types.push(...typeMap[typeStr]);
  }

  const spec = specializationStr?.toLowerCase() || '';
  if (spec.includes('suicide')) {
    if (!types.includes('SUICIDE_PREVENTION')) types.push('SUICIDE_PREVENTION');
    if (!types.includes('SUICIDE_RISK')) types.push('SUICIDE_RISK');
  }
  if (spec.includes('autism') && !types.includes('AUTISM_SUPPORT')) types.push('AUTISM_SUPPORT');
  if (spec.includes('adhd') && !types.includes('ADHD_SUPPORT')) types.push('ADHD_SUPPORT');
  if (spec.includes('child') && !types.includes('CHILD_CRISIS')) types.push('CHILD_CRISIS');
  if ((spec.includes('women') || spec.includes('domestic abuse')) && !types.includes('WOMEN_CRISIS')) {
    types.push('WOMEN_CRISIS');
  }
  if (spec.includes('poison') && !types.includes('POISON_CONTROL')) types.push('POISON_CONTROL');
  if (spec.includes('lgbtq') && !types.includes('LGBTQ_SUPPORT')) types.push('LGBTQ_SUPPORT');
  if (spec.includes('parent') && !types.includes('PARENT_SUPPORT')) types.push('PARENT_SUPPORT');
  if (spec.includes('panic') && !types.includes('PANIC_ATTACK')) types.push('PANIC_ATTACK');
  if (spec.includes('meltdown') && !types.includes('MELTDOWN')) types.push('MELTDOWN');
  if ((spec.includes('self-harm') || spec.includes('self harm')) && !types.includes('SELF_HARM')) {
    types.push('SELF_HARM');
  }
  if (spec.includes('burnout') && !types.includes('BURNOUT')) types.push('BURNOUT');
  if (spec.includes('family conflict') && !types.includes('FAMILY_CONFLICT')) {
    types.push('FAMILY_CONFLICT');
  }

  if (types.length === 0) {
    types.push('GENERAL_COUNSELING');
  }

  return Array.from(new Set(types));
}

// Simple CSV parser
function parseCSV(content: string): any[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split('\t').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return rows;
}

async function importFromCSV() {
  const csvPath = path.join(__dirname, '../data/crisis-resources.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found at: ${csvPath}`);
    console.log(`   Looking in: ${path.resolve(csvPath)}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(csvContent);

  console.log(`📊 Found ${rows.length} resources in CSV\n`);

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  const errors: { name: string; error: string }[] = [];

  for (const row of rows) {
    try {
      const id = generateSlug(row.Name);
      const phoneNumber = cleanPhoneNumber(row.Phone);

      if (!phoneNumber) {
        console.warn(`⚠️  Skipping ${row.Name}: No valid phone number`);
        skippedCount++;
        continue;
      }

      const languages = parseArrayField(row.Languages);
      const specialization = parseArrayField(row.Specialization);
      const ageGroups = parseArrayField(row.Age_Groups);
      const crisisTypes = mapToCrisisTypes(row.Type, row.Specialization);

      let verifiedDate: Date | null = null;
      if (row.Verified_Date && row.Verified_Date !== 'N/A') {
        try {
          const parts = row.Verified_Date.split('-');
          if (parts.length === 3) {
            verifiedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          } else {
            verifiedDate = new Date(row.Verified_Date);
          }
        } catch {
          verifiedDate = new Date();
        }
      }

      const resource = {
        id,
        name: row.Name,
        type: mapToResourceType(row.Type),
        category: crisisTypes as any, // Cast to CrisisType[] or use as any if types are not imported
        phoneNumber,
        whatsappNumber: row.WhatsApp !== 'No' && row.WhatsApp !== 'N/A' 
          ? cleanPhoneNumber(row.WhatsApp) 
          : null,
        email: row.Email && row.Email !== 'N/A' ? row.Email.trim() : null,
        website: row.Website && row.Website !== 'N/A' ? row.Website.trim() : null,
        state: row.State || 'All',
        city: row.City || 'All',
        available24x7: row['24x7'] === 'Yes',
        operatingHours: row.Operating_Hours && row.Operating_Hours !== 'N/A' && row.Operating_Hours !== '24x7' 
          ? row.Operating_Hours 
          : null,
        languages: languages.length > 0 ? languages : ['en'],
        specialization: specialization.length > 0 ? specialization : ['General Support'],
        ageGroups: ageGroups.length > 0 ? ageGroups : ['All'],
        priority: row.State === 'All' ? 1 : 10,
        isVerified: true,
        verifiedAt: verifiedDate || new Date(),
        description: row.Notes && row.Notes !== 'N/A' ? row.Notes.trim() : null,
        isActive: true,
        usageCount: 0,
        avgRating: null,
        country: 'IN',
        pincode: null,
        address: null,
      };

      await prisma.crisisResource.upsert({
        where: { id },
        update: resource,
        create: resource,
      });

      successCount++;
      console.log(`✅ ${successCount}. Imported: ${resource.name} (${crisisTypes.slice(0, 2).join(', ')}${crisisTypes.length > 2 ? '...' : ''})`);
    } catch (error: any) {
      errorCount++;
      errors.push({ name: row.Name, error: error.message });
      console.error(`❌ Error importing ${row.Name}:`, error.message);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📈 Import Summary:`);
  console.log(`   ✅ Successfully imported: ${successCount}`);
  console.log(`   ⚠️  Skipped (no phone): ${skippedCount}`);
  console.log(`   ❌ Failed to import: ${errorCount}`);
  console.log(`${'='.repeat(60)}`);

  if (errors.length > 0) {
    console.log(`\n❌ Errors:`);
    errors.forEach(({ name, error }) => {
      console.log(`   • ${name}: ${error}`);
    });
  }
}

async function main() {
  console.log('📥 Starting CSV import for Crisis Resources...\n');
  
  try {
    await importFromCSV();
    
    const totalCount = await prisma.crisisResource.count();
    console.log(`\n✅ Total resources in database: ${totalCount}`);
    
  } catch (error: any) {
    console.error('❌ Import process failed:', error.message);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });