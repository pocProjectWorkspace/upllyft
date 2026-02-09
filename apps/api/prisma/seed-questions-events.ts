import { PrismaClient, Role, ModerationStatus, EventCategory, EventFormat, EventStatus, InterestStatus } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Helper function to generate future date
function futureDate(daysAhead: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * daysAhead) + 1);
  return date;
}

// Helper function to pick random items from array
function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, arr.length));
}

// Helper function to generate random date within last N days
function randomDate(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date;
}

async function main() {
  console.log('🌱 Starting Events seed...');
  console.log('📊 This will create comprehensive Events data\n');

  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully\n');

    // =============================
    // CLEANUP EXISTING DATA
    // =============================
    console.log('🧹 Cleaning up existing Events data...');
    
    await prisma.eventInterest.deleteMany();
    await prisma.event.deleteMany();
    
    console.log('✅ Cleanup complete\n');

    // =============================
    // GET EXISTING USERS
    // =============================
    console.log('👥 Fetching existing users...');
    
    const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
    const therapists = await prisma.user.findMany({ where: { role: Role.THERAPIST } });
    const educators = await prisma.user.findMany({ where: { role: Role.EDUCATOR } });
    const parents = await prisma.user.findMany({ where: { role: Role.USER } });
    const organizations = await prisma.user.findMany({ where: { role: Role.ORGANIZATION } });
    
    const allUsers = [...therapists, ...educators, ...parents, ...(organizations || [])];
    
    if (allUsers.length === 0) {
      throw new Error('No users found! Please run the main seed file first.');
    }
    
    console.log(`✅ Found ${allUsers.length} users\n`);

    // Get existing communities
    const communities = await prisma.community.findMany();
    console.log(`✅ Found ${communities.length} communities\n`);
    
    // Ensure we have at least one community
    if (communities.length === 0) {
      throw new Error('No communities found! Events require a community. Please create at least one community first or run the main seed file.');
    }

    // =============================
    // CREATE EVENTS
    // =============================
    console.log('📅 Creating Events...\n');

    const eventsData = [
      // THERAPY & ASSESSMENT EVENTS
      {
        creator: organizations[0] || therapists[0] || allUsers[0],
        title: 'Free Autism Screening Camp - Mumbai',
        description: `Join us for a comprehensive FREE autism screening camp organized by Ummeed Child Development Center.

**What we offer:**
✅ Initial developmental screening (M-CHAT)
✅ Parent consultation with developmental pediatrician
✅ Speech & language assessment
✅ Occupational therapy screening
✅ Information session on early intervention
✅ Resource materials and guidance

**Who should attend:**
- Parents with concerns about child development
- Children showing delayed milestones
- Ages: 18 months to 5 years

**What to bring:**
- Child's vaccination records
- Previous medical reports (if any)
- Questions/concerns written down

**Registration required** - Limited slots!
Call: 022-2445-7700
WhatsApp: +91 98765 43210

Early detection leads to better outcomes. Don't wait - screen early!

*Supported by Maharashtra State Government & UNICEF*`,
        eventType: EventCategory.ASSESSMENT,
        format: EventFormat.IN_PERSON,
        startDate: futureDate(15),
        endDate: futureDate(15),
        city: 'Mumbai',
        state: 'Maharashtra',
        location: 'Ummeed Child Development Center, Bandra West, Mumbai',
        venue: 'Ummeed Child Development Center',
        address: 'Bandra West, Mumbai, Maharashtra',
        isFree: true,
        maxAttendees: 50,
        tags: ['autism', 'screening', 'free', 'assessment', 'mumbai'],
        ageGroup: ['toddler', 'preschool'],
        languages: ['English', 'Hindi', 'Marathi'],
        contactPhone: '022-2445-7700',
        contactWhatsApp: '+91 98765 43210',
      },
      {

        creator: therapists[1] || allUsers[1],
        title: 'ADHD Parent Workshop: Behavior Management Strategies',
        description: `Evidence-based strategies for managing ADHD behaviors at home and school.

**Workshop Topics:**
1. Understanding ADHD brain
2. Positive behavior support techniques
3. Token economy systems
4. Time management tools
5. Homework strategies
6. School collaboration
7. Self-regulation skills
8. Managing medication side effects

**Led by:**
Dr. Arun Verma - Clinical Psychologist, ADHD Specialist
15+ years experience

**Workshop Format:**
- 3-hour intensive session
- Small group (max 20 families)
- Interactive activities
- Take-home materials
- Q&A session
- Coffee & snacks provided

**What you'll get:**
📋 Behavior chart templates
📱 Recommended apps
📚 Resource guide
🎯 Personalized action plan

**Investment:** ₹2,500 per family
**Early bird (7 days advance):** ₹2,000

Book now: adhd.workshop@upllyft.com`,
        eventType: EventCategory.PARENT_EDUCATION,
        format: EventFormat.IN_PERSON,
        startDate: futureDate(20),
        endDate: futureDate(20),
        city: 'Bangalore',
        state: 'Karnataka',
        location: 'Mind Plus Clinic, Koramangala, Bangalore',
        venue: 'Mind Plus Clinic',
        address: 'Koramangala, Bangalore, Karnataka',
        isFree: false,
        externalLink: 'https://forms.gle/example1',
        maxAttendees: 20,
        tags: ['adhd', 'parenting', 'workshop', 'behavior', 'bangalore'],
        ageGroup: ['school-age', 'teen'],
        languages: ['English', 'Hindi', 'Kannada'],
        contactEmail: 'adhd.workshop@upllyft.com',
      },
      {

        creator: therapists[2] || allUsers[2],
        title: 'Speech Therapy Techniques for Parents - Online Workshop',
        description: `Learn professional speech therapy techniques you can use at home!

**Who is this for:**
Parents of children with:
- Speech delays
- Articulation issues
- Apraxia
- Non-verbal or minimally verbal
- Autism spectrum disorder

**What you'll learn:**

**Session 1: Basics (Week 1)**
- How speech develops
- Identifying problem areas
- Creating communication-rich environment
- Building motivation to communicate

**Session 2: Techniques (Week 2)**
- Play-based speech therapy
- Naturalistic teaching strategies
- Using AAC devices effectively
- Errorless teaching

**Session 3: Practice (Week 3)**
- Target selection
- Data collection
- Troubleshooting common problems
- When to seek professional help

**Session 4: Advanced (Week 4)**
- Articulation activities
- Language expansion
- Social communication
- Generalization strategies

**Format:**
- 4 weekly sessions (Saturdays 10am-12pm IST)
- Live Zoom sessions
- Recording provided
- Downloadable activity sheets
- WhatsApp support group
- Certificate of completion

**Instructor:**
Dr. Deepa Nair, M.A. Speech-Language Pathology
10+ years experience, AIISH Mysore

**Fee:** ₹4,000 for 4 sessions
**Early bird:** ₹3,500 (register 10 days early)

Limited to 30 participants for interactive experience.`,
        eventType: EventCategory.WORKSHOP,
        format: EventFormat.VIRTUAL,
        startDate: futureDate(25),
        endDate: futureDate(46), // 4 weeks program
        city: 'Online',
        state: 'Online',
        location: 'Online (Zoom)',
        platform: 'Zoom',
        virtualLink: 'https://zoom.us/j/example',
        isFree: false,
        externalLink: 'https://forms.gle/example2',
        maxAttendees: 30,
        tags: ['speech-therapy', 'online', 'workshop', 'parents', 'communication'],
        ageGroup: ['toddler', 'preschool', 'school-age'],
        languages: ['English', 'Hindi'],
        contactEmail: 'speech.workshop@upllyft.com',
      },
      // SUPPORT GROUP EVENTS
      {

        creator: parents[0] || allUsers[3],
        title: 'Autism Parent Support Group Monthly Meetup - Delhi',
        description: `Safe space for parents of autistic children to connect, share, and support each other.

**Who can join:**
- Parents/caregivers of autistic children
- Any age group welcome
- Newly diagnosed or experienced
- All questions welcome - no judgment zone

**What we do:**
- Share experiences and strategies
- Discuss challenges and solutions
- Resource sharing
- Guest speakers (occasionally)
- Informal networking
- Coffee and snacks

**This month's topic:**
"Navigating School Systems: IEPs and Accommodations"

Special guest: Education rights advocate Priya Sharma

**Meeting details:**
- Monthly on 2nd Saturday
- 4:00 PM - 6:00 PM
- Informal, come as you are
- Children can attend (play area available)

**Important:**
- Confidential space - what's shared stays in the group
- Respectful discussions
- All parenting approaches welcome
- Free event, just bring yourself!

**RSVP appreciated** (for seating/snacks):
WhatsApp: +91 98765 11111

Looking forward to seeing familiar and new faces!`,
        eventType: EventCategory.SUPPORT_GROUP,
        format: EventFormat.IN_PERSON,
        startDate: futureDate(10),
        endDate: futureDate(10),
        city: 'New Delhi',
        state: 'Delhi',
        location: 'Café Coffee Day, Connaught Place, New Delhi',
        venue: 'Café Coffee Day',
        address: 'Connaught Place, New Delhi',
        isFree: true,
        maxAttendees: 25,
        tags: ['support-group', 'autism', 'parents', 'delhi', 'monthly'],
        ageGroup: ['all'],
        languages: ['English', 'Hindi'],
        contactWhatsApp: '+91 98765 11111',
      },
      {

        creator: parents[2] || allUsers[4],
        title: 'ADHD Kids & Parents Meetup: Park Playdate',
        description: `Outdoor playdate for ADHD kids and their parents - because our kids need friends who "get it"!

**For kids:**
- Unstructured play time
- Sports activities (frisbee, football)
- Sensory-friendly activities
- Peer interaction in accepting environment

**For parents:**
- Chat while kids play
- Exchange tips and strategies
- Make friends who understand ADHD challenges
- Informal support and solidarity

**What to know:**
- **Supervision:** Parents stay and supervise own children
- **Snacks:** Bring your own (some kids have food sensitivities)
- **Water:** Provided
- **First aid:** Available
- **Weather:** Cancelled if raining (check WhatsApp group)

**What to bring:**
- Water bottle
- Snacks (optional)
- Change of clothes (kids get messy!)
- Sunscreen
- Energy 😊

**Age group:** 5-12 years

**No registration needed** - just show up!
But join our WhatsApp group for updates: [link]

Let's build a community where ADHD is understood and celebrated! 🎉`,
        eventType: EventCategory.PLAYDATE,
        format: EventFormat.IN_PERSON,
        startDate: futureDate(8),
        endDate: futureDate(8),
        city: 'Bangalore',
        state: 'Karnataka',
        location: 'Cubbon Park (Near Bandstand), Bangalore',
        venue: 'Cubbon Park',
        address: 'Near Bandstand, Bangalore, Karnataka',
        isFree: true,
        maxAttendees: 40,
        tags: ['adhd', 'playdate', 'kids', 'parents', 'bangalore', 'outdoor'],
        ageGroup: ['school-age'],
        languages: ['English', 'Hindi', 'Kannada'],
        accessibilityFeatures: ['wheelchair-accessible', 'outdoor-space'],
      },
      // TRAINING & PROFESSIONAL EVENTS
      {

        creator: organizations[0] || therapists[3] || allUsers[5],
        title: 'ABA Therapy Training for Parents - Intensive Workshop',
        description: `Learn Applied Behavior Analysis (ABA) techniques to support your child at home.

**5-Day Intensive Training Program**

**What you'll master:**
- ABA principles and philosophy
- How to identify function of behaviors
- ABC data collection
- Positive reinforcement strategies
- Task analysis and chaining
- Discrete trial training basics
- Natural environment teaching
- Managing challenging behaviors
- Generalization and maintenance

**Schedule:**
- **Week 1 (Mon-Tue):** Theory and principles
- **Week 2 (Mon-Tue):** Hands-on practice
- **Week 3 (Friday):** Supervised home practice review

**Daily Schedule:** 9:00 AM - 4:00 PM
- Morning session: Theory/demonstration
- Lunch break (provided)
- Afternoon session: Practice with feedback

**Who should attend:**
- Parents of children with autism
- Caregivers
- Family members involved in child's care

**Requirements:**
- Commitment to attend all 5 days
- Willingness to practice at home
- Bring videos of child's behaviors (optional)

**Certification:**
Certificate of completion provided (20 hours training)

**Investment:** ₹15,000 per person
- Includes: Training materials, lunch, certificate
- Couple discount: ₹25,000 for both parents

**Trainers:**
BCBA-certified therapists with 10+ years experience

**Limited to 15 participants** for quality instruction.

Register: info@abaworkshop.com
Call: +91 22 1234 5678`,
        eventType: EventCategory.TRAINING,
        format: EventFormat.IN_PERSON,
        startDate: futureDate(30),
        endDate: futureDate(44), // 5-day program over 3 weeks
        city: 'Mumbai',
        state: 'Maharashtra',
        location: 'Behavior Therapy Institute, Andheri, Mumbai',
        venue: 'Behavior Therapy Institute',
        address: 'Andheri, Mumbai, Maharashtra',
        isFree: false,
        externalLink: 'https://forms.gle/example3',
        maxAttendees: 15,
        tags: ['aba', 'training', 'intensive', 'parents', 'mumbai', 'certification'],
        ageGroup: ['all'],
        languages: ['English', 'Hindi'],
        contactEmail: 'info@abaworkshop.com',
        contactPhone: '+91 22 1234 5678',
      },
      // AWARENESS & FUNDRAISING
      {

        creator: organizations[0] || allUsers[6],
        title: 'Autism Awareness Walk & Fundraiser',
        description: `Join us for a 5K walk to raise awareness and funds for autism services!

**Event Highlights:**
🚶‍♀️ 5K family-friendly walk
🎪 Autism awareness booths
🎨 Art by autistic artists
🎵 Live music performances
👕 Free event t-shirt
🎁 Goodie bags for kids
📸 Photo booth
☕ Refreshments

**Fundraiser Goals:**
Funds raised will support:
- Free therapy for 50 underprivileged children
- Parent training programs
- Sensory-friendly equipment
- Awareness campaigns

**Registration:**
- **Individual:** ₹500
- **Family (4 members):** ₹1,500
- **Student/Senior:** ₹300
- **Donate without walking:** Any amount

**Walk Route:**
Start: Marine Drive
End: Gateway of India
(Wheelchair accessible route)

**Schedule:**
- 6:00 AM: Registration & warm-up
- 7:00 AM: Walk begins
- 8:30 AM: Refreshments & activities
- 10:00 AM: Closing ceremony

**Special Guests:**
- Local celebrities
- Autism advocates
- Government representatives

**What to bring:**
- Comfortable walking shoes
- Water bottle (refill stations available)
- Enthusiasm!

**Parking:** Limited, please use public transport

**Register online:** www.autismwalk2025.com
**Contact:** 022-1234-5678

Let's walk together towards acceptance! 💙`,
        eventType: EventCategory.FUNDRAISER,
        format: EventFormat.IN_PERSON,
        startDate: futureDate(45),
        endDate: futureDate(45),
        city: 'Mumbai',
        state: 'Maharashtra',
        location: 'Marine Drive to Gateway of India, Mumbai',
        venue: 'Marine Drive',
        address: 'Marine Drive, Mumbai, Maharashtra',
        isFree: false,
        externalLink: 'https://autismwalk2025.com/register',
        maxAttendees: 500,
        tags: ['autism', 'awareness', 'fundraiser', 'walk', 'mumbai', 'charity'],
        ageGroup: ['all'],
        languages: ['English', 'Hindi', 'Marathi'],
        accessibilityFeatures: ['wheelchair-accessible'],
        contactPhone: '022-1234-5678',
      },
      // WEBINARS
      {

        creator: therapists[0] || allUsers[7],
        title: 'Understanding Sensory Processing Disorder - Free Webinar',
        description: `Comprehensive webinar on Sensory Processing Disorder (SPD) for parents and professionals.

**Topics Covered:**

**Part 1: Understanding SPD**
- What is sensory processing?
- 8 sensory systems explained
- Types of SPD (hyper, hypo, seeking)
- How SPD affects daily life
- SPD vs autism: overlaps and differences

**Part 2: Identification**
- Red flags for SPD
- Assessment process
- When to seek OT evaluation
- Understanding sensory profiles

**Part 3: Strategies**
- Home sensory diet ideas
- Classroom accommodations
- Calming vs alerting activities
- DIY sensory tools
- Creating sensory-friendly spaces

**Part 4: Q&A**
- Submit questions in advance
- Live Q&A session

**Presenter:**
Meera Patel, Occupational Therapist
- Sensory Integration certification
- 12+ years experience
- Published researcher on SPD

**Webinar Details:**
- **Duration:** 90 minutes
- **Platform:** Zoom
- **Recording:** Available for 48 hours
- **Materials:** PDF guide included
- **Certificate:** Participation certificate

**Who should attend:**
- Parents of sensory-sensitive children
- Teachers
- Therapists
- Anyone working with children

**FREE event** - Registration required
Limited to 100 participants for Q&A interaction

Register: www.spdwebinar.com`,
        eventType: EventCategory.WEBINAR,
        format: EventFormat.VIRTUAL,
        startDate: futureDate(12),
        endDate: futureDate(12),
        city: 'Online',
        state: 'Online',
        location: 'Online (Zoom)',
        platform: 'Zoom',
        virtualLink: 'https://zoom.us/j/example-spd',
        isFree: true,
        externalLink: 'https://spdwebinar.com/register',
        maxAttendees: 100,
        tags: ['sensory', 'spd', 'webinar', 'free', 'online', 'occupational-therapy'],
        ageGroup: ['all'],
        languages: ['English', 'Hindi'],
        contactEmail: 'webinar@spdinfo.com',
      },
      // SOCIAL SKILLS & ACTIVITIES
      {

        creator: educators[0] || allUsers[8],
        title: 'Social Skills Group for Autistic Teens (13-17 years)',
        description: `8-week structured social skills program for autistic teenagers.

**Program Goals:**
- Develop conversation skills
- Understand social cues
- Make and maintain friendships
- Navigate social media
- Handle peer pressure
- Self-advocacy skills

**Weekly Topics:**

**Week 1:** Introduction & Goal Setting
**Week 2:** Starting Conversations
**Week 3:** Reading Body Language
**Week 4:** Active Listening
**Week 5:** Handling Disagreements
**Week 6:** Social Media Dos & Don'ts
**Week 7:** Making Plans with Friends
**Week 8:** Review & Celebration

**Session Structure:**
- 90 minutes per week
- Small group (6-8 teens)
- Mix of discussion, role-play, games
- Real-world practice assignments
- Parent check-in (last 15 min)

**What Makes This Different:**
- Neurodiversity-affirming approach
- Led by autistic adult mentor + therapist
- Peer support emphasis
- Strengths-based focus
- No masking required - be yourself!

**Requirements:**
- Age 13-17
- Able to participate in group setting
- Commitment to attend all 8 weeks
- Parent/guardian involvement

**Format:** In-person (weekly Saturdays, 4-5:30 PM)

**Fee:** ₹8,000 for 8 weeks
(Payment plans available)

**Facilitators:**
- Rohan Kumar (Autistic self-advocate)
- Dr. Priya Sharma (Clinical Psychologist)

**To apply:** Email teen's name, age, interests, goals to socialskills@upllyft.com

Interviews required (not competitive, just to ensure good fit)`,
        eventType: EventCategory.SOCIAL_SKILLS,
        format: EventFormat.IN_PERSON,
        startDate: futureDate(18),
        endDate: futureDate(74), // 8 weeks
        city: 'Bangalore',
        state: 'Karnataka',
        location: 'Upllyft Center, Indiranagar, Bangalore',
        venue: 'Upllyft Center',
        address: 'Indiranagar, Bangalore, Karnataka',
        isFree: false,
        externalLink: 'mailto:socialskills@upllyft.com',
        maxAttendees: 8,
        tags: ['social-skills', 'autism', 'teens', 'group', 'bangalore', 'weekly'],
        ageGroup: ['teen'],
        languages: ['English'],
        contactEmail: 'socialskills@upllyft.com',
      },
      {

        creator: therapists[3] || allUsers[9],
        title: 'Art Therapy Session: Expression Through Creativity',
        description: `Therapeutic art session for children with special needs (all diagnoses welcome).

**What is Art Therapy?**
Using creative process for emotional expression, sensory exploration, and skill development.

**Benefits:**
- Emotional regulation
- Fine motor skills
- Self-expression
- Confidence building
- Social interaction
- Sensory exploration
- Fun and relaxation!

**This Session's Theme:** "My Feelings"

**Activities:**
- Finger painting (sensory-friendly)
- Collage making
- Clay modeling
- Free creative time

**Adaptations Available:**
- Sensory-friendly materials
- Noise-reducing headphones
- Quiet space for breaks
- One-on-one support if needed
- Parent can stay with child

**What we provide:**
- All art supplies
- Aprons
- Cleaning supplies
- Snacks
- Take-home artwork

**What to bring:**
- Comfortable clothes (may get messy)
- Openness to creativity!

**Age group:** 5-12 years
**Group size:** Maximum 10 kids
**Duration:** 2 hours

**Fee:** ₹800 per child
**Sibling discount:** ₹1,400 for 2 siblings

**Led by:**
Anjali Desai - Art Therapist & Special Educator
Certified in creative arts therapy

**Location:** Bright Minds Studio, Koramangala

**Booking:** Call/WhatsApp 98765 99999

*No art experience needed - all abilities welcome!*`,
        eventType: EventCategory.ART_THERAPY,
        format: EventFormat.IN_PERSON,
        startDate: futureDate(14),
        endDate: futureDate(14),
        city: 'Bangalore',
        state: 'Karnataka',
        location: 'Bright Minds Studio, Koramangala, Bangalore',
        venue: 'Bright Minds Studio',
        address: 'Koramangala, Bangalore, Karnataka',
        isFree: false,
        maxAttendees: 10,
        tags: ['art-therapy', 'sensory', 'creative', 'bangalore', 'kids'],
        ageGroup: ['school-age'],
        languages: ['English', 'Hindi', 'Kannada'],
        contactWhatsApp: '98765 99999',
      },
      // COMMUNITY EVENTS
      {
        creator: parents[4] || allUsers[10],
        title: 'Special Needs Family Picnic - Kerala',
        description: `Casual family picnic for families with special needs children - Kerala community!

**Who's invited:**
All families with neurodivergent children:
- Autism
- ADHD
- Down syndrome
- Cerebral palsy
- Learning disabilities
- ANY special needs!

**What to expect:**
🌳 Beautiful park setting
🏃 Open play areas
🍔 Potluck lunch (bring dish to share)
⚽ Adaptive sports and games
🎨 Craft activities
🎵 Music and dancing
👨‍👩‍👧‍👦 Family-friendly atmosphere
🤝 Make new friends!

**Special Features:**
- Wheelchair accessible
- Quiet zone for sensory breaks
- Buddy system for kids
- Volunteer support available
- First aid on-site

**Schedule:**
- 10:00 AM: Arrival & setup
- 11:00 AM: Icebreaker activities
- 12:30 PM: Potluck lunch
- 2:00 PM: Games and free play
- 4:00 PM: Group photo & wrap-up

**What to bring:**
- Picnic blanket/mat
- Dish for potluck (mention allergens)
- Sun protection
- Water bottle
- Outdoor toys (optional)
- Positive energy!

**Important:**
- Parents responsible for supervising own children
- Inclusive environment - all welcome
- No formal programming - relaxed fun
- Rain plan: Covered pavilion available

**RSVP:** Not required but helpful for planning
WhatsApp: +91 98765 54321

**FREE event** - just come and connect!

Organized by Kerala Special Needs Parents Association

Looking forward to meeting you all! 🌟`,
        eventType: EventCategory.PEER_MEETUP,
        format: EventFormat.IN_PERSON,
        startDate: futureDate(21),
        endDate: futureDate(21),
        city: 'Thiruvananthapuram',
        state: 'Kerala',
        location: 'Napier Museum Grounds, Thiruvananthapuram, Kerala',
        venue: 'Napier Museum Grounds',
        address: 'Thiruvananthapuram, Kerala',
        isFree: true,
        maxAttendees: 60,
        tags: ['picnic', 'family', 'community', 'kerala', 'free', 'outdoor'],
        ageGroup: ['all'],
        languages: ['English', 'Malayalam', 'Hindi'],
        accessibilityFeatures: ['wheelchair-accessible', 'quiet-zone', 'first-aid'],
        contactWhatsApp: '+91 98765 54321',
      },
    ];

    const events: any[] = [];
    for (let i = 0; i < eventsData.length; i++) {
      const eData = eventsData[i];
      
      // Assign community in round-robin fashion
      const community = communities[i % communities.length];
      
      // Calculate end time (if same day, add 2-4 hours)
      let endDate = eData.endDate;
      if (eData.startDate.toDateString() === eData.endDate.toDateString()) {
        endDate = new Date(eData.startDate);
        endDate.setHours(endDate.getHours() + Math.floor(Math.random() * 3) + 2);
      }

      const event = await prisma.event.create({
        data: {
          title: eData.title,
          description: eData.description,
          communityId: community.id, // Always set a valid community
          createdBy: eData.creator.id,
          eventType: eData.eventType,
          format: eData.format,
          startDate: eData.startDate,
          endDate: endDate,
          location: eData.location,
          venue: eData.venue,
          address: eData.address,
          city: eData.city,
          state: eData.state,
          platform: eData.platform,
          virtualLink: eData.virtualLink,
          externalLink: eData.externalLink,
          tags: eData.tags || [],
          ageGroup: eData.ageGroup || [],
          languages: eData.languages || [],
          accessibilityFeatures: eData.accessibilityFeatures || [],
          contactPhone: eData.contactPhone,
          contactEmail: eData.contactEmail,
          contactWhatsApp: eData.contactWhatsApp,
          isPublic: true,
          shareToFeed: true,
          maxAttendees: eData.maxAttendees || null,
          status: EventStatus.PUBLISHED,
          createdAt: randomDate(10),
        },
      });
      events.push(event);
      console.log(`✅ Created event: "${event.title.substring(0, 50)}..."`);
    }

    console.log(`\n✅ Created ${events.length} events\n`);

    // =============================
    // CREATE EVENT INTERESTS
    // =============================
    console.log('🎫 Creating event interests (RSVPs)...\n');

    let interestCount = 0;
    for (const event of events) {
      // Random number of people interested in each event
      const interestedUsers = pickRandom(allUsers, Math.floor(Math.random() * 20) + 5);
      
      for (const user of interestedUsers) {
        try {
          const status = Math.random() > 0.5 ? InterestStatus.GOING : InterestStatus.INTERESTED;
          
          await prisma.eventInterest.create({
            data: {
              eventId: event.id,
              userId: user.id,
              status: status,
            },
          });
          
          interestCount++;
          
          // Update event attendee count
          await prisma.event.update({
            where: { id: event.id },
            data: { 
              attendeeCount: { increment: 1 },
              interestedCount: status === InterestStatus.INTERESTED ? { increment: 1 } : undefined,
            },
          });
        } catch (e) {
          // Skip if duplicate
        }
      }
    }

    console.log(`✅ Created ${interestCount} event interests\n`);

    // =============================
    // FINAL SUMMARY
    // =============================
    console.log('\n=================================');
    console.log('🎉 EVENTS SEED COMPLETED!');
    console.log('=================================');
    console.log('📊 Database Summary:');
    console.log(`   📅 Events: ${events.length}`);
    console.log(`   🎫 Event Interests: ${interestCount}`);
    console.log('=================================');
    console.log('📅 Sample Events:');
    events.slice(0, 5).forEach((e, i) => {
      console.log(`   ${i + 1}. ${e.title.substring(0, 60)}...`);
    });
    console.log('=================================\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });