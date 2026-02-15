import { PrismaClient, Role, QuestionStatus, ModerationStatus } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['info', 'warn', 'error'],
});

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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 80);
}

// ========================================
// QUESTIONS DATA
// ========================================

const QUESTIONS_DATA = [
  {
    title: 'How do I explain my child\'s autism diagnosis to family members?',
    content: `We recently got our 4-year-old son diagnosed with autism spectrum disorder. While my husband and I have been reading everything we can, our extended family is struggling to understand.

My in-laws keep saying "he'll grow out of it" and my parents think it's because of screen time. Family gatherings are becoming stressful because everyone has unsolicited advice.

How have you explained the diagnosis to family? Any resources or approaches that worked? I want them to be supportive but I also don't want to turn every visit into an education session.`,
    category: 'Diagnosis & Assessment',
    tags: ['autism', 'diagnosis', 'family', 'communication'],
    topics: ['autism', 'family-support'],
    status: QuestionStatus.OPEN,
    answers: [
      {
        content: `This is such a common struggle. Here's what worked for us:

1. **Pick the right time** - Don't do it during a family gathering. Have a separate, calm conversation with key family members.

2. **Use simple language** - "Autism means his brain processes things differently. He's still the same child you love, he just needs different support."

3. **Share a short video** - We shared a 5-minute YouTube video called "Amazing Things Happen" which explains autism to non-experts beautifully.

4. **Set boundaries** - "We appreciate your concern, but we're following our doctor's recommendations. We need your support, not alternative treatments."

5. **Give them a role** - Instead of just educating, give them something to DO. "When he covers his ears, it means the noise is too much. Can you help us find a quiet spot?"

It took about 6 months for our family to really get on board, but most of them came around once they saw the positive changes from therapy.`,
        isAccepted: false,
        helpfulVotes: 24,
        notHelpfulVotes: 1,
        authorRole: Role.USER,
        comments: [
          'The "Amazing Things Happen" video is fantastic! We used it too.',
          'Great point about giving them a role. It shifts the dynamic completely.',
        ],
      },
      {
        content: `As a clinical psychologist, I often help families navigate this. A few professional tips:

**For the "he'll grow out of it" crowd:**
Gently explain that autism is a neurological difference, not a phase. Early intervention is key, and waiting can mean missing critical developmental windows.

**For the "it's because of screen time" crowd:**
Share that autism has a strong genetic component. Research shows no causal link between screen time and autism. It's diagnosed through behavioral observation, not caused by parenting choices.

**Practical approach:**
I recommend writing a short letter/email to family explaining:
- What the diagnosis means
- What your child needs
- How they can help
- What NOT to say/do

This gives family time to process privately and reduces the emotional intensity of face-to-face conversations.

I also recommend the book "Uniquely Human" by Barry Prizant - it's excellent for family members who want to understand autism.`,
        isAccepted: false,
        helpfulVotes: 31,
        notHelpfulVotes: 0,
        authorRole: Role.THERAPIST,
        comments: [
          'Thank you doctor! The letter approach is brilliant - less confrontational.',
        ],
      },
      {
        content: `One thing that really helped our family was inviting my mother-in-law to one therapy session. Seeing a professional work with my child and explain things in real-time was worth more than any conversation.

Our therapist was happy to have grandparents observe and even gave them specific tips for interacting with our son. After that session, my MIL became our biggest advocate.

Also, I created a small WhatsApp group with close family where I share our son's progress - small wins like a new word, eye contact improvements, etc. Seeing the progress made them understand the value of therapy and early intervention.`,
        isAccepted: false,
        helpfulVotes: 18,
        notHelpfulVotes: 0,
        authorRole: Role.USER,
        comments: [],
      },
    ],
  },
  {
    title: 'Best ADHD-friendly study strategies for teenagers?',
    content: `My 14-year-old daughter was diagnosed with ADHD-Combined type last year. She's intelligent but struggles terribly with studying. Board exams are approaching and we're all stressed.

Her main challenges:
- Can't sit and study for more than 15 minutes
- Forgets what she studied the previous day
- Gets overwhelmed by the volume of syllabus
- Procrastinates and then panics
- Her notes are disorganized

She's on medication which helps with focus during school hours, but by evening when she needs to study, it's worn off.

What study strategies have worked for ADHD teens? Any specific tools or techniques? We've tried tutoring but she zones out with tutors too.`,
    category: 'Education',
    tags: ['adhd', 'study-strategies', 'teenagers', 'education', 'exams'],
    topics: ['adhd', 'education', 'teenagers'],
    status: QuestionStatus.OPEN,
    answers: [
      {
        content: `Parent of an ADHD teen who just cleared his boards with flying colors! Here's what worked:

**Study Technique:**
- **Pomodoro method** - 25 min study, 5 min break. But we modified it to 15 min on/5 min off for tough subjects
- **Active recall** - Instead of reading notes, she should close the book and try to recall. Use flashcards (Anki app is great)
- **Mind maps** - Visual learners with ADHD often do better with colorful mind maps than linear notes

**Environment:**
- Study in SHORT bursts, not marathon sessions
- Background music (lo-fi or instrumental) can actually help ADHD focus
- Standing desk or exercise ball chair - movement helps!
- Remove ALL distractions (phone in another room)

**Organization:**
- Color-coded folders for each subject
- A large whiteboard calendar showing exam dates
- Break the syllabus into tiny daily chunks (not "study Chapter 5" but "study pages 45-50")

**Medication timing:**
Talk to your psychiatrist about adjusting medication timing or adding an evening dose for study hours. This was a game-changer for us.

**Most important:** Don't compare her study style to neurotypical kids. If she retains more studying in 4 focused 15-minute sessions than 1 hour of forced sitting, that's VALID.`,
        isAccepted: false,
        helpfulVotes: 42,
        notHelpfulVotes: 2,
        authorRole: Role.USER,
        comments: [
          'The Anki app suggestion is gold! My son uses it for every subject now.',
          'We also use body doubling - studying alongside someone. Even virtual body doubling works!',
        ],
      },
      {
        content: `As a special educator who works with ADHD teens, here are evidence-based strategies:

**For the "can't sit" problem:**
- Allow movement while studying (pacing, fidget toys, doodling)
- Study in different locations - kitchen table, then living room, then bedroom
- Combine study with physical activity (walk and recite, bounce ball and recall facts)

**For memory retention:**
- **Spaced repetition** is crucial - review material at increasing intervals (1 day, 3 days, 7 days, 14 days)
- **Teach-back method** - Have her explain the concept to you or a sibling. If she can teach it, she knows it
- **Multi-sensory learning** - Read aloud, write key points, draw diagrams, record voice notes

**For overwhelm:**
- Create a "done list" not just a "to-do list" - seeing what's accomplished builds motivation
- Use the "two-minute rule" - if a task takes less than 2 minutes, do it now
- Start with the easiest subject to build momentum

**For procrastination:**
- External accountability (study buddy, parent check-ins every 30 min)
- Reward system - small reward after each study block (not just after exams)
- "Just 5 minutes" rule - commit to just 5 minutes. Usually the hardest part is starting

**Tools I recommend:**
- Forest app (gamifies focus)
- Notion or Google Keep for notes
- YouTube channels like Khan Academy for visual learning`,
        isAccepted: false,
        helpfulVotes: 35,
        notHelpfulVotes: 1,
        authorRole: Role.EDUCATOR,
        comments: [
          'The teach-back method works incredibly well. My daughter explains history to our dog!',
        ],
      },
    ],
  },
  {
    title: 'When should I seek a second opinion on my child\'s diagnosis?',
    content: `My 3-year-old was evaluated by a developmental pediatrician who said he has "global developmental delay" but specifically said it's NOT autism. However, he has many traits that seem autism-related:
- No pointing
- Limited eye contact
- Lines up toys
- Echolalia
- Sensory sensitivities
- Doesn't respond to name consistently

The doctor spent only 30 minutes with him and mainly observed while asking me questions. I feel like the evaluation wasn't thorough enough.

Should I seek a second opinion? How do I do this without seeming like I'm "doctor shopping"? I don't WANT an autism diagnosis, I just want the RIGHT diagnosis so he gets appropriate therapy.`,
    category: 'Diagnosis & Assessment',
    tags: ['diagnosis', 'second-opinion', 'autism', 'developmental-delay', 'evaluation'],
    topics: ['diagnosis', 'early-intervention'],
    status: QuestionStatus.CLOSED,
    answers: [
      {
        content: `ABSOLUTELY get a second opinion. Here's why:

1. **30 minutes is NOT enough** for a comprehensive autism evaluation. A proper assessment (like ADOS-2) takes 40-60 minutes of structured observation PLUS detailed developmental history PLUS cognitive assessment. Total evaluation should be 2-3 hours minimum.

2. **GDD and autism can co-exist** - Having a global developmental delay doesn't rule out autism. Many children have both.

3. **You're not "doctor shopping"** - Seeking a second opinion is responsible parenting. Any good doctor will support this.

**Where to go:**
- Multi-disciplinary team evaluation (pediatrician + psychologist + SLP + OT)
- AIIMS if you're near Delhi - they have excellent developmental pediatrics
- NIMHANS in Bangalore
- Any RCI-registered clinical psychologist with autism assessment experience

**What to ask for:**
- ADOS-2 assessment (gold standard for autism diagnosis)
- CARS-2 (Childhood Autism Rating Scale)
- Detailed developmental history (at least 30-45 min parent interview)
- Cognitive assessment (Bayley or similar)

**Important:** Don't delay therapy waiting for a diagnosis. Start speech therapy and OT now based on the GDD diagnosis. Early intervention helps regardless of the final diagnosis.`,
        isAccepted: true,
        helpfulVotes: 56,
        notHelpfulVotes: 0,
        authorRole: Role.THERAPIST,
        comments: [
          'This answer saved us. We got a second opinion and it was indeed autism. Early intervention started 6 months earlier thanks to this advice.',
          'ADOS-2 is definitely the gold standard. Our evaluation was 3 hours total and much more thorough.',
        ],
      },
      {
        content: `We were in the exact same situation. Our pediatrician said "wait and see" at 2.5 years. We waited. At 3.5, we finally got a proper evaluation from a multi-disciplinary team at a child development center.

Result: Autism Level 1 + Global Developmental Delay.

The 6 months we waited cost us precious intervention time. If your gut says something isn't right, trust it. Parents know their children best.

**My advice:**
- Don't wait. Get a comprehensive evaluation from a different doctor/team
- Document everything you observe at home (videos are powerful)
- Write down your concerns before the appointment
- Bring someone with you for support and to help remember what was said

The diagnosis itself isn't what matters most - getting the RIGHT therapies is. But the right diagnosis leads to the right therapy plan.`,
        isAccepted: false,
        helpfulVotes: 28,
        notHelpfulVotes: 0,
        authorRole: Role.USER,
        comments: [],
      },
    ],
  },
  {
    title: 'Sensory-friendly clothing brands available in India?',
    content: `My 6-year-old with sensory processing disorder has extreme sensitivity to clothing. Tags, seams, certain fabrics - everything bothers her. Getting dressed is a 30-minute battle every morning.

Currently she lives in the same 3 soft cotton t-shirts because those are the only ones she tolerates. School uniform is a nightmare.

Does anyone know of sensory-friendly clothing brands available in India? I've seen international brands but the shipping costs are insane. Looking for:
- Tagless clothing
- Flat seams
- Soft fabrics
- Sensory-friendly school uniforms
- Affordable options

Also any tips for making regular clothes more comfortable for sensory-sensitive kids?`,
    category: 'Daily Living',
    tags: ['sensory', 'clothing', 'spd', 'daily-living', 'india'],
    topics: ['sensory-processing', 'daily-living'],
    status: QuestionStatus.OPEN,
    answers: [
      {
        content: `Fellow sensory parent here! We've figured out a system over 4 years. Here's everything:

**Indian Brands:**
- **Fabindia** - Their pure cotton kids line is super soft and tagless. A bit pricey but durable
- **Pantaloons** - Their "Bare Basics" organic cotton line is surprisingly sensory-friendly
- **Max Fashion** - Check their cotton basics range. Remove tags and they're great
- **Decathlon** - Their Domyos kids line is seamless, stretchy, and affordable!

**Hacks for regular clothes:**
1. **Remove ALL tags** - Use a seam ripper, not scissors (leaves no scratchy bits)
2. **Turn clothes inside out** - Seams face outward
3. **Wash new clothes 3-4 times** before wearing (softens fabric)
4. **Use fabric softener** generously
5. **Iron the seams flat** with a hot iron
6. **Cover uncomfortable seams** with soft medical tape

**School uniform tips:**
- Talk to the school - most allow modifications for medical reasons
- Get the uniform in a size larger (less tight = less sensory input)
- Replace school socks with seamless ones (Decathlon has them)
- Use a soft cotton undershirt under the uniform

**Game changer:** We got our daughter a compression vest to wear under clothes. It provides deep pressure input that actually helps her tolerate the outer clothing better. Our OT recommended it.`,
        isAccepted: false,
        helpfulVotes: 39,
        notHelpfulVotes: 1,
        authorRole: Role.USER,
        comments: [
          'Decathlon Domyos is amazing! My son lives in their clothes.',
          'The compression vest suggestion is great. We use one from Amazon India - search "sensory compression vest kids".',
        ],
      },
      {
        content: `As an OT who works with SPD kids, here are my professional recommendations:

**Understanding the WHY:**
Clothing sensitivity is usually tactile defensiveness - the nervous system overreacts to touch input. It's not pickiness; it's genuine discomfort/pain.

**Therapeutic approach (alongside clothing solutions):**
- Wilbarger brushing protocol (ask your OT)
- Deep pressure activities before dressing
- Gradual desensitization with new fabrics
- Let the child have control over clothing choices

**Fabric hierarchy (most tolerated to least):**
1. Bamboo fabric (softest, but expensive)
2. 100% cotton jersey
3. Cotton-lycra blend
4. Modal fabric
5. Regular cotton

**Avoid:** Polyester, wool, stiff cotton, denim, lace

**Where to find bamboo fabric kids clothes in India:**
- Amazon India - search "bamboo kids clothing"
- A small brand called "Greendigo" makes organic bamboo kids wear
- "Mackly" on Myntra has soft seamless basics

**Important note:** If the sensitivity is severe, make sure your child has a comprehensive sensory profile assessment. Clothing sensitivity can be part of a broader sensory processing challenge that benefits from OT intervention.`,
        isAccepted: false,
        helpfulVotes: 22,
        notHelpfulVotes: 0,
        authorRole: Role.THERAPIST,
        comments: [],
      },
    ],
  },
  {
    title: 'How to prepare an autistic child for a hospital visit?',
    content: `My 7-year-old son with autism needs to go to the hospital for a minor surgery (ear tubes). He has severe anxiety about new places, doesn't tolerate being touched by strangers, and has a complete meltdown during medical procedures.

His last blood test was traumatic for everyone involved. Three adults had to hold him down while he screamed for 20 minutes.

The surgery requires:
- Blood tests beforehand
- Arriving early and waiting
- Changing into a hospital gown
- IV insertion
- General anesthesia
- Recovery in a new environment

I'm terrified. How do I prepare him? Has anyone gone through surgery with their autistic child? Any tips for making it less traumatic?`,
    category: 'Daily Living',
    tags: ['autism', 'hospital', 'surgery', 'medical', 'anxiety', 'preparation'],
    topics: ['autism', 'medical-visits'],
    status: QuestionStatus.OPEN,
    answers: [
      {
        content: `We went through this last year (adenoid removal). Here's our complete preparation plan that worked:

**2-3 weeks before:**
- Created a social story with photos of the ACTUAL hospital (we visited beforehand and took pictures)
- Read it daily
- Used a toy doctor kit to role-play the steps
- Watched "Going to the Hospital" videos (there are autism-specific ones on YouTube)

**1 week before:**
- Visited the hospital for a "tour" - saw the waiting room, corridors, etc.
- Met the anesthesiologist separately (we requested this, and they agreed!)
- Practiced wearing a hospital gown at home (bought a cheap one from Amazon)

**Day before:**
- Created a visual schedule (pictures of each step in order)
- Packed a "comfort bag" - favorite toy, noise-canceling headphones, iPad loaded with favorite shows, weighted lap pad, favorite snack for after

**Day of:**
- Gave anti-anxiety medication (prescribed by psychiatrist - discuss this option!)
- Applied numbing cream (EMLA) 1 hour before IV insertion (this eliminated the needle pain)
- Arrived early to reduce rushing stress
- Used visual timer to show waiting time
- Let him keep headphones and comfort toy until the very last moment

**What the hospital did (because we requested it):**
- First case of the day (less waiting)
- Private room instead of shared
- Allowed parent in the OR until he fell asleep
- Used the same nurse throughout
- Recovery room kept dimmed and quiet

**IMPORTANT:** Call the hospital WELL in advance and explain your child's needs. Most hospitals will accommodate. We spoke with the anesthesiologist, surgeon, and head nurse beforehand.

The surgery went smoothly. He was anxious but did NOT have a meltdown. Preparation is everything.`,
        isAccepted: false,
        helpfulVotes: 67,
        notHelpfulVotes: 0,
        authorRole: Role.USER,
        comments: [
          'EMLA cream is an absolute lifesaver! No more needle trauma.',
          'Requesting first case of the day is such a smart tip. Less waiting = less anxiety.',
          'We also had the hospital send us photos beforehand so we could make the social story. Most hospitals are willing to help if you explain.',
        ],
      },
      {
        content: `As a pediatric therapist who helps prepare children for medical procedures:

**Key strategies:**

1. **Predictability reduces anxiety** - The more your child knows what to expect, step by step, the calmer he'll be. Visual schedules are essential.

2. **Sensory preparation:**
   - Hospital gowns can be replaced with soft ones you bring
   - Bring familiar sensory items (blanket, toy, fidget)
   - Noise-canceling headphones for the loud hospital environment
   - Sunglasses for bright lights

3. **Communication with medical team:**
   - Write a "About Me" card for your child listing triggers, calming strategies, communication style
   - Hand it to every new person who interacts with your child
   - Example: "I'm Arjun. I have autism. Please speak slowly. Don't touch me suddenly. I like dinosaurs."

4. **Ask about child life specialists** - Some larger hospitals in India now have them. They specialize in preparing children for medical procedures.

5. **Anesthesia options:**
   - Discuss with the anesthesiologist: some can use gas first (mask) instead of IV to put the child to sleep, then insert IV once asleep
   - This eliminates the most traumatic part for many autistic children

6. **Post-surgery plan:**
   - Have familiar comfort items in recovery
   - Be there when he wakes up (request this)
   - Have his visual schedule show "almost done" stages
   - Reward/celebrate afterwards

The fact that you're preparing in advance shows excellent parenting. Most of the trauma from medical visits comes from lack of preparation and unexpected events.`,
        isAccepted: false,
        helpfulVotes: 45,
        notHelpfulVotes: 0,
        authorRole: Role.THERAPIST,
        comments: [],
      },
    ],
  },
  {
    title: 'Are there any good speech therapy apps for Hindi-speaking children?',
    content: `Most speech therapy apps and AAC devices are in English. My son (5, non-verbal autism) understands Hindi primarily as that's our home language.

We're looking for:
- AAC apps with Hindi vocabulary/symbols
- Speech therapy activity apps in Hindi
- Any apps that support bilingual (Hindi-English) setup

Our SLP suggested Avaz but even that seems mostly English-focused. Any Hindi-speaking parents found good solutions?

Budget is a concern too - we can't afford expensive imported solutions.`,
    category: 'Therapy',
    tags: ['speech-therapy', 'hindi', 'apps', 'aac', 'bilingual', 'non-verbal'],
    topics: ['speech-therapy', 'assistive-technology'],
    status: QuestionStatus.OPEN,
    answers: [
      {
        content: `Hindi-speaking parent of a non-verbal child here! We struggled with this for years. Here's what we found:

**Apps with Hindi support:**

1. **Avaz AAC (Indian app)** - Actually does have Hindi! Go to Settings > Language > Hindi. The vocabulary is culturally relevant too (Indian food, festivals, etc.). Cost: ~5000 one-time. WORTH IT.

2. **Jellow Communicator** - FREE app made in India specifically for Indian languages. Supports Hindi, Tamil, Kannada, Bengali. Has Indian cultural symbols. Not as polished as Avaz but it's free!

3. **LetMeTalk** - Free AAC app that lets you add your own images and record your own voice in ANY language. We recorded Hindi words and it works great.

4. **Cboard** - Free, open-source AAC with Hindi support

**For speech therapy activities:**

5. **Bolo by Google** - Hindi reading assistant. Not specifically for special needs but has slow, clear Hindi pronunciation that's helpful for speech practice.

**DIY approach (what worked best for us):**
- We created a PECS board in Hindi using printed photos + Hindi labels
- Used Google Keep to make digital flashcards with Hindi audio
- Recorded family members saying common words/phrases

**Important tip:** Talk to your SLP about whether bilingual AAC is appropriate. Research shows bilingual children with autism CAN learn two languages on AAC and it doesn't cause confusion. Our SLP initially said "stick to one language" but current research disagrees.`,
        isAccepted: false,
        helpfulVotes: 33,
        notHelpfulVotes: 0,
        authorRole: Role.USER,
        comments: [
          'Jellow is amazing and it\'s FREE! Can\'t believe more people don\'t know about it.',
          'We also use Avaz in Hindi. The cultural context makes such a difference - Indian food items, Indian festivals etc.',
        ],
      },
    ],
  },
  {
    title: 'Tips for potty training a child with developmental delays?',
    content: `My daughter is 5 years old with global developmental delay (functioning at about 2.5-3 year level). She's still in diapers and we've tried potty training multiple times with no success.

What we've tried:
- Regular schedule (every 30 min) - she fights it
- Reward charts - she doesn't understand the connection
- Letting her watch us - she's uncomfortable
- Fancy potty seats - no interest
- Bare bottom method - accidents everywhere, she doesn't seem to notice

She doesn't communicate when she needs to go, doesn't seem bothered by wet diapers, and actively resists sitting on the toilet.

School is starting to push for potty training and I feel like a failure. She's the oldest in diapers at her school.

Any approaches that worked for developmentally delayed children? How long did it take?`,
    category: 'Parenting',
    tags: ['potty-training', 'developmental-delay', 'daily-living', 'parenting'],
    topics: ['daily-living', 'parenting', 'developmental-delay'],
    status: QuestionStatus.CLOSED,
    answers: [
      {
        content: `You are NOT a failure! Potty training children with developmental delays is genuinely harder and takes longer. Our son with Down syndrome wasn't fully trained until age 6.5. Here's what finally worked:

**What we changed:**

1. **Readiness signs matter more than age:**
   Before trying again, check if your child shows at least 3 of these:
   - Stays dry for 1-2 hours
   - Shows discomfort with wet/soiled diaper
   - Can follow simple 1-step instructions
   - Can sit on a chair for 2-3 minutes
   - Shows interest in the toilet

   If she shows none, she may not be ready. That's OKAY.

2. **The approach that worked for us:**
   - Started with scheduled sits (not asking "do you need to go?" - just "it's potty time")
   - Used a visual schedule (pictures showing: pull down pants > sit on potty > try > wipe > flush > wash hands)
   - Immediate reward for SITTING (not just for going) - small treat the moment she sits
   - Gradually required longer sits before reward
   - Used a song/timer for sitting time (started at 1 minute, worked up to 3)

3. **For the "doesn't notice wet diaper" problem:**
   - Switch to cloth training pants (they feel uncomfortable when wet, unlike disposables that wick moisture away)
   - This helped our son FEEL the wetness and make the connection

4. **Timeline:**
   Took us 8 months of consistent effort. Not days. Not weeks. MONTHS. And that's normal for developmental delays.

5. **Don't let school pressure rush you.** A child trained too early just has more accidents. A child trained when ready stays trained.`,
        isAccepted: true,
        helpfulVotes: 48,
        notHelpfulVotes: 0,
        authorRole: Role.USER,
        comments: [
          'The cloth training pants tip is genius! The switch from diapers to cloth was what finally made our son aware.',
          'Thank you for the realistic timeline. Every article online says "3 days" which made me feel terrible.',
        ],
      },
      {
        content: `As a behavioral therapist who has potty trained many children with developmental delays, I want to add some professional guidance:

**Common mistakes I see parents make:**
1. Starting before the child is ready (biological readiness > chronological age)
2. Using punishment for accidents (NEVER do this)
3. Inconsistency - starting and stopping multiple methods
4. Not involving the therapy team

**Evidence-based approach I use:**

**Phase 1: Building awareness (2-4 weeks)**
- Change diaper in the bathroom (not bedroom)
- Have her sit on the toilet (clothed) once a day - just to normalize it
- Use dolls to demonstrate (doll "goes potty" and gets praised)
- Read potty-themed picture books

**Phase 2: Scheduled training (ongoing)**
- Take her every 60-90 minutes AND right after meals/drinks
- Use a consistent phrase: "Potty time" (not "do you need to go?")
- Sit for maximum 3 minutes
- If success: HUGE celebration (specific praise + preferred item)
- If no success: neutral response, try again next scheduled time
- If accident: calm cleanup, no reaction, change in bathroom

**Phase 3: Independence (when she starts to "get it")**
- Gradually increase time between scheduled sits
- Watch for signals (squirming, holding, pausing play)
- Prompt: "Do you need to go potty?" when signals appear

**Key tips:**
- Increase fluid intake during training (more practice opportunities!)
- Keep data - write down when she goes. You'll see patterns
- Communicate with school to use the SAME approach
- Night training comes MUCH later - focus on daytime first

Contact an ABA therapist if you need structured support. Potty training protocols are well-established in behavioral therapy.`,
        isAccepted: false,
        helpfulVotes: 36,
        notHelpfulVotes: 0,
        authorRole: Role.THERAPIST,
        comments: [],
      },
    ],
  },
  {
    title: 'Rights and accommodations for special needs children in CBSE schools?',
    content: `My son (10, learning disability - dyslexia and dysgraphia) is in a CBSE school. The school is not providing any accommodations despite our requests. They say they "don't have the resources."

His challenges:
- Can't copy from the board fast enough
- Handwriting is illegible (but he's bright and understands concepts)
- Needs extra time for tests but doesn't get it
- Teachers mark him down for untidy work
- Gets punished for not completing classwork on time

I've heard there are CBSE guidelines about accommodations but the school claims they don't apply until board exams. Is this true?

What are our legal rights? What accommodations can we demand? Has anyone successfully gotten their CBSE school to provide proper support?`,
    category: 'Rights & Advocacy',
    tags: ['cbse', 'learning-disability', 'accommodations', 'school-rights', 'dyslexia'],
    topics: ['education', 'rights-advocacy'],
    status: QuestionStatus.OPEN,
    answers: [
      {
        content: `Education rights advocate here. The school is WRONG. Here are the facts:

**Legal Framework:**

1. **Rights of Persons with Disabilities Act (RPwD), 2016:**
   - Section 16: Every child with disability has the RIGHT to free education in mainstream schools
   - Section 17: Schools MUST provide reasonable accommodations
   - This is a LAW, not a guideline

2. **CBSE Circular on Learning Disabilities (regularly updated):**
   - Accommodations apply from CLASS 1 onwards, NOT just board exams
   - The school's claim is factually incorrect

**Accommodations your child is ENTITLED to (CBSE guidelines):**
   - Extra time (usually 20 minutes per hour)
   - Use of calculator
   - Scribe/writer if needed
   - Exemption from third language
   - Alternative assessment methods
   - Computer-based tests
   - Large print question papers
   - Separate seating in a less distracting environment

**Required documentation:**
   - Disability certificate from a government hospital
   - Psycho-educational assessment from an RCI-registered psychologist
   - Letter from your doctor specifying accommodations needed

**Step-by-step action plan:**

1. **Get the disability certificate** (if you don't have one already)
2. **Write a formal letter** to the school principal requesting specific accommodations, citing RPwD Act 2016 and CBSE circulars
3. **Keep everything in writing** (email is fine, creates a paper trail)
4. **If school refuses:** File a complaint with the District Education Officer
5. **If still no action:** Approach the State Commissioner for Persons with Disabilities
6. **Nuclear option:** National Commission for Protection of Child Rights (NCPCR)

**Important:** Once you put it in writing citing the law, most schools comply quickly. They know they're legally obligated.

I can share template letters if needed. This is your child's legal right - don't let the school deny it.`,
        isAccepted: false,
        helpfulVotes: 72,
        notHelpfulVotes: 0,
        authorRole: Role.EDUCATOR,
        comments: [
          'This is incredibly helpful! We had the same issue and a single formal letter quoting the RPwD Act changed everything.',
          'Please share the template letters! So many parents need this.',
          'Adding: the CBSE helpline (1800-11-6002) can also guide you. They were very helpful when we called.',
        ],
      },
      {
        content: `Parent who went through this exact battle. My son has dysgraphia and we fought for 2 years for accommodations. Here's what finally worked:

1. **Got a comprehensive psycho-educational assessment** (cost about 8000 from a government hospital)
2. **Got the UDID disability certificate** (section for Specific Learning Disability)
3. **Wrote a formal RTI-style letter** to the school with copies of both documents
4. **CC'd the CBSE regional office** on the letter

Within 2 weeks, the school scheduled a meeting and agreed to:
- Extra time for all tests (25%)
- Laptop use for long-answer papers
- No marks deducted for handwriting/neatness
- Modified homework (quality over quantity)
- Photocopied notes instead of board copying

**The turning point** was CC'ing the CBSE office. Schools don't want attention from the board.

**Also important:** Find allies among teachers. Our class teacher was actually supportive but didn't know what accommodations were possible. We shared CBSE guidelines with her and she became our advocate within the school.

Don't give up. The law is on your side.`,
        isAccepted: false,
        helpfulVotes: 45,
        notHelpfulVotes: 0,
        authorRole: Role.USER,
        comments: [],
      },
    ],
  },
  {
    title: 'Managing sibling dynamics when one child has special needs?',
    content: `I have three kids: 12-year-old daughter (neurotypical), 8-year-old son (autism + ADHD), and 5-year-old son (neurotypical).

I feel terrible because so much of our family's time, energy, and money goes toward my middle child's therapies and needs. My daughter has started saying things like "you only care about him" and "everything is always about his autism."

My youngest seems to be developing behavioral issues too - acting out for attention.

I know they're right that things are unequal. But I don't know how to fix it when my 8-year-old genuinely needs more support. His therapy schedule alone takes up 3 days a week.

How do other families balance attention between special needs and neurotypical siblings? I'm drowning in guilt.`,
    category: 'Parenting',
    tags: ['siblings', 'family-dynamics', 'guilt', 'parenting', 'neurotypical-siblings'],
    topics: ['parenting', 'family-support'],
    status: QuestionStatus.OPEN,
    answers: [
      {
        content: `Oh mama, I feel this in my soul. I have a similar setup - 2 neurotypical kids and 1 with autism. Here's what's helped us:

**Individual time (non-negotiable):**
- Each child gets 20 minutes of one-on-one time with a parent DAILY. We set a timer. No phones. Their choice of activity.
- It doesn't sound like much, but consistent individual attention is more impactful than occasional grand gestures.
- My husband takes one kid while I take another. We rotate.

**For the older sibling:**
- We enrolled her in a sibling support group (check if your city has one - many autism centers run them)
- We explicitly say: "Your feelings are valid. It IS unfair sometimes. We see you."
- She has her own extracurricular that has NOTHING to do with her brother's condition - it's HER thing
- We share age-appropriate information about autism so she understands WHY things are the way they are

**For the younger sibling:**
- At 5, acting out is his way of communicating "I need attention too"
- We gave him a "special job" - he's the helper/buddy during therapy time, which makes him feel important
- Parallel activities during therapy (he draws while brother has OT, for example)

**Family level:**
- Monthly "sibling day" - the special needs child goes with a caregiver and the other kids get a full day with both parents
- Family meetings where everyone can share feelings
- Celebrate EVERYONE's achievements, not just therapy milestones

**The guilt:**
You will always feel guilty. That's parenthood. But the fact that you're aware and asking means you're a great mom. The unequal time IS necessary right now, and your kids will eventually understand that.`,
        isAccepted: false,
        helpfulVotes: 54,
        notHelpfulVotes: 0,
        authorRole: Role.USER,
        comments: [
          'The 20 minutes of one-on-one time changed our family dynamic completely. Such a simple but powerful idea.',
          'Sibling support groups are amazing! Our daughter\'s entire attitude changed after attending one. She realized she wasn\'t alone.',
        ],
      },
      {
        content: `As a family therapist who works with special needs families, this is one of the most common concerns I hear. You are NOT alone.

**Research tells us:**
- Siblings of special needs children can develop incredible empathy, resilience, and maturity
- BUT only if their own emotional needs are also met
- The risk factors are: feeling invisible, parentification, and unprocessed emotions

**Professional recommendations:**

1. **Validate, don't dismiss:**
   When your daughter says "you only care about him" - don't say "that's not true." Instead: "I hear you. It must feel that way sometimes. Your feelings matter to me. Let's talk about this."

2. **Age-appropriate honesty:**
   "Your brother's brain works differently. He needs extra help with things that are easy for you. That takes more of our time, but it doesn't mean we love you less."

3. **Protect their childhood:**
   - Never make siblings the caretaker
   - Don't burden them with adult-level information about diagnosis/prognosis
   - Let them be annoyed by their sibling (all siblings get annoyed!)

4. **Watch for warning signs in siblings:**
   - Perfectionism ("I need to be the easy child")
   - Suppressing their own needs
   - Academic decline
   - Social withdrawal
   - Physical complaints (headaches, stomachaches)

5. **Consider family therapy** - Even 4-6 sessions can dramatically improve family dynamics

6. **Connect with resources:**
   - "Sibshops" program (international, some chapters in India)
   - Books: "The Sibling Slam Book" for older kids
   - Online communities for siblings of special needs kids

You're not failing. You're juggling more than most parents, and asking for help is a sign of strength.`,
        isAccepted: false,
        helpfulVotes: 41,
        notHelpfulVotes: 0,
        authorRole: Role.THERAPIST,
        comments: [
          'The perfectionism point hit hard. My older daughter is straight-A student but we realized it\'s because she\'s afraid to need anything from us.',
        ],
      },
    ],
  },
  {
    title: 'How to find a good ABA therapist in Bangalore?',
    content: `We want to start ABA therapy for our 4-year-old with autism. We're based in Bangalore (Whitefield area) but finding a qualified ABA therapist seems impossible.

Issues we've faced:
- Many claim to do ABA but have no certification
- The few BCBA-certified ones are fully booked (6+ month waitlist)
- Some RBTs charge BCBA rates
- How do I verify credentials?
- Home-based vs center-based - which is better?

Budget: We can afford up to 1500/session for 3x per week.

Can anyone recommend verified ABA therapists/centers in Bangalore? Or guide me on what credentials to look for?`,
    category: 'Therapy',
    tags: ['aba', 'bangalore', 'therapist', 'autism', 'recommendations'],
    topics: ['aba-therapy', 'finding-professionals'],
    status: QuestionStatus.OPEN,
    answers: [
      {
        content: `Bangalore parent here - we went through this exact search. Here's your guide:

**Credentials to look for (in order of qualification):**
1. **BCBA** (Board Certified Behavior Analyst) - Gold standard. International certification.
2. **BCaBA** (Board Certified Assistant Behavior Analyst) - Works under BCBA supervision
3. **RBT** (Registered Behavior Technician) - Entry level. Must work under BCBA supervision
4. **CASP** (Certified Autism Specialist Professional) - Indian certification, growing recognition

**How to verify:**
- BCBA/BCaBA/RBT: Check on BACB registry (bacb.com/services/o.php?page=101135)
- Ask for certificate copies
- Ask who supervises them (RBTs MUST have BCBA supervision)

**Red flags:**
- Claims "modified ABA" without proper training
- Can't explain what reinforcement schedules they use
- Doesn't collect data every session
- No parent training component
- Won't show you their data/graphs

**Centers I know of in Bangalore:**
- **Behavior Momentum** (Koramangala) - Has BCBA on staff
- **AUMA Center** (HSR Layout) - Good reputation
- **Step Up for Down Syndrome** (Indiranagar) - Despite the name, they do ABA for autism too

**Home vs Center:**
- Home-based: Better for generalization, familiar environment, less travel
- Center-based: Better for structured learning, peer interaction, more resources
- Best approach: Combination (center 2x + home 1x per week)

**On budget:**
₹1500/session for 3x/week is reasonable for RBT-level. BCBA sessions will be ₹2500-4000. Consider:
- BCBA for assessment + program design
- RBT for ongoing sessions (cheaper)
- Monthly BCBA supervision/review

Good luck! The search is frustrating but finding the right therapist makes all the difference.`,
        isAccepted: false,
        helpfulVotes: 29,
        notHelpfulVotes: 0,
        authorRole: Role.USER,
        comments: [
          'Behavior Momentum is excellent! We\'ve been going there for 8 months with great progress.',
          'Also check out Yellow Brick Road in Koramangala. They have BCaBA supervision.',
        ],
      },
    ],
  },
];

// ========================================
// MAIN SEED FUNCTION
// ========================================

async function main() {
  console.log('🌱 Starting Q&A seed...');
  console.log('📊 This will create Questions, Answers, AnswerVotes, AnswerComments, and QuestionFollowers\n');

  try {
    await prisma.$connect();
    console.log('✅ Database connected\n');

    // =============================
    // CLEANUP EXISTING Q&A DATA
    // =============================
    console.log('🧹 Cleaning up existing Q&A data...');

    await prisma.answerVote.deleteMany();
    await prisma.answerComment.deleteMany();
    await prisma.answerEdit.deleteMany();
    await prisma.answerView.deleteMany();
    await prisma.answerRequest.deleteMany();
    await prisma.questionFollower.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.question.deleteMany();

    console.log('✅ Cleanup complete\n');

    // =============================
    // GET EXISTING USERS
    // =============================
    console.log('👥 Fetching existing users...');

    const therapists = await prisma.user.findMany({ where: { role: Role.THERAPIST } });
    const educators = await prisma.user.findMany({ where: { role: Role.EDUCATOR } });
    const parents = await prisma.user.findMany({ where: { role: Role.USER } });
    const allUsers = [...therapists, ...educators, ...parents];

    if (allUsers.length === 0) {
      throw new Error('No users found! Please run the main seed file first (pnpm db:seed).');
    }

    console.log(`✅ Found ${allUsers.length} users (${therapists.length} therapists, ${educators.length} educators, ${parents.length} parents)\n`);

    // =============================
    // CREATE QUESTIONS & ANSWERS
    // =============================
    console.log('❓ Creating questions and answers...\n');

    let questionCount = 0;
    let answerCount = 0;
    let voteCount = 0;
    let commentCount = 0;
    let followerCount = 0;

    for (const qData of QUESTIONS_DATA) {
      // Pick author - mix of parents and therapists
      const authorPool = qData.category === 'Therapy' || qData.category === 'Rights & Advocacy'
        ? [...parents, ...educators]
        : parents;
      const author = pickRandom(authorPool.length > 0 ? authorPool : allUsers, 1)[0];

      const createdAt = randomDate(45);
      const slug = slugify(qData.title) + '-' + Math.random().toString(36).substring(2, 8);

      // Create question
      const question = await prisma.question.create({
        data: {
          title: qData.title,
          content: qData.content,
          slug,
          authorId: author.id,
          category: qData.category,
          tags: qData.tags,
          topics: qData.topics,
          status: qData.status,
          viewCount: randomInt(50, 800),
          answerCount: qData.answers.length,
          followerCount: 0, // will update after adding followers
          hasAcceptedAnswer: qData.answers.some(a => a.isAccepted),
          moderationStatus: ModerationStatus.APPROVED,
          createdAt,
          lastActivityAt: new Date(createdAt.getTime() + randomInt(1, 72) * 60 * 60 * 1000),
        },
      });
      questionCount++;
      console.log(`  ✓ Question: "${question.title.substring(0, 60)}..."`);

      // Create answers
      for (const aData of qData.answers) {
        // Pick author based on role hint
        let answerAuthor;
        if (aData.authorRole === Role.THERAPIST && therapists.length > 0) {
          answerAuthor = pickRandom(therapists, 1)[0];
        } else if (aData.authorRole === Role.EDUCATOR && educators.length > 0) {
          answerAuthor = pickRandom(educators, 1)[0];
        } else {
          answerAuthor = pickRandom(parents.length > 0 ? parents : allUsers, 1)[0];
        }

        // Ensure answer author is different from question author
        if (answerAuthor.id === author.id) {
          const others = allUsers.filter(u => u.id !== author.id);
          if (others.length > 0) {
            answerAuthor = pickRandom(others, 1)[0];
          }
        }

        const answerCreatedAt = new Date(createdAt.getTime() + randomInt(1, 48) * 60 * 60 * 1000);
        const wordCount = aData.content.split(/\s+/).length;

        const answer = await prisma.answer.create({
          data: {
            questionId: question.id,
            authorId: answerAuthor.id,
            content: aData.content,
            isAccepted: aData.isAccepted,
            acceptedAt: aData.isAccepted ? new Date(answerCreatedAt.getTime() + randomInt(12, 72) * 60 * 60 * 1000) : null,
            helpfulVotes: aData.helpfulVotes,
            notHelpfulVotes: aData.notHelpfulVotes,
            wordCount,
            readTime: Math.ceil(wordCount / 200),
            qualityScore: aData.helpfulVotes > 30 ? 9.0 : aData.helpfulVotes > 15 ? 7.5 : 6.0,
            moderationStatus: ModerationStatus.APPROVED,
            createdAt: answerCreatedAt,
          },
        });
        answerCount++;

        // Update question's acceptedAnswerId if this is the accepted answer
        if (aData.isAccepted) {
          await prisma.question.update({
            where: { id: question.id },
            data: {
              acceptedAnswerId: answer.id,
              closedAt: qData.status === QuestionStatus.CLOSED ? new Date(answerCreatedAt.getTime() + randomInt(24, 96) * 60 * 60 * 1000) : null,
            },
          });
        }

        // Create answer votes
        const voterCount = Math.min(aData.helpfulVotes + aData.notHelpfulVotes, allUsers.length - 1);
        const voters = pickRandom(allUsers.filter(u => u.id !== answerAuthor.id), voterCount);

        let helpfulRemaining = aData.helpfulVotes;
        for (const voter of voters) {
          try {
            const value = helpfulRemaining > 0 ? 1 : -1;
            if (value === 1) helpfulRemaining--;

            await prisma.answerVote.create({
              data: {
                answerId: answer.id,
                userId: voter.id,
                value,
                createdAt: new Date(answerCreatedAt.getTime() + randomInt(1, 168) * 60 * 60 * 1000),
              },
            });
            voteCount++;
          } catch {
            // skip duplicate votes
          }
        }

        // Create answer comments
        for (const commentText of aData.comments) {
          const commenter = pickRandom(allUsers.filter(u => u.id !== answerAuthor.id), 1)[0];
          await prisma.answerComment.create({
            data: {
              answerId: answer.id,
              authorId: commenter.id,
              content: commentText,
              upvotes: randomInt(1, 15),
              createdAt: new Date(answerCreatedAt.getTime() + randomInt(2, 120) * 60 * 60 * 1000),
            },
          });
          commentCount++;
        }
      }

      // Create question followers
      const numFollowers = randomInt(3, 8);
      const followers = pickRandom(allUsers.filter(u => u.id !== author.id), numFollowers);

      for (const follower of followers) {
        try {
          await prisma.questionFollower.create({
            data: {
              questionId: question.id,
              userId: follower.id,
              notifyEmail: Math.random() > 0.3,
              notifyPush: Math.random() > 0.2,
              createdAt: new Date(createdAt.getTime() + randomInt(0, 72) * 60 * 60 * 1000),
            },
          });
          followerCount++;
        } catch {
          // skip duplicate followers
        }
      }

      // Update follower count
      const actualFollowers = await prisma.questionFollower.count({ where: { questionId: question.id } });
      await prisma.question.update({
        where: { id: question.id },
        data: { followerCount: actualFollowers },
      });
    }

    // =============================
    // SUMMARY
    // =============================
    console.log('\n=================================');
    console.log('🎉 Q&A SEED COMPLETED!');
    console.log('=================================');
    console.log('📊 Summary:');
    console.log(`   ❓ Questions: ${questionCount}`);
    console.log(`   💬 Answers: ${answerCount}`);
    console.log(`   👍 Answer Votes: ${voteCount}`);
    console.log(`   💭 Answer Comments: ${commentCount}`);
    console.log(`   👥 Question Followers: ${followerCount}`);
    console.log('=================================\n');

  } catch (error) {
    console.error('❌ Error seeding Q&A data:', error);
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
