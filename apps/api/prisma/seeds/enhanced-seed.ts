// prisma/seeds/enhanced-seed.ts
import { PrismaClient, PostType, EventStatus, EventFormat, EventCategory } from '@prisma/client';

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

// ========================================
// HELPER FUNCTIONS
// ========================================

function randomDate(daysAgo: number, daysFromNow: number = 0): Date {
    const date = new Date();
    const randomDays = Math.floor(Math.random() * (daysAgo + daysFromNow)) - daysAgo;
    date.setDate(date.getDate() + randomDays);
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
// QUESTIONS DATA
// ========================================

const QUESTIONS_DATA = [
    {
        title: 'Best speech therapy apps for 3-year-old?',
        content: `My daughter is 3 years old and has a speech delay. Our therapist recommended we practice at home with apps. What apps have worked well for your kids? Looking for something engaging that won't feel like work to her.

Budget: Up to ₹5000 for a good app
Current level: About 20 words, mostly nouns`,
        category: 'Speech & Language',
        tags: ['speech-therapy', 'apps', 'toddler', 'recommendations'],
        community: 'speech-language',
    },
    {
        title: 'How to handle school refusing IEP accommodations?',
        content: `Our son (7, ADHD) has an IEP that includes extra time for tests and a quiet space for exams. The school is not providing these consistently. Teachers say they "forget" or it's "too much trouble."

What are our rights? How do we escalate this? Has anyone dealt with this successfully?`,
        category: 'Education',
        tags: ['iep', 'school', 'adhd', 'legal-rights'],
        community: 'inclusive-education',
    },
    {
        title: 'Sensory-friendly birthday party ideas?',
        content: `Planning my son's 6th birthday party. He has sensory processing disorder and gets overwhelmed easily. Want to invite his classmates but worried about meltdowns.

Looking for:
- Venue ideas (not too loud/crowded)
- Activity suggestions
- How to communicate his needs to other parents
- Duration (thinking 90 minutes max?)

Anyone done this successfully?`,
        category: 'Parenting',
        tags: ['sensory-processing', 'birthday', 'social-skills', 'party-planning'],
        community: 'sensory-processing',
    },
    {
        title: 'Transition from special school to mainstream - advice needed',
        content: `My daughter (9, Down syndrome) has been in a special school since kindergarten. She's doing really well academically and socially. We're considering transitioning her to mainstream school for 5th grade.

Questions:
1. How do we know if she's ready?
2. What support should we ask for?
3. How to prepare her for the change?
4. Red flags to watch for?

Would love to hear from parents who've done this transition.`,
        category: 'Education',
        tags: ['mainstream', 'special-school', 'transition', 'down-syndrome'],
        community: 'inclusive-education',
    },
    {
        title: 'Managing aggressive behavior in public - desperate for help',
        content: `My 5-year-old son with autism has started hitting and biting when he gets frustrated, especially in public places like malls or restaurants. It's getting worse and I'm afraid to take him anywhere.

We're doing ABA therapy but the behaviors are increasing. Therapist says it's an "extinction burst" but it's been 2 months. 

How do you handle this? I feel judged by everyone and I'm exhausted.`,
        category: 'Behavior',
        tags: ['autism', 'aggression', 'aba', 'public-behavior'],
        community: 'autism-support',
    },
    {
        title: 'Affordable OT options in Mumbai?',
        content: `Looking for occupational therapy for my 4-year-old. Current center charges ₹3000/session which is not sustainable long-term.

Are there:
- Government programs?
- NGOs offering subsidized therapy?
- Group therapy options?
- Home-based therapists?

Mumbai (Andheri area preferred). Any leads appreciated!`,
        category: 'Resources',
        tags: ['occupational-therapy', 'mumbai', 'affordable', 'recommendations'],
        community: 'sensory-processing',
    },
    {
        title: 'Potty training a 5-year-old with autism - is it too late?',
        content: `My son just turned 5 and is still in diapers. He's non-verbal and doesn't seem to understand when he needs to go. Pediatrician says to "keep trying" but offers no specific advice.

Has anyone successfully potty trained an older child with autism? What method worked? How long did it take?

Feeling discouraged but willing to try anything.`,
        category: 'Daily Living',
        tags: ['autism', 'potty-training', 'daily-skills', 'non-verbal'],
        community: 'autism-support',
    },
    {
        title: 'ADHD medication - to medicate or not?',
        content: `Pediatrician recommended medication for our 8-year-old son with ADHD. We're torn. He's struggling in school but we're worried about side effects.

Parents who chose medication:
- What changes did you see?
- Side effects?
- How long before you saw improvement?

Parents who chose NOT to medicate:
- What alternatives worked?
- How is your child managing?

Not looking for medical advice, just real experiences.`,
        category: 'Medical',
        tags: ['adhd', 'medication', 'treatment-options', 'parenting'],
        community: 'adhd-warriors',
    },
    {
        title: 'Best AAC device for non-verbal 6-year-old?',
        content: `Our daughter (6, autism, non-verbal) has been using PECS for 2 years. Speech therapist says she's ready for an AAC device. 

Considering:
- iPad with Proloquo2Go (expensive but flexible)
- Dedicated AAC device (more durable)
- Android tablet with Avaz (more affordable)

What has worked for your child? Pros/cons of each?`,
        category: 'Communication',
        tags: ['aac', 'non-verbal', 'autism', 'assistive-technology'],
        community: 'speech-language',
    },
    {
        title: 'Sibling jealousy - how to balance attention?',
        content: `My neurotypical 7-year-old daughter is acting out because her brother (5, autism) needs so much attention. She says we love him more and don't care about her.

It breaks my heart. She's right that he needs more help, but I don't want her to feel neglected.

How do you balance? What has worked for your family?`,
        category: 'Family',
        tags: ['siblings', 'family-dynamics', 'parenting', 'autism'],
        community: 'parents-circle',
    },
    {
        title: 'Dealing with grandparents who don\'t "believe" in autism',
        content: `My in-laws refuse to accept that our son has autism. They say he's just "spoiled" and we're "making excuses." They undermine our parenting and give him sugar/screen time against our rules.

This is causing major family conflict. My husband is caught in the middle.

How do you handle family members who don't accept the diagnosis?`,
        category: 'Family',
        tags: ['family-support', 'autism', 'grandparents', 'acceptance'],
        community: 'parents-circle',
    },
    {
        title: 'Weighted blanket recommendations for sensory seeking child?',
        content: `OT recommended a weighted blanket for my 6-year-old who is constantly seeking deep pressure. 

Questions:
- What weight? (He's 20kg)
- Which brand in India?
- Washable options?
- Does it actually help with sleep?

Budget: Up to ₹5000`,
        category: 'Products',
        tags: ['weighted-blanket', 'sensory-processing', 'sleep', 'recommendations'],
        community: 'sensory-processing',
    },
    {
        title: 'Teaching safety skills to child with intellectual disability',
        content: `My daughter (10, intellectual disability) doesn't understand danger. She'll go with anyone, cross roads without looking, touch hot stoves.

How do you teach safety when they don't grasp consequences? What has worked?

Terrified something will happen to her.`,
        category: 'Safety',
        tags: ['safety', 'intellectual-disability', 'daily-skills', 'parenting'],
        community: 'down-syndrome',
    },
    {
        title: 'Inclusive sports/activities in Bangalore?',
        content: `Looking for sports or activities in Bangalore that include kids with special needs. My son (8, ADHD) loves sports but regular classes don't work for him.

Interested in:
- Swimming
- Martial arts
- Dance
- Team sports

Any recommendations for inclusive programs?`,
        category: 'Activities',
        tags: ['bangalore', 'sports', 'inclusive', 'adhd'],
        community: 'adhd-warriors',
    },
    {
        title: 'How to explain disability to neurotypical siblings?',
        content: `My 5-year-old keeps asking why her brother (3, cerebral palsy) can't walk or talk like her. How do I explain in age-appropriate way?

What words do you use? Any good books or resources?`,
        category: 'Family',
        tags: ['siblings', 'cerebral-palsy', 'communication', 'parenting'],
        community: 'parents-circle',
    },
    {
        title: 'Best noise-canceling headphones for kids?',
        content: `Need noise-canceling headphones for my 7-year-old with sensory issues. He gets overwhelmed in crowded places.

Requirements:
- Comfortable for kids
- Actually blocks noise (not just music headphones)
- Durable
- Under ₹3000

What works for your child?`,
        category: 'Products',
        tags: ['sensory-processing', 'headphones', 'recommendations', 'assistive-technology'],
        community: 'sensory-processing',
    },
    {
        title: 'Regression after illness - is this normal?',
        content: `My son (4, autism) had a high fever last week. Since recovering, he's lost skills he had - stopped using words, more stimming, sleep issues.

Is this normal? Will he regain these skills? Should I be worried?

Pediatrician says "wait and see" but I'm panicking.`,
        category: 'Medical',
        tags: ['autism', 'regression', 'illness', 'development'],
        community: 'autism-support',
    },
    {
        title: 'Preparing for first dental visit with sensory issues',
        content: `My 6-year-old has severe sensory issues and we need to take him to the dentist. He won't let us brush his teeth properly at home.

Looking for:
- Sensory-friendly dentists (Delhi area)
- How to prepare him
- What to tell the dentist
- Sedation options if needed

Any success stories?`,
        category: 'Medical',
        tags: ['dental', 'sensory-processing', 'delhi', 'medical'],
        community: 'sensory-processing',
    },
    {
        title: 'School wants to hold back my child - what are our options?',
        content: `School is recommending our daughter (7, learning disability) repeat 2nd grade. They say she's "not ready" for 3rd grade academics.

We're concerned about:
- Social impact (friends moving ahead)
- Self-esteem
- Whether retention actually helps

What are our rights? Can we refuse? What are alternatives?`,
        category: 'Education',
        tags: ['school', 'learning-disability', 'retention', 'advocacy'],
        community: 'learning-differences',
    },
    {
        title: 'Managing meltdowns vs tantrums - how to tell the difference?',
        content: `I'm confused about when my son (5, autism) is having a meltdown vs a tantrum. How do you tell the difference? Do you respond differently?

Sometimes I think it's a tantrum and I ignore it, but then I feel guilty if it was actually a meltdown.

What are the signs you look for?`,
        category: 'Behavior',
        tags: ['autism', 'meltdowns', 'tantrums', 'behavior'],
        community: 'autism-support',
    },
];

// ========================================
// ANSWERS DATA (Multiple answers per question)
// ========================================

const ANSWERS_TEMPLATES = {
    helpful: [
        'We went through the same thing! Here\'s what worked for us: {specific_advice}. It took about {timeframe} but we saw real progress. Happy to answer any questions!',
        'I highly recommend {solution}. We tried several approaches and this was the game-changer. Cost us about {cost} but totally worth it.',
        'Our therapist suggested {approach} and it made a huge difference. The key is consistency - we did it {frequency} for {duration}.',
    ],
    supportive: [
        'I just want to say you\'re not alone. We\'re going through something similar and it\'s exhausting. Sending you strength! 💪',
        'This is so hard, I completely understand. Be kind to yourself - you\'re doing your best in a difficult situation.',
        'Hang in there! It does get better, even though it doesn\'t feel like it right now. You\'ve got this!',
    ],
    detailed: [
        'Let me share our detailed experience:\n\n1. {step1}\n2. {step2}\n3. {step3}\n\nWhat worked: {success}\nWhat didn\'t: {failure}\n\nHappy to elaborate on any of these!',
        'I\'ve been researching this extensively. Here\'s what I found:\n\n**Option A:** {optionA}\nPros: {prosA}\nCons: {consA}\n\n**Option B:** {optionB}\nPros: {prosB}\nCons: {consB}\n\nWe went with Option A and here\'s why: {reasoning}',
    ],
    professional: [
        'As a {profession}, I can offer some insights: {professional_advice}. However, every child is different, so please consult with your own therapist/doctor.',
        'From a professional perspective, {expert_view}. I\'d recommend {recommendation}. Feel free to DM if you want to discuss further.',
    ],
    personal_story: [
        'Oh wow, this brings back memories! When my son was that age, we dealt with the exact same thing. Here\'s our journey: {story}. Now he\'s {age} and {current_status}. There is hope!',
        'I remember feeling exactly like you do now. What helped us was {solution}. It wasn\'t easy and took {timeframe}, but looking back, I\'m glad we stuck with it.',
    ],
};

// ========================================
// EVENTS DATA
// ========================================

const EVENTS_DATA = [
    {
        title: 'Sensory-Friendly Movie Screening: Frozen 2',
        description: 'Join us for a sensory-friendly screening of Frozen 2! Lights will be dimmed (not off), sound reduced, and kids can move around freely. Bring your own snacks and sensory tools.',
        eventType: EventCategory.PEER_MEETUP,
        format: EventFormat.IN_PERSON,
        venue: 'PVR Cinemas',
        address: 'Phoenix Market City',
        city: 'Mumbai',
        state: 'Maharashtra',
        ageGroup: ['CHILD', 'TEEN'],
        languages: ['English', 'Hindi'],
        tags: ['sensory-friendly', 'movie', 'social', 'family'],
        community: 'sensory-processing',
    },
    {
        title: 'Parent Support Group: Monthly Meetup',
        description: 'Monthly in-person meetup for parents of children with autism. Share experiences, get support, and connect with other families. Coffee and snacks provided.',
        eventType: EventCategory.SUPPORT_GROUP,
        format: EventFormat.IN_PERSON,
        venue: 'Cafe Coffee Day',
        address: 'Indiranagar',
        city: 'Bangalore',
        state: 'Karnataka',
        ageGroup: ['ADULT'],
        languages: ['English', 'Kannada'],
        tags: ['support-group', 'parents', 'autism', 'community'],
        community: 'autism-support',
    },
    {
        title: 'IEP Workshop: Know Your Rights',
        description: 'Learn about IEP rights, how to prepare for meetings, and advocate effectively for your child. Led by special education attorney. Q&A session included.',
        eventType: EventCategory.WORKSHOP,
        format: EventFormat.VIRTUAL,
        platform: 'Zoom',
        meetingLink: 'https://zoom.us/j/example123',
        ageGroup: ['ADULT'],
        languages: ['English'],
        tags: ['iep', 'workshop', 'education', 'advocacy'],
        community: 'inclusive-education',
    },
    {
        title: 'Adaptive Swimming Class for Kids',
        description: 'Specialized swimming instruction for children with special needs. Small group (max 6 kids), experienced instructors, sensory-friendly environment.',
        eventType: EventCategory.SPORTS_ACTIVITY,
        format: EventFormat.IN_PERSON,
        venue: 'Aqua Sports Complex',
        address: 'Sector 18',
        city: 'Delhi',
        state: 'Delhi',
        ageGroup: ['CHILD'],
        languages: ['English', 'Hindi'],
        tags: ['swimming', 'adaptive-sports', 'recreation', 'inclusive'],
        community: 'parents-circle',
    },
    {
        title: 'AAC Device Demo Day',
        description: 'Try out different AAC devices and apps! Representatives from major AAC companies will be present. Speech therapists available for consultations.',
        eventType: EventCategory.WORKSHOP,
        format: EventFormat.IN_PERSON,
        venue: 'Special Needs Resource Center',
        address: 'Koramangala',
        city: 'Bangalore',
        state: 'Karnataka',
        ageGroup: ['CHILD', 'TEEN', 'ADULT'],
        languages: ['English', 'Kannada'],
        tags: ['aac', 'assistive-technology', 'demo', 'speech-therapy'],
        community: 'speech-language',
    },
    {
        title: 'Sibling Support Workshop',
        description: 'Workshop for siblings of children with special needs. Age-appropriate activities, discussion groups, and coping strategies. Ages 6-12.',
        eventType: EventCategory.WORKSHOP,
        format: EventFormat.IN_PERSON,
        venue: 'Community Center',
        address: 'Bandra West',
        city: 'Mumbai',
        state: 'Maharashtra',
        ageGroup: ['CHILD'],
        languages: ['English', 'Hindi'],
        tags: ['siblings', 'support', 'workshop', 'family'],
        community: 'parents-circle',
    },
    {
        title: 'Inclusive Art Class: All Abilities Welcome',
        description: 'Monthly art class designed for all abilities. Adaptive materials, patient instructors, sensory-friendly space. No experience needed!',
        eventType: EventCategory.ART_THERAPY,
        format: EventFormat.IN_PERSON,
        venue: 'Art Studio 360',
        address: 'Whitefield',
        city: 'Bangalore',
        state: 'Karnataka',
        ageGroup: ['CHILD', 'TEEN'],
        languages: ['English'],
        tags: ['art', 'inclusive', 'creative', 'sensory-friendly'],
        community: 'sensory-processing',
    },
    {
        title: 'Transition Planning Webinar: School to Work',
        description: 'Online webinar about transition planning for teens with special needs. Topics: vocational training, supported employment, life skills.',
        eventType: EventCategory.WEBINAR,
        format: EventFormat.VIRTUAL,
        platform: 'Google Meet',
        meetingLink: 'https://meet.google.com/example',
        ageGroup: ['TEEN', 'ADULT'],
        languages: ['English'],
        tags: ['transition', 'employment', 'vocational', 'teens'],
        community: 'inclusive-education',
    },
    {
        title: 'Sensory Play Group (Ages 2-5)',
        description: 'Weekly sensory play group for toddlers and preschoolers. Structured activities, free play, parent networking. OT-supervised.',
        eventType: EventCategory.SENSORY_PLAY,
        format: EventFormat.IN_PERSON,
        venue: 'Little Steps Therapy Center',
        address: 'Jayanagar',
        city: 'Bangalore',
        state: 'Karnataka',
        ageGroup: ['TODDLER', 'CHILD'],
        languages: ['English', 'Kannada'],
        tags: ['sensory-play', 'toddlers', 'playgroup', 'ot'],
        community: 'sensory-processing',
    },
    {
        title: 'ADHD Medication Q&A with Pediatrician',
        description: 'Virtual Q&A session with pediatric psychiatrist specializing in ADHD. Ask questions about medication, side effects, alternatives. Anonymous questions welcome.',
        eventType: EventCategory.CONSULTATION,
        format: EventFormat.VIRTUAL,
        platform: 'Zoom',
        meetingLink: 'https://zoom.us/j/adhd-qa',
        ageGroup: ['ADULT'],
        languages: ['English', 'Hindi'],
        tags: ['adhd', 'medication', 'doctor', 'qa'],
        community: 'adhd-warriors',
    },
];

// ========================================
// MAIN SEED FUNCTION
// ========================================

async function main() {
    console.log('🌱 Starting Enhanced Seed...\n');

    // Fetch existing users
    console.log('📥 Fetching existing users...');
    const allUsers = await prisma.user.findMany({
        select: { id: true, name: true, role: true },
    });

    const parents = allUsers.filter(u => u.role === 'USER');
    const therapists = allUsers.filter(u => u.role === 'THERAPIST');
    const educators = allUsers.filter(u => u.role === 'EDUCATOR');
    const moderators = allUsers.filter(u => u.role === 'MODERATOR');

    console.log(`Found ${allUsers.length} users (${parents.length} parents, ${therapists.length} therapists, ${educators.length} educators)`);

    // Fetch existing communities
    console.log('📥 Fetching existing communities...');
    const communities = await prisma.community.findMany({
        select: { id: true, slug: true, name: true },
    });
    console.log(`Found ${communities.length} communities\n`);

    // ========================================
    // CREATE QUESTIONS WITH ANSWERS
    // ========================================

    console.log('❓ Creating questions with answers...');
    let questionCount = 0;
    let answerCount = 0;
    let voteCount = 0;
    let commentCount = 0;

    for (const questionData of QUESTIONS_DATA) {
        const community = communities.find(c => c.slug === questionData.community);
        if (!community) {
            console.log(`⚠️  Community ${questionData.community} not found, skipping question`);
            continue;
        }

        // Pick random parent as question author
        const author = pickRandom(parents, 1)[0];
        if (!author) continue;

        // Create the question post
        const question = await prisma.post.create({
            data: {
                title: questionData.title,
                content: questionData.content,
                type: PostType.QUESTION,
                category: questionData.category,
                tags: questionData.tags,
                authorId: author.id,
                communityId: community.id,
                createdAt: randomDate(30, 0), // Created in last 30 days
            },
        });

        questionCount++;
        console.log(`  ✓ Created question: "${question.title.substring(0, 50)}..."`);

        // Create 3-6 answers for each question
        const numAnswers = randomInt(3, 6);
        const answerAuthors = pickRandom([...parents, ...therapists, ...educators], numAnswers);

        let chosenAnswerId: string | null = null;
        let bestAnswerIndex = randomInt(0, numAnswers - 1);

        for (let i = 0; i < numAnswers; i++) {
            const answerAuthor = answerAuthors[i];
            if (!answerAuthor) continue;

            // Generate answer content based on author role
            let answerContent = '';
            if (answerAuthor.role === 'THERAPIST') {
                answerContent = `As a therapist, I can offer some professional insights on this. ${questionData.content.substring(0, 100)}... [Professional advice would go here]`;
            } else if (answerAuthor.role === 'EDUCATOR') {
                answerContent = `From an educator's perspective, I've seen this situation many times. Here's what typically works: [Educational guidance]`;
            } else {
                answerContent = `I went through something similar with my child! Here's what helped us: [Personal experience and advice]`;
            }

            const answer = await prisma.comment.create({
                data: {
                    content: answerContent,
                    postId: question.id,
                    authorId: answerAuthor.id,
                    createdAt: randomDate(25, 0),
                },
            });

            answerCount++;

            // Mark one answer as chosen (best answer)
            if (i === bestAnswerIndex) {
                chosenAnswerId = answer.id;
            }

            // Add votes to answers (more votes for better answers)
            const numVotes = i === bestAnswerIndex ? randomInt(5, 15) : randomInt(0, 8);
            const voters = pickRandom(allUsers, numVotes);

            for (const voter of voters) {
                try {
                    await prisma.vote.create({
                        data: {
                            userId: voter.id,
                            commentId: answer.id,
                            targetId: answer.id,
                            targetType: 'COMMENT',
                            value: 1, // Upvote
                        },
                    });
                    voteCount++;
                } catch (error) {
                    // Skip if duplicate vote
                }
            }

            // Add some replies to answers
            if (Math.random() > 0.6) {
                const replier = pickRandom(parents, 1)[0];
                if (replier) {
                    await prisma.comment.create({
                        data: {
                            content: 'Thank you so much for this advice! This is really helpful.',
                            postId: question.id,
                            authorId: replier.id,
                            parentId: answer.id,
                            createdAt: randomDate(20, 0),
                        },
                    });
                    commentCount++;
                }
            }
        }

        // Add votes to the question itself
        const questionVoters = pickRandom(allUsers, randomInt(2, 10));
        for (const voter of questionVoters) {
            try {
                await prisma.vote.create({
                    data: {
                        userId: voter.id,
                        postId: question.id,
                        targetId: question.id,
                        targetType: 'POST',
                        value: 1,
                    },
                });
                voteCount++;
            } catch (error) {
                // Skip if duplicate
            }
        }

        // Add some bookmarks
        const bookmarkers = pickRandom(parents, randomInt(1, 5));
        for (const bookmarker of bookmarkers) {
            try {
                await prisma.bookmark.create({
                    data: {
                        userId: bookmarker.id,
                        postId: question.id,
                    },
                });
            } catch (error) {
                // Skip if duplicate
            }
        }
    }

    console.log(`\n✅ Created ${questionCount} questions with ${answerCount} answers`);
    console.log(`✅ Added ${voteCount} votes and ${commentCount} comment replies\n`);

    // ========================================
    // CREATE EVENTS
    // ========================================

    console.log('📅 Creating events...');
    let eventCount = 0;

    for (const eventData of EVENTS_DATA) {
        const community = communities.find(c => c.slug === eventData.community);
        if (!community) {
            console.log(`⚠️  Community ${eventData.community} not found, skipping event`);
            continue;
        }

        // Pick random organizer (could be therapist, educator, or active parent)
        const organizer = pickRandom([...therapists, ...educators, ...parents.slice(0, 3)], 1)[0];
        if (!organizer) continue;

        // Generate event dates (some past, some future)
        const isPastEvent = Math.random() > 0.5;
        const startDate = isPastEvent ? randomDate(30, 0) : randomDate(0, 60);
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + randomInt(1, 3));

        const event = await prisma.event.create({
            data: {
                title: eventData.title,
                description: eventData.description,
                eventType: eventData.eventType,
                format: eventData.format,
                startDate,
                endDate,
                timezone: 'Asia/Kolkata',
                venue: eventData.venue,
                address: eventData.address,
                city: eventData.city,
                state: eventData.state,
                platform: eventData.platform,
                meetingLink: eventData.meetingLink,
                ageGroup: eventData.ageGroup,
                languages: eventData.languages,
                tags: eventData.tags,
                isPublic: true,
                status: EventStatus.PUBLISHED,
                createdBy: organizer.id,
                communityId: community.id,
            },
        });

        eventCount++;
        console.log(`  ✓ Created event: "${event.title}"`);

        // Add event interests (RSVPs)
        const interested = pickRandom(parents, randomInt(5, 15));
        for (const user of interested) {
            try {
                await prisma.eventInterest.create({
                    data: {
                        userId: user.id,
                        eventId: event.id,
                        status: pickRandom(['GOING', 'INTERESTED', 'MAYBE'], 1)[0] as any,
                    },
                });
            } catch (error) {
                // Skip if duplicate
            }
        }
    }

    console.log(`\n✅ Created ${eventCount} events with RSVPs\n`);

    // ========================================
    // SUMMARY
    // ========================================

    console.log('📊 Seed Summary:');
    console.log(`   Questions: ${questionCount}`);
    console.log(`   Answers: ${answerCount}`);
    console.log(`   Votes: ${voteCount}`);
    console.log(`   Comment Replies: ${commentCount}`);
    console.log(`   Events: ${eventCount}`);
    console.log('\n✅ Enhanced seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
