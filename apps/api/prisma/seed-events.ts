// prisma/seed-events.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedEvents() {
  console.log('🌱 Starting event seeding...');

  try {
    const communities = await prisma.community.findMany({
      include: {
        members: {
          where: { role: { in: ['OWNER', 'ADMIN', 'MODERATOR'] } },
          take: 1
        }
      }
    });

    if (communities.length === 0) {
      console.log('❌ No communities found.');
      return;
    }

    console.log(`Found ${communities.length} communities`);
    let totalEventsCreated = 0;

    const eventTitles = [
      'Understanding Autism Workshop',
      'ADHD Support Group Meeting',
      'Parent Training Session',
      'Sensory Integration Workshop',
      'IEP Planning Seminar',
      'Behavioral Strategies Training',
      'Community Resource Fair',
      'Special Needs Awareness Event',
      'Therapy Techniques Workshop',
      'Family Support Circle'
    ];

    for (const community of communities) {
      if (community.members.length === 0) {
        console.log(`⚠️ Skipping ${community.name} - no admin found`);
        continue;
      }

      const creator = community.members[0];
      
      // Create 3-5 events per community
      const eventCount = 3 + Math.floor(Math.random() * 3);
      
      for (let i = 0; i < eventCount; i++) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + (7 * (i + 1))); // 7, 14, 21 days from now
        startDate.setHours(10 + i * 2, 0, 0, 0); // Different times
        
        const endDate = new Date(startDate);
        endDate.setHours(startDate.getHours() + 2); // 2 hour event

        // Randomly select event properties
        const eventCategories = ['WORKSHOP', 'SUPPORT_GROUP', 'WEBINAR', 'TRAINING', 'CONSULTATION', 'AWARENESS', 'FUNDRAISING', 'SOCIAL'];
        const eventFormats = ['IN_PERSON', 'VIRTUAL', 'HYBRID'];
        
        const eventCategory = eventCategories[Math.floor(Math.random() * eventCategories.length)];
        const format = eventFormats[Math.floor(Math.random() * eventFormats.length)];
        const title = eventTitles[Math.floor(Math.random() * eventTitles.length)];

        const eventData: any = {
          communityId: community.id,
          createdBy: creator.userId,
          title: `${title} - ${community.name}`,
          description: `Join us for this ${eventCategory.toLowerCase().replace('_', ' ')} event. This session is designed to provide support, education, and resources for our community members. Whether you're a parent, caregiver, or professional, you'll find valuable insights and connections.`,
          
          // Required enum fields based on your schema
          eventType: eventCategory as any,
          format: format as any,
          status: 'PUBLISHED',
          
          // Dates
          startDate: startDate,
          endDate: endDate,
          
          // Location fields based on format
          venue: format !== 'VIRTUAL' ? 'Community Center Hall' : undefined,
          city: format !== 'VIRTUAL' ? 'Mumbai' : undefined,
          state: format !== 'VIRTUAL' ? 'Maharashtra' : undefined,
          
          // Virtual fields
          platform: format !== 'IN_PERSON' ? 'Zoom' : undefined,
          meetingLink: format !== 'IN_PERSON' ? `https://zoom.us/j/${Math.random().toString(36).substring(7)}` : undefined,
          
          // Other fields
          maxAttendees: 50 + Math.floor(Math.random() * 50),
          isPublic: !community.isPrivate,
          
          // View and interest counts for demo
          viewCount: Math.floor(Math.random() * 200),
          interestedCount: Math.floor(Math.random() * 30),
        };

        try {
          const event = await prisma.event.create({ data: eventData });
          console.log(`  ✓ Created: ${title} (${format})`);
          totalEventsCreated++;
        } catch (error: any) {
          console.error(`  ✗ Failed to create event: ${error.message.split('\n')[0]}`);
        }
      }
      
      console.log(`✅ Created events for ${community.name}`);
    }

    console.log(`\n🎉 Successfully created ${totalEventsCreated} events`);

    // Create EventInterest entries
    console.log('\n🌱 Creating event interests...');
    
    try {
      const events = await prisma.event.findMany({ take: 15 });
      const users = await prisma.user.findMany({ take: 20 });
      
      let interestsCreated = 0;
      
      for (const event of events) {
        const interestedCount = 2 + Math.floor(Math.random() * 8);
        const selectedUsers = users.sort(() => 0.5 - Math.random()).slice(0, Math.min(interestedCount, users.length));
        
        for (const user of selectedUsers) {
          try {
            await prisma.eventInterest.create({
              data: {
                eventId: event.id,
                userId: user.id,
                status: Math.random() > 0.5 ? 'INTERESTED' : 'GOING',
              }
            });
            interestsCreated++;
          } catch (error) {
            // Skip if already exists
          }
        }
      }
      
      console.log(`✅ Created ${interestsCreated} event interests`);
    } catch (error) {
      console.log('⚠️ Could not create event interests');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedEvents()
  .then(() => {
    console.log('✅ Event seeding completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });