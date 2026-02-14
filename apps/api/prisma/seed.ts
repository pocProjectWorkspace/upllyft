// prisma/seeds/comprehensive-seed.ts
import { PrismaClient, Role, PostType, VerificationStatus, ModerationStatus, CommunityRole, MemberStatus, EventCategory, EventFormat, EventStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// ========================================
// HELPER FUNCTIONS
// ========================================

function randomDate(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date;
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, arr.length));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ========================================
// SECTION 1: USERS DATA
// ========================================

const USERS_DATA = {
  // Admin
  admin: {
    email: 'admin@upllyft.com',
    name: 'Admin User',
    password: 'Admin@123',
    role: Role.ADMIN,
    bio: 'Platform administrator managing Haven community. Passionate about making mental health support accessible to all.',
    location: 'Mumbai, Maharashtra',
    city: 'Mumbai',
    state: 'Maharashtra',
    verificationStatus: VerificationStatus.VERIFIED,
  },

  // Moderators
  moderators: [
    {
      email: 'mod1@upllyft.com',
      name: 'Priya Sharma',
      password: 'Mod@123',
      role: Role.MODERATOR,
      bio: 'Community moderator with 8 years experience in special education. Mother of two children with special needs.',
      location: 'Bangalore, Karnataka',
      city: 'Bangalore',
      state: 'Karnataka',
      verificationStatus: VerificationStatus.VERIFIED,
    },
    {
      email: 'mod2@upllyft.com',
      name: 'Rajesh Kumar',
      password: 'Mod@123',
      role: Role.MODERATOR,
      bio: 'Clinical psychologist and community moderator. Specializing in developmental disorders and family therapy.',
      location: 'Delhi, Delhi',
      city: 'Delhi',
      state: 'Delhi',
      verificationStatus: VerificationStatus.VERIFIED,
    },
  ],

  // Therapists
  therapists: [
    {
      email: 'dr.meena@therapy.com',
      name: 'Dr. Meena Patel',
      password: 'Therapist@123',
      role: Role.THERAPIST,
      bio: 'Clinical psychologist specializing in autism spectrum disorders. 15+ years experience in behavioral therapy.',
      specialization: ['Autism', 'Behavioral Therapy', 'ABA'],
      yearsOfExperience: 15,
      organization: 'Child Development Center',
      licenseNumber: 'PSY-MH-2024-1234',
      location: 'Pune, Maharashtra',
      city: 'Pune',
      state: 'Maharashtra',
      verificationStatus: VerificationStatus.VERIFIED,
    },
    {
      email: 'dr.singh@therapy.com',
      name: 'Dr. Arjun Singh',
      password: 'Therapist@123',
      role: Role.THERAPIST,
      bio: 'Speech and language pathologist. Expert in augmentative communication and language development.',
      specialization: ['Speech Therapy', 'Language Development', 'AAC'],
      yearsOfExperience: 10,
      organization: 'Speech Plus Clinic',
      licenseNumber: 'SLP-KA-2024-5678',
      location: 'Bangalore, Karnataka',
      city: 'Bangalore',
      state: 'Karnataka',
      verificationStatus: VerificationStatus.VERIFIED,
    },
    {
      email: 'dr.reddy@therapy.com',
      name: 'Dr. Lakshmi Reddy',
      password: 'Therapist@123',
      role: Role.THERAPIST,
      bio: 'Occupational therapist specializing in sensory integration and motor skills development.',
      specialization: ['Occupational Therapy', 'Sensory Integration', 'Motor Skills'],
      yearsOfExperience: 12,
      organization: 'Sensory Care Institute',
      licenseNumber: 'OT-TN-2024-9012',
      location: 'Chennai, Tamil Nadu',
      city: 'Chennai',
      state: 'Tamil Nadu',
      verificationStatus: VerificationStatus.VERIFIED,
    },
    {
      email: 'dr.verma@therapy.com',
      name: 'Dr. Neha Verma',
      password: 'Therapist@123',
      role: Role.THERAPIST,
      bio: 'Child psychologist focusing on ADHD and learning disabilities. Certified in play therapy.',
      specialization: ['ADHD', 'Learning Disabilities', 'Play Therapy'],
      yearsOfExperience: 8,
      organization: 'MindCare Clinic',
      licenseNumber: 'PSY-DL-2024-3456',
      location: 'Delhi, Delhi',
      city: 'Delhi',
      state: 'Delhi',
      verificationStatus: VerificationStatus.VERIFIED,
    },
    {
      email: 'dr.nair@therapy.com',
      name: 'Dr. Arun Nair',
      password: 'Therapist@123',
      role: Role.THERAPIST,
      bio: 'Behavioral therapist and ABA specialist. Working with children with autism for over a decade.',
      specialization: ['ABA', 'Autism', 'Behavioral Intervention'],
      yearsOfExperience: 11,
      organization: 'Behavior Plus Center',
      licenseNumber: 'BCaBA-KL-2024-7890',
      location: 'Kochi, Kerala',
      city: 'Kochi',
      state: 'Kerala',
      verificationStatus: VerificationStatus.VERIFIED,
    },
  ],

  // Educators
  educators: [
    {
      email: 'teacher.anjali@school.com',
      name: 'Anjali Desai',
      password: 'Educator@123',
      role: Role.EDUCATOR,
      bio: 'Special education teacher with focus on inclusive classroom practices. 12 years in mainstream schools.',
      specialization: ['Special Education', 'Inclusive Practices'],
      yearsOfExperience: 12,
      organization: 'Sunshine International School',
      location: 'Mumbai, Maharashtra',
      city: 'Mumbai',
      state: 'Maharashtra',
      verificationStatus: VerificationStatus.VERIFIED,
    },
    {
      email: 'teacher.pradeep@school.com',
      name: 'Pradeep Iyer',
      password: 'Educator@123',
      role: Role.EDUCATOR,
      bio: 'Learning support coordinator. Experienced in creating IEPs and adaptive learning strategies.',
      specialization: ['Learning Support', 'IEP Development'],
      yearsOfExperience: 9,
      organization: 'The Valley School',
      location: 'Bangalore, Karnataka',
      city: 'Bangalore',
      state: 'Karnataka',
      verificationStatus: VerificationStatus.VERIFIED,
    },
    {
      email: 'teacher.kavita@school.com',
      name: 'Kavita Rao',
      password: 'Educator@123',
      role: Role.EDUCATOR,
      bio: 'Early intervention specialist. Working with children aged 2-6 with developmental delays.',
      specialization: ['Early Intervention', 'Developmental Delays'],
      yearsOfExperience: 7,
      organization: 'Little Steps Center',
      location: 'Hyderabad, Telangana',
      city: 'Hyderabad',
      state: 'Telangana',
      verificationStatus: VerificationStatus.VERIFIED,
    },
  ],

  // Organizations
  organizations: [
    {
      email: 'contact@autismindia.org',
      name: 'Autism India Foundation',
      password: 'Org@123',
      role: Role.ORGANIZATION,
      bio: 'Non-profit organization providing support, resources, and advocacy for families affected by autism.',
      organization: 'Autism India Foundation',
      location: 'Bangalore, Karnataka',
      city: 'Bangalore',
      state: 'Karnataka',
      verificationStatus: VerificationStatus.VERIFIED,
    },
    {
      email: 'info@downsyndromecare.org',
      name: 'Down Syndrome Care Society',
      password: 'Org@123',
      role: Role.ORGANIZATION,
      bio: 'Supporting families and individuals with Down syndrome through education, therapy, and community programs.',
      organization: 'Down Syndrome Care Society',
      location: 'Delhi, Delhi',
      city: 'Delhi',
      state: 'Delhi',
      verificationStatus: VerificationStatus.VERIFIED,
    },
    {
      email: 'hello@specialneedsindia.org',
      name: 'Special Needs India Network',
      password: 'Org@123',
      role: Role.ORGANIZATION,
      bio: 'Pan-India network connecting families, professionals, and organizations in the special needs community.',
      organization: 'Special Needs India Network',
      location: 'Mumbai, Maharashtra',
      city: 'Mumbai',
      state: 'Maharashtra',
      verificationStatus: VerificationStatus.VERIFIED,
    },
  ],

  // Parents/Caregivers
  parents: [
    {
      email: 'parent.anita@gmail.com',
      name: 'Anita Gupta',
      password: 'Parent@123',
      role: Role.USER,
      bio: 'Mother of a 5-year-old with autism. Sharing our journey and learning from others.',
      location: 'Mumbai, Maharashtra',
      city: 'Mumbai',
      state: 'Maharashtra',
      verificationStatus: VerificationStatus.VERIFIED,
    },
    {
      email: 'parent.vikram@gmail.com',
      name: 'Vikram Mehta',
      password: 'Parent@123',
      role: Role.USER,
      bio: 'Father of twins with ADHD. Advocate for inclusive education and parent support groups.',
      location: 'Bangalore, Karnataka',
      city: 'Bangalore',
      state: 'Karnataka',
      verificationStatus: VerificationStatus.VERIFIED,
    },
    {
      email: 'parent.deepa@gmail.com',
      name: 'Deepa Krishnan',
      password: 'Parent@123',
      role: Role.USER,
      bio: 'Parent of a child with cerebral palsy. Passionate about assistive technology and accessibility.',
      location: 'Chennai, Tamil Nadu',
      city: 'Chennai',
      state: 'Tamil Nadu',
      verificationStatus: VerificationStatus.VERIFIED,
    },
    {
      email: 'parent.rohit@gmail.com',
      name: 'Rohit Saxena',
      password: 'Parent@123',
      role: Role.USER,
      bio: 'Single father navigating special needs parenting. Focus on daily living skills and independence.',
      location: 'Delhi, Delhi',
      city: 'Delhi',
      state: 'Delhi',
      verificationStatus: VerificationStatus.VERIFIED,
    },
    {
      email: 'parent.sneha@gmail.com',
      name: 'Sneha Malhotra',
      password: 'Parent@123',
      role: Role.USER,
      bio: 'Mom to a non-verbal child with autism. Exploring AAC devices and alternative communication.',
      location: 'Pune, Maharashtra',
      city: 'Pune',
      state: 'Maharashtra',
      verificationStatus: VerificationStatus.VERIFIED,
    },
    {
      email: 'parent.suresh@gmail.com',
      name: 'Suresh Pillai',
      password: 'Parent@123',
      role: Role.USER,
      bio: 'Parent of a teenager with Down syndrome. Focused on transition planning and vocational training.',
      location: 'Kochi, Kerala',
      city: 'Kochi',
      state: 'Kerala',
      verificationStatus: VerificationStatus.VERIFIED,
    },
    {
      email: 'parent.maya@gmail.com',
      name: 'Maya Chatterjee',
      password: 'Parent@123',
      role: Role.USER,
      bio: 'Working mother managing therapy schedules and school IEPs. Seeking work-life balance tips.',
      location: 'Kolkata, West Bengal',
      city: 'Kolkata',
      state: 'West Bengal',
      verificationStatus: VerificationStatus.VERIFIED,
    },
    {
      email: 'parent.anil@gmail.com',
      name: 'Anil Joshi',
      password: 'Parent@123',
      role: Role.USER,
      bio: 'Father of a child with sensory processing disorder. Learning about sensory diets and regulation.',
      location: 'Jaipur, Rajasthan',
      city: 'Jaipur',
      state: 'Rajasthan',
      verificationStatus: VerificationStatus.VERIFIED,
    },
    {
      email: 'parent.pooja@gmail.com',
      name: 'Pooja Kapoor',
      password: 'Parent@123',
      role: Role.USER,
      bio: 'Mother of 3, including one with ADHD. Balancing multiple kids needs and finding support.',
      location: 'Chandigarh, Punjab',
      city: 'Chandigarh',
      state: 'Punjab',
      verificationStatus: VerificationStatus.VERIFIED,
    },
    {
      email: 'parent.rahul@gmail.com',
      name: 'Rahul Deshmukh',
      password: 'Parent@123',
      role: Role.USER,
      bio: 'Dad to a child with learning disabilities. Advocate for dyslexia awareness and early screening.',
      location: 'Nagpur, Maharashtra',
      city: 'Nagpur',
      state: 'Maharashtra',
      verificationStatus: VerificationStatus.VERIFIED,
    },
  ],
};

// ========================================
// SECTION 2: COMMUNITIES DATA
// ========================================

const COMMUNITIES_DATA = [
  // Condition-based communities
  {
    name: 'Autism Spectrum Support',
    slug: 'autism-support',
    description: 'A safe space for parents, caregivers, and professionals working with individuals on the autism spectrum. Share experiences, strategies, and support.',
    rules: 'Be respectful, share evidence-based information, maintain confidentiality, no promotion of harmful practices.',
    type: 'Condition Support',
    condition: 'Autism',
    isPrivate: false,
    tags: ['autism', 'asd', 'neurodiversity', 'behavioral-therapy'],
    memberCount: 0, // Will be updated after adding members
  },
  {
    name: 'ADHD Warriors',
    slug: 'adhd-warriors',
    description: 'Supporting families navigating ADHD. Discuss medication, behavioral strategies, school accommodations, and daily life hacks.',
    rules: 'Respectful discussions, no medical advice, share personal experiences, support each other.',
    type: 'Condition Support',
    condition: 'ADHD',
    isPrivate: false,
    tags: ['adhd', 'attention', 'hyperactivity', 'focus'],
    memberCount: 0,
  },
  {
    name: 'Down Syndrome Circle',
    slug: 'down-syndrome',
    description: 'Celebrating abilities and supporting families of individuals with Down syndrome. From early intervention to adult independence.',
    rules: 'Positive language, inclusive discussions, share resources, celebrate milestones.',
    type: 'Condition Support',
    condition: 'Down Syndrome',
    isPrivate: false,
    tags: ['down-syndrome', 'trisomy-21', 'development', 'inclusion'],
    memberCount: 0,
  },
  {
    name: 'Cerebral Palsy Support Network',
    slug: 'cerebral-palsy',
    description: 'Connecting families and caregivers of children with cerebral palsy. Discuss mobility, therapy, assistive devices, and quality of life.',
    rules: 'Share experiences, respect diversity, evidence-based information, support without judgment.',
    type: 'Condition Support',
    condition: 'Cerebral Palsy',
    isPrivate: false,
    tags: ['cerebral-palsy', 'cp', 'mobility', 'physical-therapy'],
    memberCount: 0,
  },
  {
    name: 'Learning Differences Hub',
    slug: 'learning-differences',
    description: 'For parents and educators working with children with dyslexia, dyscalculia, dysgraphia, and other learning differences.',
    rules: 'Share educational strategies, avoid labels, celebrate different learning styles, support academic success.',
    type: 'Condition Support',
    condition: 'Learning Disabilities',
    isPrivate: false,
    tags: ['dyslexia', 'dyscalculia', 'learning-disabilities', 'education'],
    memberCount: 0,
  },
  {
    name: 'Speech & Language Milestones',
    slug: 'speech-language',
    description: 'Supporting families with children facing speech and language delays. Share therapy activities, AAC resources, and progress.',
    rules: 'Encourage all forms of communication, share resources, celebrate progress, professional guidance welcome.',
    type: 'Condition Support',
    condition: 'Speech Delay',
    isPrivate: false,
    tags: ['speech-therapy', 'language-development', 'aac', 'communication'],
    memberCount: 0,
  },
  {
    name: 'Sensory Processing Community',
    slug: 'sensory-processing',
    description: 'Understanding and managing sensory processing challenges. Discuss sensory diets, regulation strategies, and environmental modifications.',
    rules: 'Share sensory-friendly tips, respect sensitivities, evidence-based approaches, support strategies.',
    type: 'Condition Support',
    condition: 'Sensory Processing Disorder',
    isPrivate: false,
    tags: ['sensory-processing', 'spd', 'sensory-integration', 'ot'],
    memberCount: 0,
  },

  // Role-based communities
  {
    name: 'Parents Circle',
    slug: 'parents-circle',
    description: 'A supportive community exclusively for parents and caregivers. Share challenges, victories, and daily life experiences.',
    rules: 'Parent voices matter, share honestly, support without judgment, maintain confidentiality.',
    type: 'Role-based',
    condition: null,
    isPrivate: false,
    tags: ['parents', 'caregivers', 'support', 'parenting'],
    memberCount: 0,
  },
  {
    name: 'Teachers & Educators Network',
    slug: 'educators-network',
    description: 'Professional community for teachers, special educators, and learning support staff. Share classroom strategies and resources.',
    rules: 'Professional discussions, share teaching strategies, respect student confidentiality, evidence-based practices.',
    type: 'Role-based',
    condition: null,
    isPrivate: false,
    tags: ['teachers', 'education', 'classroom', 'iep'],
    memberCount: 0,
  },
  {
    name: 'Therapists Professional Circle',
    slug: 'therapists-circle',
    description: 'Exclusive space for verified therapists to discuss cases, share techniques, and collaborate professionally.',
    rules: 'Professional ethics, maintain client confidentiality, evidence-based discussions, peer support.',
    type: 'Role-based',
    condition: null,
    isPrivate: true, // Private community
    tags: ['therapists', 'professionals', 'clinical', 'collaboration'],
    memberCount: 0,
  },

  // Topic-based communities
  {
    name: 'Early Intervention Network',
    slug: 'early-intervention',
    description: 'Focus on early identification and intervention for developmental delays. For parents and professionals working with children 0-6 years.',
    rules: 'Evidence-based early intervention, share screening tools, celebrate early milestones, professional guidance.',
    type: 'Topic-based',
    condition: null,
    isPrivate: false,
    tags: ['early-intervention', 'development', 'milestones', 'screening'],
    memberCount: 0,
  },
  {
    name: 'Inclusive Education Advocates',
    slug: 'inclusive-education',
    description: 'Promoting and supporting inclusive education practices. Share success stories, challenges, and advocacy strategies.',
    rules: 'Promote inclusion, share school experiences, advocate respectfully, support mainstream education.',
    type: 'Topic-based',
    condition: null,
    isPrivate: false,
    tags: ['inclusion', 'mainstream', 'iep', 'school'],
    memberCount: 0,
  },
  {
    name: 'Assistive Technology Hub',
    slug: 'assistive-tech',
    description: 'Exploring assistive devices, AAC apps, accessibility tools, and technology solutions for special needs.',
    rules: 'Share tech reviews, discuss accessibility, practical solutions, budget-friendly options.',
    type: 'Topic-based',
    condition: null,
    isPrivate: false,
    tags: ['assistive-technology', 'aac', 'apps', 'devices'],
    memberCount: 0,
  },
  {
    name: 'Behavior Management Strategies',
    slug: 'behavior-management',
    description: 'Practical strategies for managing challenging behaviors. Positive behavior support and functional approaches.',
    rules: 'Positive approaches only, share what works, no harmful practices, professional insights welcome.',
    type: 'Topic-based',
    condition: null,
    isPrivate: false,
    tags: ['behavior', 'strategies', 'positive-support', 'aba'],
    memberCount: 0,
  },
];

// ========================================
// SECTION 3: POSTS DATA (Realistic Content)
// ========================================

const POSTS_DATA = [
  // QUESTIONS
  {
    title: 'When should I start speech therapy for my 2-year-old?',
    content: `My daughter just turned 2 and she's only saying about 10 words. Our pediatrician said to wait until she's 2.5, but I'm worried we should start speech therapy earlier.

She understands everything we say and follows instructions well. She points to what she wants and uses some gestures. But I see other kids her age speaking in sentences and I'm getting anxious.

Has anyone been in a similar situation? When did you start speech therapy? Did early intervention make a difference?`,
    type: PostType.QUESTION,
    category: 'Speech & Language',
    tags: ['speech-delay', 'early-intervention', 'toddler', 'speech-therapy'],
    community: 'speech-language',
  },
  {
    title: 'Help needed: IEP meeting next week - what should I prepare?',
    content: `We have our first IEP meeting next Tuesday for my 6-year-old son with autism. The school called it and I have no idea what to expect or how to prepare.

What documents should I bring? Should I bring my husband or is it okay to go alone? Can I record the meeting? What questions should I ask?

I'm so nervous about this. I don't want to mess it up and I want to make sure my son gets the support he needs. Any advice would be greatly appreciated!`,
    type: PostType.QUESTION,
    category: 'Education',
    tags: ['iep', 'school', 'autism', 'advocacy'],
    community: 'autism-support',
  },
  {
    title: 'Affordable OT centers in Bangalore?',
    content: `Looking for recommendations for occupational therapy centers in Bangalore that won't break the bank. We're currently paying ₹2500 per session which is getting really expensive.

My son (4 years, sensory processing issues) needs OT twice a week. Are there any clinics that offer sliding scale fees or group sessions? 

Also open to home-based therapy if anyone knows good OTs who do home visits. Please share your experiences!`,
    type: PostType.QUESTION,
    category: 'Resources',
    tags: ['occupational-therapy', 'bangalore', 'budget', 'recommendations'],
    community: 'sensory-processing',
  },

  // DISCUSSIONS
  {
    title: 'Let\'s talk about the pressure to "fix" our kids',
    content: `I've been thinking a lot about this lately. As a parent of a child with autism, I feel constant pressure from family, friends, and even strangers to "fix" or "cure" my son.

Every day someone suggests a new therapy, diet, or miracle treatment. "Have you tried this?" "I heard about this cure..." It's exhausting.

I love my son exactly as he is. Yes, we do therapies to help him develop skills and navigate the world better. But he doesn't need to be "fixed."

Anyone else dealing with this? How do you handle it? How do you balance acceptance with helping your child develop new skills?`,
    type: PostType.DISCUSSION,
    category: 'Parenting',
    tags: ['acceptance', 'neurodiversity', 'parenting', 'autism'],
    community: 'parents-circle',
  },
  {
    title: 'Mainstream vs Special School - The eternal dilemma',
    content: `My daughter (7, Down syndrome) is currently in a special school and doing wonderfully. But I keep wondering if we should try mainstream with support.

Arguments for mainstream:
- Real-world social skills
- Higher expectations might push her more
- Inclusion and acceptance

Arguments for special school:
- She's happy and confident there
- Individual attention
- Peer group at similar developmental levels
- Less sensory overload

She's academically at a 4-year level, but her social skills are good. I don't want to disrupt something that's working, but I also don't want to limit her potential.

What factors helped you decide? Anyone transitioned between the two?`,
    type: PostType.DISCUSSION,
    category: 'Education',
    tags: ['mainstream', 'special-school', 'inclusion', 'down-syndrome'],
    community: 'inclusive-education',
  },

  // CASE STUDIES
  {
    title: 'Case Study: 6 months of ABA therapy - our detailed journey',
    content: `I wanted to share our experience with ABA therapy over the past 6 months. My son Aarav (5 years, autism, non-verbal) started intensive ABA in January.

**Initial Assessment:**
- No functional communication
- Severe self-injurious behaviors (head-banging)
- No eye contact
- Couldn't sit for more than 30 seconds
- Extreme sensory sensitivities

**Intervention (25 hours/week):**
- Discrete Trial Training for basic skills
- PECS for communication
- Sensory integration activities
- Functional behavior analysis

**6-Month Progress:**
- Using 40+ PECS symbols independently
- Eye contact improved significantly
- Can sit and attend for 10-15 minutes
- Self-injurious behaviors reduced by 80%
- Starting to imitate sounds

**Challenges:**
- Very expensive (₹80,000/month)
- Difficult to maintain consistency at home
- Some behaviors increased initially (extinction burst)
- Family didn't understand the approach

**What Worked:**
- Consistency across all environments
- Parent training sessions
- Data tracking to see progress
- Celebrating small wins

Happy to answer questions! This has been life-changing for us.`,
    type: PostType.CASE_STUDY,
    category: 'Therapy Success',
    tags: ['aba', 'autism', 'case-study', 'progress'],
    community: 'autism-support',
  },

  // EXPERIENCES
  {
    title: 'My son spoke his first word today at age 5 - I\'m crying',
    content: `I need to share this somewhere because I'm literally shaking and crying right now.

My son has been non-verbal since birth. He's 5 years old. We've done speech therapy, OT, ABA, everything. We learned sign language, got him an AAC device, accepted that he might never speak.

This morning, he looked at me and clearly said "Mama."

Not a sound. Not an approximation. A clear, purposeful "Mama" while looking right at me.

I don't even know how to process this. Five years of wondering if I'd ever hear him call me. Five years of other people's kids saying "mama" at 10 months. Five years of wondering if he'd ever be able to tell me if something hurt or if he was happy or sad.

And today he said "Mama."

To everyone still waiting for that first word - don't give up hope. I know everyone says "every child is different" and "it'll happen when it happens" and I hated hearing that. But it's true.

I'm just... I'm so happy I can't even think straight. ❤️`,
    type: PostType.DISCUSSION,
    category: 'Milestones',
    tags: ['first-word', 'speech', 'milestone', 'celebration'],
    community: 'speech-language',
  },

  // RESOURCES
  {
    title: 'Comprehensive guide to disability certificates in India',
    content: `After navigating this process myself, I wanted to create a detailed guide for others.

**What is a Disability Certificate?**
A Disability Certificate (also called UDID card) is official proof of disability issued by the government. It provides access to various benefits and reservations.

**Benefits:**
- 3% reservation in government jobs
- Income tax benefits (₹75,000 deduction)
- Railway concessions (75% for attendant)
- Priority in schemes and programs
- Education reservations

**How to Apply:**
1. Download form from your state's social welfare website
2. Get certificates from pediatrician + specialist (e.g., psychiatrist for autism)
3. Submit at District Medical Board
4. Attend board evaluation
5. Certificate issued if >40% disability

**Documents Needed:**
- Aadhaar card
- Address proof  
- Birth certificate
- Medical reports from specialists
- Recent passport photos

**Timeline:**
Usually takes 1-3 months from application to certificate

**State-specific resources:**
- Maharashtra: mahadbt.gov.in
- Karnataka: kswdc.kar.nic.in
- Tamil Nadu: tnpwd.gov.in
- Delhi: socialjustice.delhi.gov.in

**Important Notes:**
- Certificate is valid for 5 years (permanent after 18)
- Must be renewed before expiry
- Different states have different formats
- Original medical reports must be submitted

**Common Conditions Covered:**
- Autism (>40% severity)
- Cerebral palsy
- Intellectual disability
- Multiple disabilities
- Speech and language disability

Feel free to ask questions - happy to help guide you through the process!`,
    type: PostType.RESOURCE,
    category: 'Legal & Rights',
    tags: ['disability-certificate', 'udid', 'benefits', 'india', 'guide'],
    community: null, // General feed
  },
];

// MORE POSTS - Adding variety
const MORE_POSTS = [
  {
    title: 'Managing meltdowns in public places - strategies that work',
    content: `Public meltdowns are one of the hardest parts of parenting a child with autism. Here are strategies that have helped us:

**Prevention:**
1. Prepare child before going out (social stories, visuals)
2. Carry sensory kit (noise-canceling headphones, fidgets, weighted lap pad)
3. Plan exits and quiet spaces
4. Go during less crowded times
5. Start with short outings

**During Meltdown:**
1. Stay calm (your energy affects them)
2. Remove from triggering situation if possible
3. Don't try to reason or explain
4. Ensure safety first
5. Use minimal words
6. Offer sensory regulation tools

**After:**
1. Give time to recover (no lessons immediately after)
2. Note what triggered it
3. Don't apologize to strangers (educate if needed)
4. Take care of yourself too
5. Adjust plans if needed

**What Doesn't Help:**
- Punishments
- Reasoning during meltdown
- Forcing them to "behave"
- Getting angry or embarrassed

Remember: Meltdowns are not tantrums. They're neurological overwhelm. Our kids aren't giving us a hard time - they're having a hard time.`,
    type: PostType.DISCUSSION,
    category: 'Behavior',
    tags: ['meltdowns', 'autism', 'sensory', 'strategies', 'public'],
    community: 'autism-support',
  },
  {
    title: 'Best AAC apps for non-verbal children - comparison',
    content: `After trying many AAC apps, here's my honest comparison:

**Avaz (Indian app):**
- Pros: Indian context, multilingual (Hindi/English), affordable (₹5000 one-time)
- Cons: Less customizable than imports
- Best for: Indian families wanting local context

**Proloquo2Go:**
- Pros: Highly customizable, natural voice, offline
- Cons: Expensive ($280), US-centric vocabulary
- Best for: Those needing advanced features

**TouchChat:**
- Pros: Multiple vocabulary sets, easy to start
- Cons: Expensive ($150), subscription model for some features
- Best for: Growing communication needs

**Snap + Core First:**
- Pros: Free!, Motor planning based, research-backed
- Cons: Takes time to learn the system
- Best for: Budget-conscious families

**Our Experience:**
Started with Avaz (familiar context), then moved to Proloquo2Go as his needs grew. The investment was worth it - he's now using 200+ words!

**Tips:**
1. Don't skip low-tech (PECS) first
2. Get SLP guidance on which system
3. Consistency across home/school/therapy
4. Model using the device yourself
5. Give it TIME (months, not days)

Questions about any specific app?`,
    type: PostType.RESOURCE,
    category: 'Assistive Technology',
    tags: ['aac', 'apps', 'communication', 'non-verbal', 'review'],
    community: 'assistive-tech',
  },
  {
    title: 'School refused to give my child IEP - what are our rights?',
    content: `We requested an IEP evaluation for our son (7, ADHD) and the school flat-out refused. They said "he's managing fine" and "we don't have resources."

This is frustrating because:
- His grades are dropping
- Teachers complain about behavior
- He's anxious and struggling
- We have private psych evaluation showing ADHD

**Questions:**
1. Can schools legally refuse IEP evaluation?
2. What are our rights as parents?
3. How do we push back?
4. Should we get a lawyer involved?

Has anyone successfully fought this? We're in Karnataka if that matters.

UPDATE: I filed a formal written request. Apparently verbal requests don't count and schools can ignore them. Putting it in writing triggers a legal timeline for their response.`,
    type: PostType.QUESTION,
    category: 'Education',
    tags: ['iep', 'rights', 'school', 'advocacy', 'adhd'],
    community: 'inclusive-education',
  },
  {
    title: 'Celebrating small wins: He tied his shoes today!',
    content: `My son (9, cerebral palsy) has been working on tying his shoes for 2 YEARS with OT.

Today he did it. By himself. Without help.

I know this seems like such a small thing. Most kids learn this at 5-6. But for us, this is HUGE.

We've practiced thousands of times. Tried different lacing techniques. Used special shoes. Worked on fine motor skills. 

And today, it just clicked.

He was so proud of himself. I'm so proud of him.

Every milestone counts. Every small win matters. Every bit of progress is worth celebrating.

To all the parents working on "small" things - keep going. The breakthrough will come. ❤️`,
    type: PostType.DISCUSSION,
    category: 'Milestones',
    tags: ['celebration', 'milestone', 'cerebral-palsy', 'occupational-therapy'],
    community: 'cerebral-palsy',
  },
];

// ========================================
// MAIN SEED FUNCTION
// ========================================

async function main() {
  console.log('🌱 Starting Phase 1 Comprehensive Seed...\n');

  try {
    // Connect to database
    await prisma.$connect();
    console.log('✅ Database connected\n');

    // ========================================
    // CLEAR EXISTING DATA
    // ========================================
    console.log('🧹 Clearing existing data...');
    
    // Delete in correct order to handle foreign key constraints
    await prisma.eventInterest.deleteMany();
    await prisma.event.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.follow.deleteMany();
    await prisma.bookmark.deleteMany();
    await prisma.vote.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.postEngagementMetrics.deleteMany();
    await prisma.postView.deleteMany();
    await prisma.engagementEvent.deleteMany();
    await prisma.feedInteraction.deleteMany();
    await prisma.post.deleteMany();
    await prisma.communityMember.deleteMany();
    await prisma.community.deleteMany();
    
    // Delete Q&A data
    await prisma.answerVote.deleteMany();
    await prisma.answerComment.deleteMany();
    await prisma.answerEdit.deleteMany();
    await prisma.answerView.deleteMany();
    await prisma.answerRequest.deleteMany();
    await prisma.questionFollower.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.question.deleteMany();

    // Delete case management data
    await prisma.caseAuditLog.deleteMany();
    await prisma.caseConsent.deleteMany();
    await prisma.caseBilling.deleteMany();
    await prisma.caseDocument.deleteMany();
    await prisma.treatmentPlan.deleteMany();
    await prisma.milestonePlan.deleteMany();
    await prisma.iEPGoal.deleteMany();
    await prisma.iEP.deleteMany();
    await prisma.caseSession.deleteMany();
    await prisma.caseTherapist.deleteMany();
    await prisma.case.deleteMany();

    // Delete marketplace data
    await prisma.sessionRating.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.therapistAvailability.deleteMany();
    await prisma.availabilityException.deleteMany();
    await prisma.sessionPricing.deleteMany();
    await prisma.therapistProfile.deleteMany();

    // Delete worksheet data
    await prisma.worksheetReview.deleteMany();
    await prisma.worksheetAssignment.deleteMany();
    await prisma.worksheet.deleteMany();

    // Delete assessment data
    await prisma.childCondition.deleteMany();
    await prisma.assessment.deleteMany();

    // Delete banner ads
    await prisma.adAnalytics.deleteMany();
    await prisma.bannerAd.deleteMany();

    // Delete crisis data
    await prisma.crisisAuditLog.deleteMany();
    await prisma.crisisVolunteer.deleteMany();
    await prisma.crisisIncident.deleteMany();

    // Delete other user-related tables before users
    await prisma.userPreferences.deleteMany();
    await prisma.userInteractionProfile.deleteMany();
    await prisma.userInterests.deleteMany();
    await prisma.userSimilarity.deleteMany();
    await prisma.verificationDoc.deleteMany();
    await prisma.report.deleteMany();
    await prisma.moderationLog.deleteMany();
    await prisma.analytics.deleteMany();
    await prisma.aiSession.deleteMany();
    await prisma.aiSubscription.deleteMany();
    await prisma.aiUsage.deleteMany();
    await prisma.fcmToken.deleteMany();
    await prisma.userProfile.deleteMany();
    await prisma.organizationMember.deleteMany();
    await prisma.profileCompletenessLog.deleteMany();
    await prisma.clinicalFeedback.deleteMany();
    await prisma.clinicalPlan.deleteMany();
    await prisma.clinicalConversation.deleteMany();

    // Finally delete users
    await prisma.user.deleteMany();
    
    console.log('✅ Data cleared\n');

    // ========================================
    // SECTION 1: CREATE USERS
    // ========================================
    console.log('👥 Creating users...');
    const userMap = new Map();

    // Create admin
    const hashedPassword = await bcrypt.hash(USERS_DATA.admin.password, 10);
    const admin = await prisma.user.create({
      data: {
        ...USERS_DATA.admin,
        password: hashedPassword,
      },
    });
    userMap.set('admin', admin);
    console.log(`  ✓ Created: ${admin.name} (Admin)`);

    // Create moderators
    for (const mod of USERS_DATA.moderators) {
      const hashedPass = await bcrypt.hash(mod.password, 10);
      const moderator = await prisma.user.create({
        data: {
          ...mod,
          password: hashedPass,
        },
      });
      userMap.set(mod.email, moderator);
      console.log(`  ✓ Created: ${moderator.name} (Moderator)`);
    }

    // Create therapists
    for (const therapist of USERS_DATA.therapists) {
      const hashedPass = await bcrypt.hash(therapist.password, 10);
      const user = await prisma.user.create({
        data: {
          ...therapist,
          password: hashedPass,
        },
      });
      userMap.set(therapist.email, user);
      console.log(`  ✓ Created: ${user.name} (Therapist)`);
    }

    // Create educators
    for (const educator of USERS_DATA.educators) {
      const hashedPass = await bcrypt.hash(educator.password, 10);
      const user = await prisma.user.create({
        data: {
          ...educator,
          password: hashedPass,
        },
      });
      userMap.set(educator.email, user);
      console.log(`  ✓ Created: ${user.name} (Educator)`);
    }

    // Create organizations
    for (const org of USERS_DATA.organizations) {
      const hashedPass = await bcrypt.hash(org.password, 10);
      const user = await prisma.user.create({
        data: {
          ...org,
          password: hashedPass,
        },
      });
      userMap.set(org.email, user);
      console.log(`  ✓ Created: ${user.name} (Organization)`);
    }

    // Create parents
    for (const parent of USERS_DATA.parents) {
      const hashedPass = await bcrypt.hash(parent.password, 10);
      const user = await prisma.user.create({
        data: {
          ...parent,
          password: hashedPass,
        },
      });
      userMap.set(parent.email, user);
      console.log(`  ✓ Created: ${user.name} (Parent)`);
    }

    const allUsers = Array.from(userMap.values());
    console.log(`✅ Created ${allUsers.length} users\n`);

    // ========================================
    // SECTION 2: CREATE COMMUNITIES
    // ========================================
    console.log('🏘️  Creating communities...');
    const communityMap = new Map();

    for (const commData of COMMUNITIES_DATA) {
      // Pick a random admin from therapists or educators
      const therapists = Array.from(userMap.values()).filter(
        u => u.role === Role.THERAPIST || u.role === Role.EDUCATOR
      );
      const creator = therapists[Math.floor(Math.random() * therapists.length)];

      const community = await prisma.community.create({
        data: {
          ...commData,
          creatorId: creator.id,
        },
      });
      communityMap.set(commData.slug, community);
      console.log(`  ✓ Created: ${community.name}`);
    }
    console.log(`✅ Created ${communityMap.size} communities\n`);

    // ========================================
    // SECTION 3: CREATE COMMUNITY MEMBERS
    // ========================================
    console.log('👥 Adding members to communities...');
    let membershipCount = 0;

    for (const community of communityMap.values()) {
      // Add creator as admin
      const creator = allUsers.find(u => u.id === community.creatorId);
      await prisma.communityMember.create({
        data: {
          communityId: community.id,
          userId: creator!.id,
          role: CommunityRole.ADMIN,
          status: MemberStatus.ACTIVE,
          joinedAt: randomDate(90),
        },
      });
      membershipCount++;

      // Add 1-2 moderators
      const mods = pickRandom(
        allUsers.filter(u => u.role === Role.MODERATOR),
        randomInt(1, 2)
      );
      for (const mod of mods) {
        await prisma.communityMember.create({
          data: {
            communityId: community.id,
            userId: mod.id,
            role: CommunityRole.MODERATOR,
            status: MemberStatus.ACTIVE,
            joinedAt: randomDate(80),
          },
        });
        membershipCount++;
      }

      // Add 10-25 regular members
      const memberCount = randomInt(10, 25);
      const members = pickRandom(
        allUsers.filter(u => u.id !== creator!.id),
        memberCount
      );
      
      for (const member of members) {
        try {
          await prisma.communityMember.create({
            data: {
              communityId: community.id,
              userId: member.id,
              role: CommunityRole.MEMBER,
              status: MemberStatus.ACTIVE,
              joinedAt: randomDate(60),
            },
          });
          membershipCount++;
        } catch (e) {
          // Skip if already member
        }
      }

      // Update community member count
      await prisma.community.update({
        where: { id: community.id },
        data: { memberCount: await prisma.communityMember.count({ where: { communityId: community.id } }) },
      });
    }
    console.log(`✅ Created ${membershipCount} community memberships\n`);

    // ========================================
    // SECTION 4: CREATE POSTS
    // ========================================
    console.log('📝 Creating posts...');
    const postMap = new Map();
    const allPosts = [...POSTS_DATA, ...MORE_POSTS];

    for (const postData of allPosts) {
      // Pick author based on post type
      let author;
      if (postData.type === PostType.QUESTION || postData.type === PostType.DISCUSSION) {
        // Questions and experiences from parents
        author = pickRandom(allUsers.filter(u => u.role === Role.USER), 1)[0];
      } else if (postData.type === PostType.CASE_STUDY) {
        // Case studies from therapists
        author = pickRandom(allUsers.filter(u => u.role === Role.THERAPIST), 1)[0];
      } else {
        // Resources and discussions from anyone
        author = pickRandom(allUsers, 1)[0];
      }

      // Find community if specified
      let communityId = null;
      if (postData.community) {
        const comm = communityMap.get(postData.community);
        if (comm) {
          communityId = comm.id;
        }
      }

      const post = await prisma.post.create({
        data: {
          title: postData.title,
          content: postData.content,
          type: postData.type,
          category: postData.category,
          tags: postData.tags,
          authorId: author.id,
          communityId,
          viewCount: randomInt(10, 500),
          upvotes: randomInt(5, 100),
          downvotes: randomInt(0, 10),
          moderationStatus: ModerationStatus.APPROVED,
          createdAt: randomDate(60),
        },
      });
      postMap.set(post.id, post);
      console.log(`  ✓ Created post: ${post.title.substring(0, 50)}...`);
    }
    console.log(`✅ Created ${postMap.size} posts\n`);

    // ========================================
    // SECTION 5: CREATE COMMENTS
    // ========================================
    console.log('💬 Creating comments...');
    let commentCount = 0;

    for (const post of postMap.values()) {
      // Create 3-8 comments per post
      const numComments = randomInt(3, 8);
      
      for (let i = 0; i < numComments; i++) {
        const commenter = pickRandom(allUsers, 1)[0];
        
        const commentContents = [
          "Thank you for sharing this! We're going through something similar.",
          "This is really helpful. Saving for future reference.",
          "Have you tried occupational therapy? It helped us a lot.",
          "I completely relate to this. Sending you strength!",
          "Great resource! Adding this to my list.",
          "Our therapist recommended something similar and it's working well.",
          "This resonates so much. You're not alone in this journey.",
          "Thanks for the detailed breakdown. Very informative!",
          "We had similar challenges. Happy to discuss what worked for us.",
          "Appreciate you sharing your experience. Gives me hope!",
        ];

        const comment = await prisma.comment.create({
          data: {
            content: pickRandom(commentContents, 1)[0],
            postId: post.id,
            authorId: commenter.id,
            upvotes: randomInt(0, 20),
            downvotes: randomInt(0, 3),
            createdAt: new Date(post.createdAt.getTime() + randomInt(1, 24) * 60 * 60 * 1000),
          },
        });
        commentCount++;

        // 30% chance of a reply
        if (Math.random() < 0.3) {
          const replier = pickRandom(allUsers, 1)[0];
          const replyContents = [
            "Happy to help! Feel free to DM me if you have questions.",
            "Yes, absolutely! Let me know if you want more details.",
            "Thank you! It's been a journey but we're seeing progress.",
            "Glad this helped! Wishing you all the best.",
          ];

          await prisma.comment.create({
            data: {
              content: pickRandom(replyContents, 1)[0],
              postId: post.id,
              authorId: replier.id,
              parentId: comment.id,
              upvotes: randomInt(0, 10),
              createdAt: new Date(comment.createdAt.getTime() + randomInt(1, 12) * 60 * 60 * 1000),
            },
          });
          commentCount++;
        }
      }
    }
    console.log(`✅ Created ${commentCount} comments\n`);

    // ========================================
    // SECTION 6: CREATE ENGAGEMENT (Votes, Bookmarks)
    // ========================================
    console.log('❤️  Creating engagement data...');
    let voteCount = 0;
    let bookmarkCount = 0;

    for (const post of postMap.values()) {
      // Create votes (20-40% of users vote)
      const voterCount = Math.floor(allUsers.length * (0.2 + Math.random() * 0.2));
      const voters = pickRandom(allUsers, voterCount);

      for (const voter of voters) {
        try {
          await prisma.vote.create({
            data: {
              userId: voter.id,
              postId: post.id,
              targetId: post.id,
              targetType: 'post',
              value: Math.random() > 0.1 ? 1 : -1, // 90% upvotes, 10% downvotes
              createdAt: randomDate(30),
            },
          });
          voteCount++;
        } catch (e) {
          // Skip duplicate votes
        }
      }

      // Create bookmarks (10-20% of users bookmark)
      const bookmarkerCount = Math.floor(allUsers.length * (0.1 + Math.random() * 0.1));
      const bookmarkers = pickRandom(allUsers, bookmarkerCount);

      for (const bookmarker of bookmarkers) {
        try {
          await prisma.bookmark.create({
            data: {
              userId: bookmarker.id,
              postId: post.id,
              createdAt: randomDate(30),
            },
          });
          bookmarkCount++;
        } catch (e) {
          // Skip duplicates
        }
      }
    }
    console.log(`✅ Created ${voteCount} votes and ${bookmarkCount} bookmarks\n`);

    // ========================================
    // SUMMARY
    // ========================================
    console.log('🎉 Phase 1 Seed Complete!\n');
    console.log('Summary:');
    console.log(`  👥 Users: ${allUsers.length}`);
    console.log(`  🏘️  Communities: ${communityMap.size}`);
    console.log(`  👤 Memberships: ${membershipCount}`);
    console.log(`  📝 Posts: ${postMap.size}`);
    console.log(`  💬 Comments: ${commentCount}`);
    console.log(`  ❤️  Votes: ${voteCount}`);
    console.log(`  🔖 Bookmarks: ${bookmarkCount}`);
    console.log('\n✅ Database seeded successfully!');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });