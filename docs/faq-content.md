# Help Center FAQ: starter content

Source content for the Help Center (`/help`). `apps/api/src/faq/faq-seed.ts` is generated
from this file (`node apps/api/scripts/generate-faq-seed.mjs`); the API inserts it when the
`faq_categories` table is empty. After that the admin console (`/admin/faq`) is the source
of truth, and this file is not re-read.

Format: each `## Name <!-- slug audience -->` is a category (audience PARENT, THERAPIST,
FACILITY or ALL). Each `**N. Question?** <!-- slug -->` starts an item; the slug comment is
optional (it is made from the question otherwise) and is the `/help#slug` anchor. Items
whose answer has a **[bracketed]** placeholder are seeded **unpublished**.

Before publishing drafts, have 7, 18 and 19 checked against the privacy policy and terms
(legal claims); update 12 and 27 when booking opens.

Known product gaps the answers deliberately avoid promising (see the review notes in the
PR): SOS/crisis support, therapist document upload, leaving the care waitlist, adding a
co-parent, time-limited consent, custom clinical templates, sharing Moments insights.

---

## Getting started <!-- getting-started PARENT -->

**1. What is Upllyft?**
Upllyft is a community and care platform for families of neurodivergent children. You can track your child's development, take a developmental screening, find therapists and clinics, use guided activities and worksheets, and connect with other parents. Mira, our AI guide, is there to help along the way.

**2. Is Upllyft free for parents?**
**[Confirm pricing.]** Creating an account, the community, screening and Mira are free. Therapy sessions are paid to the therapist or clinic.

**3. How do I add my child?**
After you sign up, onboarding asks for your child's name, date of birth and any concerns you have. You can add more children or edit details later from your profile.

**4. Which countries is Upllyft available in?**
We currently serve families in India, the UAE and Saudi Arabia. Therapist search shows providers in your country.

## Mira, your AI guide <!-- mira PARENT -->

**5. Who is Mira?**
Mira (Mindful Intelligent Response Assistant) is Upllyft's AI guide for parents. Mira can explain screening results, suggest activities to try at home, point you to resources, and suggest therapists who match your child's needs.

**6. Can Mira diagnose my child?** <!-- mira-diagnosis -->
No. Mira gives general guidance and information, not medical advice or a diagnosis. For concerns about your child's development, please speak to a qualified professional.

**7. Are my conversations with Mira private?**
Your conversations are saved to your account so you can come back to them, and they are not shared with other users. **[Confirm wording against the privacy policy, including whether chats are sent to AI providers.]**

## Screening <!-- screening PARENT -->

**8. What is the developmental screening?**
A short questionnaire about your child's everyday skills in areas such as speech and language, social-emotional development, fine and gross motor skills, learning, daily living and sensory processing. It shows which areas may need a closer look.

**9. Is the screening a diagnosis?** <!-- screening-diagnosis -->
No. It is a screening tool, not a diagnostic instrument. Results help you decide whether to talk to a professional, and which kind of specialist might help.

**10. What do I do after I see my results?**
Your results page explains each area in plain language. From there you can ask Mira about the results, open matching activities in Resources, or find a therapist who works in that area.

## Moments and progress <!-- moments PARENT -->

**11. What are Moments?** <!-- moments -->
Moments are short notes about your child's day: something that went well, something that was difficult, a change you noticed, or a first. Type one, or use your device's dictation to speak it. Mira suggests a category and the development areas it relates to, and you can change them before saving.

Moments are text only; photos and videos aren't supported yet.

**12. Who can see my Moments?** <!-- moments-privacy -->
Only you. Nurseries, clinics and therapists can't read your Moments, even if you've shared your child with them. Your child's name is never sent to the AI when Mira reads a moment.

**13. What do Insights and Progress show?**
**Insights** are patterns Mira notices across your Moments, shown only when at least two moments point the same way, and never more than three at a time. They are observations, not a diagnosis; choose **Keep watching** or **Dismiss** on each one.

**Progress** shows each development area over the last six weeks, with a simple status such as Improving, Steady or Watch, based on your Moments and your child's latest screening.

## Finding care <!-- finding-care PARENT -->

**14. How do I find a therapist?**
Go to **Find care**. You can search by name, city or specialty, filter by independent therapists or clinics, and see who best fits your child's screening results or concerns.

**15. Why does the booking button say "Coming soon"?** <!-- booking-coming-soon -->
We're onboarding therapists now and online booking isn't open yet. You can save profiles you like, and we'll let you know when booking opens.

**16. What is a "Directory listing"?** <!-- directory-listing -->
Directory listings are therapists we list so you can find them, but who aren't on Upllyft booking. Press **Show contact** to see their phone number and email and get in touch with them directly. Upllyft is not involved in arranging or paying for those sessions.

**17. What does the blue tick mean?** <!-- verified-tick -->
The therapist's credentials have been checked by Upllyft or by their clinic. Therapists without the tick are listed but haven't completed verification yet.

**18. How do I save and compare therapists?** <!-- save-and-compare -->
Press the heart on any therapist or clinic to save it; your list is under **Booking → Saved**. To compare, select up to three providers in Find care and press **Compare selected** to see their ratings, focus areas, languages, experience and prices side by side.

**19. What if there's no therapist for my child's needs yet?** <!-- care-waitlist -->
If Find care has no providers for your child's needs in your country, press **Notify me when a provider joins**. When a therapist is verified or a clinic is approved in your country, we'll send you a notification, by email or push too if your notification settings allow it.

## Resources and community <!-- resources-community PARENT -->

**20. What's in Resources?**
A library of activities, worksheets and guides, organised by development area (communication, social-emotional, daily living, fine and gross motor, learning, sensory, behaviour). Your journey suggests what to try next based on your child's needs.

**21. My therapist assigned activities. Where are they?** <!-- assigned-activities -->
Open **Resources**: activities your therapist assigned appear in your journey, marked as assigned, with any goal or target date they set. Log each attempt as you go.

You can also share your child's progress with that therapist for 30 days, 90 days or all time, with or without your notes, and stop sharing at any time.

**22. What is the Community?**
A space to ask questions, share experiences and support other parents. Please be kind, protect your child's privacy, and remember that community posts are not professional advice.

## Privacy and sharing your child's information <!-- privacy PARENT -->

**23. Who can see my child's information?**
Only you, plus any nursery, school or clinic you give access to. Each of them sees only what you allowed, and only until you withdraw it.

**24. A nursery, school or clinic added my child. What do I do?** <!-- facility-added-my-child -->
You'll get an email with a link, valid for 30 days. Open it to confirm that this is your child; you can see who is asking before you sign in. If it isn't your child, report it from the same page, no account needed.

Confirming your child doesn't share anything yet: giving them access is a separate step.

**25. How do I give or withdraw a nursery's or clinic's access?** <!-- manage-access -->
On your dashboard, press **Who can see**, followed by your child's name. Each nursery, school or clinic is listed with what it's asking for, such as recording observations or completing a screening, and you can **Allow** or **Withdraw** each one. Withdrawing takes effect straight away.

Nurseries and schools never see a diagnosis.

**26. A clinic asked me to sign a consent form. What is it?** <!-- clinic-consent-form -->
Before a clinic starts therapy with your child, the therapist sends a consent form to sign electronically. You'll get a notification with a link to it. Session notes can't be recorded until it's signed.

**27. Where is my data stored?**
Your data is stored securely in the European Union. **[Confirm with your hosting/legal setup; the database runs in Supabase's Stockholm region.]**

**28. How do I delete my account?**
Go to **Settings → Delete account**. **[Confirm what gets deleted, and how long it takes.]**

---

## For therapists <!-- therapists THERAPIST -->

**29. How do I join Upllyft as a therapist?**
Register as a therapist and complete your profile, including your specialties, experience, languages and licence details. Our team reviews new professional accounts before they are verified.

**30. How does verification work?**
Our team reviews your account and licence details, or your clinic verifies you if you work for one. Once approved, your profile shows the verified tick. Unverified therapists can be listed in Find care but can't take bookings. **[Add the typical review time and how therapists send documents.]**

**31. What happens when my licence expires?** <!-- licence-expiry -->
We check licence expiry dates every night. Once yours passes, your profile is hidden from Find care and you can't be added to new cases until your renewed licence has been verified again by your clinic or by Upllyft. Keep your licence expiry date up to date in your profile.

**32. I was listed in the directory. What does that mean?** <!-- therapist-directory-listing -->
Your public details (name, specialty, location, licence number) appear in Find care so families can contact you directly. You won't receive bookings through Upllyft. To get a full, bookable profile, **[explain how they claim/activate their account, e.g. contact support]**.

**33. Will parents see my phone number and email?**
Only for directory listings, and only when a signed-in parent presses **Show contact**. Bookable therapists' contact details stay private; families reach them through booking.

**34. How do I join a clinic?** <!-- join-a-clinic -->
A clinic adds you, or invites you by email. Sign in or register with the invited email address, then accept under **Invitations** within seven days; the clinic's admin then approves you.

Once you're part of a clinic, your profile shows "At" followed by the clinic's name, and the clinic manages your services, schedule and location.

**35. Can I work with a clinic and independently?**
**[Confirm the policy.]** You can be linked to a clinic, which approves the connection. Clinic-linked profiles show "At [clinic name]".

**36. Can I set up my own practice?** <!-- own-practice -->
Yes. Press **Set up my practice** on your dashboard to create your own clinic, with you as its owner. You can run one practice, and not while you're on the staff of another clinic. Your practice is approved once your own licence has been verified.

## Your booking profile <!-- therapist-booking THERAPIST -->

**37. When can I take bookings?**
Online booking is opening soon. Once it opens, you'll need everything in "What do I need before families can book me?".

**38. What do I need before families can book me?** <!-- bookable-checklist -->
- A verified profile and licence
- At least one active session type with a price
- Weekly availability
- **Accepting bookings** turned on

If you belong to a clinic, the clinic must also be approved and visible to families.

**39. How do I set up session types and prices?** <!-- session-types -->
Go to **Booking → Pricing**. Each session type has a name, description, length in minutes and price, in your region's currency. If you work for a clinic, types the clinic set up for you are marked "Set by clinic admin"; you can still edit them.

**40. How do I set my availability and time off?** <!-- availability -->
Go to **Booking → Bookings & Availability** to set your weekly hours, and block individual dates for leave. Clinic therapists' schedules come from their clinic, and changes you make sync back to it.

**41. How do I pause new bookings?** <!-- pause-bookings -->
Turn off **Accepting bookings** in your profile. Families can't book new sessions with you while it's off; sessions already booked are not affected.

## Cases and session notes <!-- cases THERAPIST -->

**42. What is a case?** <!-- what-is-a-case -->
A case is one child's clinical file: sessions, goals, milestones, assessments, documents, consents and discharge, in one place. Create one from **Cases → New Case**. You can open a case for a child whose parent has booked with you, once your licence is verified. If you work for a clinic, the clinic must be approved.

The therapist who creates a case is its primary therapist.

**43. Who can see a case?** <!-- case-access -->
The primary therapist has full control. Colleagues you add can view the case, and edit it if you give them permission. Only the primary therapist can transfer the case to someone else. **[Confirm what the child's parent can see in a case, then describe it here.]**

**44. Which note formats and templates are there?** <!-- note-templates -->
Session notes can be SOAP (the default), DAP, narrative or a custom format. There are built-in assessment and note templates for speech and language, occupational therapy, ABA, psychology and special education (including IEPs), plus intake, MDT, goal plan, progress review and discharge forms. Custom templates aren't available yet.

**45. Can I edit a note after signing it?** <!-- signed-notes -->
No. Notes stay as drafts until you sign them; a signed note is locked. The parent must have signed the therapy consent form before you can record session notes. AI tools can draft a summary or tidy up your notes; check everything before signing.

---

## For clinics, nurseries and schools <!-- facilities FACILITY -->

**46. How do I set up my clinic or nursery?**
**Clinics:** a therapist can set up their own practice with **Set up my practice** on their dashboard, or our team can create a clinic for you. **Nurseries and schools** are set up by our team: contact us, and make sure the person who will run it already has an Upllyft account.

**47. How does approval work for clinics?** <!-- clinic-approval -->
New clinics are reviewed by our team before they're approved. Families only see a clinic once it's approved and set to public, and cases can only be opened in an approved clinic. A solo practice is approved automatically once the owner's licence is verified.

**48. What's the difference between a clinic and a nursery or school account?** <!-- facility-types -->
**Clinics** can open cases, record diagnoses and clinical notes, run screenings, record observations and bill families.

**Nurseries and schools** can run screenings, record observations and raise concerns. They can't open cases, diagnose or write clinical notes, and they never see a child's diagnosis.

**49. How do children get added to my facility?**
You add the child to your roster, and the parent gets an email to confirm the child and give consent. A nursery or school can see nothing until the parent allows it, and only what they allowed; the parent can withdraw access at any time.

**50. How do I add staff and choose their role?** <!-- facility-staff -->
Owners and admins add staff by email under **Staff**; each person needs an Upllyft account first. Roles include:
- **Owner:** full control
- **Admin:** roster, rooms and staff
- **Inclusion lead:** enrols children, raises concerns and runs reviews and support plans
- **Keyworker:** records observations for the children in their room

Every facility keeps at least one owner, and you can't remove someone who is still a child's keyworker.

**51. Can I upload my therapists in bulk?**
Yes. Organisation admins can import therapists from a CSV or Excel file (up to 500 rows, 2 MB). Name and email are required; phone, title, department, specialisations, languages, experience, country, city, licence number and bio are optional. You see a preview before anything is created. New therapists get an email to set their password, valid for 14 days; therapists already on Upllyft are linked to your organisation instead.

## Running your clinic <!-- facility-running FACILITY -->

**52. Where do I manage my clinic day to day?** <!-- clinic-dashboard -->
Use the **Clinic** dashboard for patients, therapists, today's appointments, outcomes, reports and revenue. Your organisation workspace (**My Organisation**) is where you manage members, families, communities, events and therapist imports.

**53. What do Tracking and Outcomes show?** <!-- tracking-outcomes -->
**Tracking** is today's board: each appointment moves through waiting, in session and completed (or cancelled / no-show), with check-in and start times recorded. A session can't start while its payment is still pending.

**Outcomes** shows active patients, sessions attended this month against last month, goal progress and screening improvement, with a view per patient.

**54. Can families send us their details before the first visit?** <!-- intake-link -->
Yes. An organisation admin can create an intake link from **My Organisation → Clients**. Families fill it in without signing in: their concerns, goals and consents. It's saved as a draft for your clinician to review. Each link lasts 14 days, and creating a new one replaces the old one.

---

## Account and notifications <!-- account ALL -->

**55. I forgot my password.**
Use **Forgot password** on the login page and we'll email you a reset link. If you signed up with Google, use **Continue with Google** instead.

**56. Why am I not getting emails?**
Check your spam folder and your notification settings. Urgent updates are sent straight away; everything else is collected into a daily or weekly summary, depending on your preference.

**57. How do I change how often I get emails?**
Go to **Settings → Notifications** and choose daily or weekly summaries.

**58. How do I contact support?** <!-- contact-support -->
Email **[support address]** or use **[contact form/WhatsApp]**. We usually reply within **[time frame]**.
