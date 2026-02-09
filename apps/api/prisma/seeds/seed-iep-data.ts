import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GOAL_BANK_ITEMS = [
  // Communication / Speech-Language
  { domain: 'communication', goalText: 'Will use 2-3 word phrases to make requests in 4 out of 5 opportunities across 3 consecutive sessions.' },
  { domain: 'communication', goalText: 'Will follow 2-step verbal directions without visual cues with 80% accuracy.' },
  { domain: 'communication', goalText: 'Will initiate and maintain 3 conversational exchanges on a topic with minimal prompting.' },
  { domain: 'communication', goalText: 'Will use age-appropriate grammar in spontaneous speech in 70% of utterances.' },
  { domain: 'communication', goalText: 'Will produce target speech sounds in conversational speech with 80% accuracy.' },
  { domain: 'communication', condition: 'autism', goalText: 'Will use an AAC device to make 5 different requests independently across settings.' },

  // Motor - Fine
  { domain: 'fine-motor', goalText: 'Will demonstrate age-appropriate pencil grasp during writing tasks for 10 minutes.' },
  { domain: 'fine-motor', goalText: 'Will cut along a curved line with scissors within 1/4 inch accuracy.' },
  { domain: 'fine-motor', goalText: 'Will independently button and zip clothing items within 2 minutes.' },
  { domain: 'fine-motor', goalText: 'Will copy geometric shapes (circle, square, triangle, cross) with recognizable accuracy.' },
  { domain: 'fine-motor', goalText: 'Will string 10 small beads independently within 5 minutes.' },

  // Motor - Gross
  { domain: 'gross-motor', goalText: 'Will independently navigate playground equipment appropriate for age with safe body awareness.' },
  { domain: 'gross-motor', goalText: 'Will catch a ball thrown from 5 feet away in 4 out of 5 attempts.' },
  { domain: 'gross-motor', goalText: 'Will hop on one foot for 10 consecutive hops maintaining balance.' },
  { domain: 'gross-motor', goalText: 'Will ride a bicycle with training wheels for 50 feet maintaining direction.' },

  // Social-Emotional
  { domain: 'social-emotional', goalText: 'Will identify and label 4 basic emotions (happy, sad, angry, scared) in self and others.' },
  { domain: 'social-emotional', goalText: 'Will engage in cooperative play with a peer for 15 minutes with no more than 1 prompt.' },
  { domain: 'social-emotional', goalText: 'Will use a calming strategy independently when frustrated in 3 out of 4 opportunities.' },
  { domain: 'social-emotional', goalText: 'Will take turns in a structured game with 1 peer for 10 minutes without adult prompting.' },
  { domain: 'social-emotional', condition: 'autism', goalText: 'Will respond to peer greetings and initiations within 5 seconds in 80% of opportunities.' },

  // Cognitive / Academic
  { domain: 'cognitive', goalText: 'Will sort objects by 2 attributes (color and shape) with 90% accuracy.' },
  { domain: 'cognitive', goalText: 'Will complete a 3-step sequencing task independently in 4 out of 5 trials.' },
  { domain: 'cognitive', goalText: 'Will demonstrate understanding of basic concepts (big/small, in/out, top/bottom) with 80% accuracy.' },
  { domain: 'cognitive', goalText: 'Will attend to a structured tabletop activity for 10 minutes with no more than 2 redirections.' },

  // Self-Care / Adaptive
  { domain: 'self-care', goalText: 'Will independently wash hands following a visual schedule with all steps completed.' },
  { domain: 'self-care', goalText: 'Will use utensils to eat a meal with minimal spillage for the duration of the meal.' },
  { domain: 'self-care', goalText: 'Will independently complete toileting routine including clothing management.' },
  { domain: 'self-care', goalText: 'Will dress independently including managing fasteners within 10 minutes.' },

  // Sensory Processing
  { domain: 'sensory', goalText: 'Will tolerate 5 different textures during play activities without avoidance behaviors.' },
  { domain: 'sensory', goalText: 'Will maintain a calm-alert state during 20-minute classroom activities using sensory strategies.' },
  { domain: 'sensory', goalText: 'Will transition between activities with no more than 1 verbal cue and sensory support.' },
  { domain: 'sensory', condition: 'autism', goalText: 'Will use a sensory diet schedule independently to self-regulate throughout the school day.' },
];

const IEP_TEMPLATES = [
  {
    name: 'Standard Pediatric OT IEP',
    description: 'Comprehensive occupational therapy IEP template covering fine motor, gross motor, sensory, and self-care domains.',
    content: {
      domains: ['fine-motor', 'gross-motor', 'sensory', 'self-care'],
      sections: [
        { name: 'Present Levels', description: 'Current functional performance in each domain' },
        { name: 'Annual Goals', description: 'Measurable goals by domain' },
        { name: 'Short-Term Objectives', description: 'Quarterly benchmarks' },
        { name: 'Accommodations', description: 'Environmental and instructional accommodations' },
        { name: 'Service Delivery', description: 'Frequency, duration, and setting' },
      ],
      defaultAccommodations: [
        'Preferential seating',
        'Fidget tools available',
        'Extended time for fine motor tasks',
        'Visual schedule',
        'Sensory breaks as needed',
      ],
    },
  },
  {
    name: 'Speech-Language Therapy IEP',
    description: 'Template for speech-language pathology goals covering articulation, language, fluency, and social communication.',
    content: {
      domains: ['communication', 'social-emotional'],
      sections: [
        { name: 'Present Levels', description: 'Current communication abilities and challenges' },
        { name: 'Annual Goals', description: 'Measurable speech-language goals' },
        { name: 'Short-Term Objectives', description: 'Monthly/quarterly benchmarks' },
        { name: 'Accommodations', description: 'Communication supports' },
        { name: 'Service Delivery', description: 'Individual and group therapy schedule' },
      ],
      defaultAccommodations: [
        'Visual supports for instructions',
        'Extra processing time for verbal responses',
        'AAC device access',
        'Reduced background noise during testing',
      ],
    },
  },
  {
    name: 'ABA/Behavioral IEP',
    description: 'Applied behavior analysis focused IEP for children with autism spectrum disorder.',
    content: {
      domains: ['social-emotional', 'communication', 'cognitive', 'self-care'],
      sections: [
        { name: 'Present Levels', description: 'Behavioral baseline and functional assessment' },
        { name: 'Behavior Support Plan', description: 'Antecedent strategies, teaching procedures, consequence strategies' },
        { name: 'Skill Acquisition Goals', description: 'Target skills by domain' },
        { name: 'Behavior Reduction Goals', description: 'Challenging behaviors to address' },
        { name: 'Generalization Plan', description: 'Cross-setting and maintenance goals' },
      ],
      defaultAccommodations: [
        'Token economy reinforcement system',
        'Visual schedule with first-then board',
        'Structured environment with clear boundaries',
        'Social stories for transitions',
        'Choice board for activities',
      ],
    },
  },
  {
    name: 'Multi-Disciplinary IEP',
    description: 'Comprehensive template for cases involving OT, SLP, and behavioral therapy.',
    content: {
      domains: ['communication', 'fine-motor', 'gross-motor', 'sensory', 'social-emotional', 'cognitive', 'self-care'],
      sections: [
        { name: 'Present Levels', description: 'Multi-domain functional assessment' },
        { name: 'Annual Goals by Discipline', description: 'Goals organized by therapy discipline' },
        { name: 'Integrated Goals', description: 'Cross-disciplinary collaborative goals' },
        { name: 'Accommodations', description: 'Combined accommodation list' },
        { name: 'Service Coordination', description: 'Schedule and coordination plan across providers' },
        { name: 'Transition Plan', description: 'For school-age children transitioning between settings' },
      ],
      defaultAccommodations: [
        'Sensory breaks as needed',
        'Visual supports across settings',
        'Modified workload expectations',
        'Assistive technology access',
        'Peer buddy system',
        'Home-school communication log',
      ],
    },
  },
];

async function main() {
  console.log('Seeding IEP templates and goal bank...');

  // We need a system user to be the creator. Use the first admin.
  let systemUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!systemUser) {
    // Fallback: use the first user
    systemUser = await prisma.user.findFirst();
  }
  if (!systemUser) {
    console.log('No users found. Skipping seed.');
    return;
  }

  // Seed goal bank items
  let goalCount = 0;
  for (const item of GOAL_BANK_ITEMS) {
    const existing = await prisma.goalBankItem.findFirst({
      where: { goalText: item.goalText, isGlobal: true },
    });
    if (!existing) {
      await prisma.goalBankItem.create({
        data: {
          ...item,
          isGlobal: true,
          createdById: systemUser.id,
        },
      });
      goalCount++;
    }
  }
  console.log(`Created ${goalCount} goal bank items.`);

  // Seed IEP templates
  let templateCount = 0;
  for (const template of IEP_TEMPLATES) {
    const existing = await prisma.iEPTemplate.findFirst({
      where: { name: template.name, isGlobal: true },
    });
    if (!existing) {
      await prisma.iEPTemplate.create({
        data: {
          ...template,
          isGlobal: true,
          createdById: systemUser.id,
        },
      });
      templateCount++;
    }
  }
  console.log(`Created ${templateCount} IEP templates.`);

  console.log('IEP seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
