/**
 * Starter Help Center content. GENERATED from docs/faq-content.md by
 * scripts/generate-faq-seed.mjs; edit the doc and re-run the script, not this file.
 *
 * The API inserts it once, when faq_categories is empty (FaqService.onModuleInit); after
 * that the admin console (/admin/faq) owns the content. Items whose answer still has a
 * [bracketed] placeholder start unpublished.
 */

export type FaqAudience = 'PARENT' | 'THERAPIST' | 'FACILITY' | 'ALL';

export interface FaqSeedCategory {
  slug: string;
  name: string;
  audience: FaqAudience;
  items: Array<{ slug: string; question: string; answer: string; published: boolean }>;
}

export const FAQ_SEED: FaqSeedCategory[] = [
  {
    "slug": "getting-started",
    "name": "Getting started",
    "audience": "PARENT",
    "items": [
      {
        "slug": "what-is-upllyft",
        "question": "What is Upllyft?",
        "answer": "Upllyft is a community and care platform for families of neurodivergent children. You can track your child's development, take a developmental screening, find therapists and clinics, use guided activities and worksheets, and connect with other parents. Mira, our AI guide, is there to help along the way.",
        "published": true
      },
      {
        "slug": "is-upllyft-free-for-parents",
        "question": "Is Upllyft free for parents?",
        "answer": "**[Confirm pricing.]** Creating an account, the community, screening and Mira are free. Therapy sessions are paid to the therapist or clinic.",
        "published": false
      },
      {
        "slug": "how-do-i-add-my-child",
        "question": "How do I add my child?",
        "answer": "After you sign up, onboarding asks for your child's name, date of birth and any concerns you have. You can add more children or edit details later from your profile.",
        "published": true
      },
      {
        "slug": "which-countries-is-upllyft-available-in",
        "question": "Which countries is Upllyft available in?",
        "answer": "We currently serve families in India, the UAE and Saudi Arabia. Therapist search shows providers in your country.",
        "published": true
      }
    ]
  },
  {
    "slug": "mira",
    "name": "Mira, your AI guide",
    "audience": "PARENT",
    "items": [
      {
        "slug": "who-is-mira",
        "question": "Who is Mira?",
        "answer": "Mira (Mindful Intelligent Response Assistant) is Upllyft's AI guide for parents. Mira can explain screening results, suggest activities to try at home, point you to resources, and suggest therapists who match your child's needs.",
        "published": true
      },
      {
        "slug": "mira-diagnosis",
        "question": "Can Mira diagnose my child?",
        "answer": "No. Mira gives general guidance and information, not medical advice or a diagnosis. For concerns about your child's development, please speak to a qualified professional.",
        "published": true
      },
      {
        "slug": "are-my-conversations-with-mira-private",
        "question": "Are my conversations with Mira private?",
        "answer": "Your conversations are saved to your account so you can come back to them, and they are not shared with other users. **[Confirm wording against the privacy policy, including whether chats are sent to AI providers.]**",
        "published": false
      }
    ]
  },
  {
    "slug": "screening",
    "name": "Screening",
    "audience": "PARENT",
    "items": [
      {
        "slug": "what-is-the-developmental-screening",
        "question": "What is the developmental screening?",
        "answer": "A short questionnaire about your child's everyday skills in areas such as speech and language, social-emotional development, fine and gross motor skills, learning, daily living and sensory processing. It shows which areas may need a closer look.",
        "published": true
      },
      {
        "slug": "screening-diagnosis",
        "question": "Is the screening a diagnosis?",
        "answer": "No. It is a screening tool, not a diagnostic instrument. Results help you decide whether to talk to a professional, and which kind of specialist might help.",
        "published": true
      },
      {
        "slug": "what-do-i-do-after-i-see-my-results",
        "question": "What do I do after I see my results?",
        "answer": "Your results page explains each area in plain language. From there you can ask Mira about the results, open matching activities in Resources, or find a therapist who works in that area.",
        "published": true
      }
    ]
  },
  {
    "slug": "moments",
    "name": "Moments and progress",
    "audience": "PARENT",
    "items": [
      {
        "slug": "moments",
        "question": "What are Moments?",
        "answer": "Moments are short notes about your child's day: something that went well, something that was difficult, a change you noticed, or a first. Type one, or use your device's dictation to speak it. Mira suggests a category and the development areas it relates to, and you can change them before saving.\n\nMoments are text only; photos and videos aren't supported yet.",
        "published": true
      },
      {
        "slug": "moments-privacy",
        "question": "Who can see my Moments?",
        "answer": "Only you. Nurseries, clinics and therapists can't read your Moments, even if you've shared your child with them. Your child's name is never sent to the AI when Mira reads a moment.",
        "published": true
      },
      {
        "slug": "what-do-insights-and-progress-show",
        "question": "What do Insights and Progress show?",
        "answer": "**Insights** are patterns Mira notices across your Moments, shown only when at least two moments point the same way, and never more than three at a time. They are observations, not a diagnosis; choose **Keep watching** or **Dismiss** on each one.\n\n**Progress** shows each development area over the last six weeks, with a simple status such as Improving, Steady or Watch, based on your Moments and your child's latest screening.",
        "published": true
      }
    ]
  },
  {
    "slug": "finding-care",
    "name": "Finding care",
    "audience": "PARENT",
    "items": [
      {
        "slug": "how-do-i-find-a-therapist",
        "question": "How do I find a therapist?",
        "answer": "Go to **Find care**. You can search by name, city or specialty, filter by independent therapists or clinics, and see who best fits your child's screening results or concerns.",
        "published": true
      },
      {
        "slug": "booking-coming-soon",
        "question": "Why does the booking button say \"Coming soon\"?",
        "answer": "We're onboarding therapists now and online booking isn't open yet. You can save profiles you like, and we'll let you know when booking opens.",
        "published": true
      },
      {
        "slug": "directory-listing",
        "question": "What is a \"Directory listing\"?",
        "answer": "Directory listings are therapists we list so you can find them, but who aren't on Upllyft booking. Press **Show contact** to see their phone number and email and get in touch with them directly. Upllyft is not involved in arranging or paying for those sessions.",
        "published": true
      },
      {
        "slug": "verified-tick",
        "question": "What does the blue tick mean?",
        "answer": "The therapist's credentials have been checked by Upllyft or by their clinic. Therapists without the tick are listed but haven't completed verification yet.",
        "published": true
      },
      {
        "slug": "save-and-compare",
        "question": "How do I save and compare therapists?",
        "answer": "Press the heart on any therapist or clinic to save it; your list is under **Booking → Saved**. To compare, select up to three providers in Find care and press **Compare selected** to see their ratings, focus areas, languages, experience and prices side by side.",
        "published": true
      },
      {
        "slug": "care-waitlist",
        "question": "What if there's no therapist for my child's needs yet?",
        "answer": "If Find care has no providers for your child's needs in your country, press **Notify me when a provider joins**. When a therapist is verified or a clinic is approved in your country, we'll send you a notification, by email or push too if your notification settings allow it.",
        "published": true
      }
    ]
  },
  {
    "slug": "resources-community",
    "name": "Resources and community",
    "audience": "PARENT",
    "items": [
      {
        "slug": "what-s-in-resources",
        "question": "What's in Resources?",
        "answer": "A library of activities, worksheets and guides, organised by development area (communication, social-emotional, daily living, fine and gross motor, learning, sensory, behaviour). Your journey suggests what to try next based on your child's needs.",
        "published": true
      },
      {
        "slug": "assigned-activities",
        "question": "My therapist assigned activities. Where are they?",
        "answer": "Open **Resources**: activities your therapist assigned appear in your journey, marked as assigned, with any goal or target date they set. Log each attempt as you go.\n\nYou can also share your child's progress with that therapist for 30 days, 90 days or all time, with or without your notes, and stop sharing at any time.",
        "published": true
      },
      {
        "slug": "what-is-the-community",
        "question": "What is the Community?",
        "answer": "A space to ask questions, share experiences and support other parents. Please be kind, protect your child's privacy, and remember that community posts are not professional advice.",
        "published": true
      }
    ]
  },
  {
    "slug": "privacy",
    "name": "Privacy and sharing your child's information",
    "audience": "PARENT",
    "items": [
      {
        "slug": "who-can-see-my-child-s-information",
        "question": "Who can see my child's information?",
        "answer": "Only you, plus any nursery, school or clinic you give access to. Each of them sees only what you allowed, and only until you withdraw it.",
        "published": true
      },
      {
        "slug": "facility-added-my-child",
        "question": "A nursery, school or clinic added my child. What do I do?",
        "answer": "You'll get an email with a link, valid for 30 days. Open it to confirm that this is your child; you can see who is asking before you sign in. If it isn't your child, report it from the same page, no account needed.\n\nConfirming your child doesn't share anything yet: giving them access is a separate step.",
        "published": true
      },
      {
        "slug": "manage-access",
        "question": "How do I give or withdraw a nursery's or clinic's access?",
        "answer": "On your dashboard, press **Who can see**, followed by your child's name. Each nursery, school or clinic is listed with what it's asking for, such as recording observations or completing a screening, and you can **Allow** or **Withdraw** each one. Withdrawing takes effect straight away.\n\nNurseries and schools never see a diagnosis.",
        "published": true
      },
      {
        "slug": "clinic-consent-form",
        "question": "A clinic asked me to sign a consent form. What is it?",
        "answer": "Before a clinic starts therapy with your child, the therapist sends a consent form to sign electronically. You'll get a notification with a link to it. Session notes can't be recorded until it's signed.",
        "published": true
      },
      {
        "slug": "where-is-my-data-stored",
        "question": "Where is my data stored?",
        "answer": "Your data is stored securely in the European Union. **[Confirm with your hosting/legal setup; the database runs in Supabase's Stockholm region.]**",
        "published": false
      },
      {
        "slug": "how-do-i-delete-my-account",
        "question": "How do I delete my account?",
        "answer": "Go to **Settings → Delete account**. **[Confirm what gets deleted, and how long it takes.]**",
        "published": false
      }
    ]
  },
  {
    "slug": "therapists",
    "name": "For therapists",
    "audience": "THERAPIST",
    "items": [
      {
        "slug": "how-do-i-join-upllyft-as-a-therapist",
        "question": "How do I join Upllyft as a therapist?",
        "answer": "Register as a therapist and complete your profile, including your specialties, experience, languages and licence details. Our team reviews new professional accounts before they are verified.",
        "published": true
      },
      {
        "slug": "how-does-verification-work",
        "question": "How does verification work?",
        "answer": "Our team reviews your account and licence details, or your clinic verifies you if you work for one. Once approved, your profile shows the verified tick. Unverified therapists can be listed in Find care but can't take bookings. **[Add the typical review time and how therapists send documents.]**",
        "published": false
      },
      {
        "slug": "licence-expiry",
        "question": "What happens when my licence expires?",
        "answer": "We check licence expiry dates every night. Once yours passes, your profile is hidden from Find care and you can't be added to new cases until your renewed licence has been verified again by your clinic or by Upllyft. Keep your licence expiry date up to date in your profile.",
        "published": true
      },
      {
        "slug": "therapist-directory-listing",
        "question": "I was listed in the directory. What does that mean?",
        "answer": "Your public details (name, specialty, location, licence number) appear in Find care so families can contact you directly. You won't receive bookings through Upllyft. To get a full, bookable profile, **[explain how they claim/activate their account, e.g. contact support]**.",
        "published": false
      },
      {
        "slug": "will-parents-see-my-phone-number-and-email",
        "question": "Will parents see my phone number and email?",
        "answer": "Only for directory listings, and only when a signed-in parent presses **Show contact**. Bookable therapists' contact details stay private; families reach them through booking.",
        "published": true
      },
      {
        "slug": "join-a-clinic",
        "question": "How do I join a clinic?",
        "answer": "A clinic adds you, or invites you by email. Sign in or register with the invited email address, then accept under **Invitations** within seven days; the clinic's admin then approves you.\n\nOnce you're part of a clinic, your profile shows \"At\" followed by the clinic's name, and the clinic manages your services, schedule and location.",
        "published": true
      },
      {
        "slug": "can-i-work-with-a-clinic-and-independently",
        "question": "Can I work with a clinic and independently?",
        "answer": "**[Confirm the policy.]** You can be linked to a clinic, which approves the connection. Clinic-linked profiles show \"At [clinic name]\".",
        "published": false
      },
      {
        "slug": "own-practice",
        "question": "Can I set up my own practice?",
        "answer": "Yes. Press **Set up my practice** on your dashboard to create your own clinic, with you as its owner. You can run one practice, and not while you're on the staff of another clinic. Your practice is approved once your own licence has been verified.",
        "published": true
      }
    ]
  },
  {
    "slug": "therapist-booking",
    "name": "Your booking profile",
    "audience": "THERAPIST",
    "items": [
      {
        "slug": "when-can-i-take-bookings",
        "question": "When can I take bookings?",
        "answer": "Online booking is opening soon. Once it opens, you'll need everything in \"What do I need before families can book me?\".",
        "published": true
      },
      {
        "slug": "bookable-checklist",
        "question": "What do I need before families can book me?",
        "answer": "- A verified profile and licence\n- At least one active session type with a price\n- Weekly availability\n- **Accepting bookings** turned on\n\nIf you belong to a clinic, the clinic must also be approved and visible to families.",
        "published": true
      },
      {
        "slug": "session-types",
        "question": "How do I set up session types and prices?",
        "answer": "Go to **Booking → Pricing**. Each session type has a name, description, length in minutes and price, in your region's currency. If you work for a clinic, types the clinic set up for you are marked \"Set by clinic admin\"; you can still edit them.",
        "published": true
      },
      {
        "slug": "availability",
        "question": "How do I set my availability and time off?",
        "answer": "Go to **Booking → Bookings & Availability** to set your weekly hours, and block individual dates for leave. Clinic therapists' schedules come from their clinic, and changes you make sync back to it.",
        "published": true
      },
      {
        "slug": "pause-bookings",
        "question": "How do I pause new bookings?",
        "answer": "Turn off **Accepting bookings** in your profile. Families can't book new sessions with you while it's off; sessions already booked are not affected.",
        "published": true
      }
    ]
  },
  {
    "slug": "cases",
    "name": "Cases and session notes",
    "audience": "THERAPIST",
    "items": [
      {
        "slug": "what-is-a-case",
        "question": "What is a case?",
        "answer": "A case is one child's clinical file: sessions, goals, milestones, assessments, documents, consents and discharge, in one place. Create one from **Cases → New Case**. You can open a case for a child whose parent has booked with you, once your licence is verified. If you work for a clinic, the clinic must be approved.\n\nThe therapist who creates a case is its primary therapist.",
        "published": true
      },
      {
        "slug": "case-access",
        "question": "Who can see a case?",
        "answer": "The primary therapist has full control. Colleagues you add can view the case, and edit it if you give them permission. Only the primary therapist can transfer the case to someone else. **[Confirm what the child's parent can see in a case, then describe it here.]**",
        "published": false
      },
      {
        "slug": "note-templates",
        "question": "Which note formats and templates are there?",
        "answer": "Session notes can be SOAP (the default), DAP, narrative or a custom format. There are built-in assessment and note templates for speech and language, occupational therapy, ABA, psychology and special education (including IEPs), plus intake, MDT, goal plan, progress review and discharge forms. Custom templates aren't available yet.",
        "published": true
      },
      {
        "slug": "signed-notes",
        "question": "Can I edit a note after signing it?",
        "answer": "No. Notes stay as drafts until you sign them; a signed note is locked. The parent must have signed the therapy consent form before you can record session notes. AI tools can draft a summary or tidy up your notes; check everything before signing.",
        "published": true
      }
    ]
  },
  {
    "slug": "facilities",
    "name": "For clinics, nurseries and schools",
    "audience": "FACILITY",
    "items": [
      {
        "slug": "how-do-i-set-up-my-clinic-or-nursery",
        "question": "How do I set up my clinic or nursery?",
        "answer": "**Clinics:** a therapist can set up their own practice with **Set up my practice** on their dashboard, or our team can create a clinic for you. **Nurseries and schools** are set up by our team: contact us, and make sure the person who will run it already has an Upllyft account.",
        "published": true
      },
      {
        "slug": "clinic-approval",
        "question": "How does approval work for clinics?",
        "answer": "New clinics are reviewed by our team before they're approved. Families only see a clinic once it's approved and set to public, and cases can only be opened in an approved clinic. A solo practice is approved automatically once the owner's licence is verified.",
        "published": true
      },
      {
        "slug": "facility-types",
        "question": "What's the difference between a clinic and a nursery or school account?",
        "answer": "**Clinics** can open cases, record diagnoses and clinical notes, run screenings, record observations and bill families.\n\n**Nurseries and schools** can run screenings, record observations and raise concerns. They can't open cases, diagnose or write clinical notes, and they never see a child's diagnosis.",
        "published": true
      },
      {
        "slug": "how-do-children-get-added-to-my-facility",
        "question": "How do children get added to my facility?",
        "answer": "You add the child to your roster, and the parent gets an email to confirm the child and give consent. A nursery or school can see nothing until the parent allows it, and only what they allowed; the parent can withdraw access at any time.",
        "published": true
      },
      {
        "slug": "facility-staff",
        "question": "How do I add staff and choose their role?",
        "answer": "Owners and admins add staff by email under **Staff**; each person needs an Upllyft account first. Roles include:\n- **Owner:** full control\n- **Admin:** roster, rooms and staff\n- **Inclusion lead:** enrols children, raises concerns and runs reviews and support plans\n- **Keyworker:** records observations for the children in their room\n\nEvery facility keeps at least one owner, and you can't remove someone who is still a child's keyworker.",
        "published": true
      },
      {
        "slug": "can-i-upload-my-therapists-in-bulk",
        "question": "Can I upload my therapists in bulk?",
        "answer": "Yes. Organisation admins can import therapists from a CSV or Excel file (up to 500 rows, 2 MB). Name and email are required; phone, title, department, specialisations, languages, experience, country, city, licence number and bio are optional. You see a preview before anything is created. New therapists get an email to set their password, valid for 14 days; therapists already on Upllyft are linked to your organisation instead.",
        "published": true
      }
    ]
  },
  {
    "slug": "facility-running",
    "name": "Running your clinic",
    "audience": "FACILITY",
    "items": [
      {
        "slug": "clinic-dashboard",
        "question": "Where do I manage my clinic day to day?",
        "answer": "Use the **Clinic** dashboard for patients, therapists, today's appointments, outcomes, reports and revenue. Your organisation workspace (**My Organisation**) is where you manage members, families, communities, events and therapist imports.",
        "published": true
      },
      {
        "slug": "tracking-outcomes",
        "question": "What do Tracking and Outcomes show?",
        "answer": "**Tracking** is today's board: each appointment moves through waiting, in session and completed (or cancelled / no-show), with check-in and start times recorded. A session can't start while its payment is still pending.\n\n**Outcomes** shows active patients, sessions attended this month against last month, goal progress and screening improvement, with a view per patient.",
        "published": true
      },
      {
        "slug": "intake-link",
        "question": "Can families send us their details before the first visit?",
        "answer": "Yes. An organisation admin can create an intake link from **My Organisation → Clients**. Families fill it in without signing in: their concerns, goals and consents. It's saved as a draft for your clinician to review. Each link lasts 14 days, and creating a new one replaces the old one.",
        "published": true
      }
    ]
  },
  {
    "slug": "account",
    "name": "Account and notifications",
    "audience": "ALL",
    "items": [
      {
        "slug": "i-forgot-my-password",
        "question": "I forgot my password.",
        "answer": "Use **Forgot password** on the login page and we'll email you a reset link. If you signed up with Google, use **Continue with Google** instead.",
        "published": true
      },
      {
        "slug": "why-am-i-not-getting-emails",
        "question": "Why am I not getting emails?",
        "answer": "Check your spam folder and your notification settings. Urgent updates are sent straight away; everything else is collected into a daily or weekly summary, depending on your preference.",
        "published": true
      },
      {
        "slug": "how-do-i-change-how-often-i-get-emails",
        "question": "How do I change how often I get emails?",
        "answer": "Go to **Settings → Notifications** and choose daily or weekly summaries.",
        "published": true
      },
      {
        "slug": "contact-support",
        "question": "How do I contact support?",
        "answer": "Email **[support address]** or use **[contact form/WhatsApp]**. We usually reply within **[time frame]**.",
        "published": false
      }
    ]
  }
];
