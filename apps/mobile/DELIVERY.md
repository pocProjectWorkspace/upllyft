# SafeHaven Mobile — Feature Delivery Plan

## Current State

**Done:** Auth (login, signup, biometric, Google OAuth), Community feed + detail + comments/voting/bookmarking
**Mock/placeholder:** Home dashboard, Tools, Marketplace, Events, Profile, Settings

---

## Phase 1: Home Dashboard (Live Data)

**Goal:** Replace mock data on home screen with real API calls.

| # | File | Work |
|---|------|------|
| 1 | `lib/types/home.ts` | Types: FeedPreviewItem, UserStats |
| 2 | `lib/api/home.ts` | `getRecentPosts(limit)` → `GET /posts?limit=3&sort=recent`, `getUserStats()` → `GET /profile` |
| 3 | `hooks/use-home.ts` | Fetch recent posts + user stats on mount |
| 4 | `app/(main)/(home)/index.tsx` | REWRITE — real feed preview, real stats, notification bell badge, SOS → crisis screen |

---

## Phase 2: Profile & Edit Profile

**Goal:** Live profile data, edit profile form, profile stats from API.

| # | File | Work |
|---|------|------|
| 1 | `lib/types/profile.ts` | Full UserProfile type matching Prisma User + UserProfile models |
| 2 | `lib/api/profile.ts` | `getProfile()`, `updateProfile(data)`, `getUserStats(userId)` |
| 3 | `hooks/use-profile.ts` | Fetch profile, handle updates |
| 4 | `app/(main)/(profile)/index.tsx` | REWRITE — real stats (post count, connections, bookmarks), profile image |
| 5 | `app/(main)/(profile)/edit.tsx` | NEW — edit form: name, bio, specializations, organization, profile image upload (Supabase) |

---

## Phase 3: Bookmarks

**Goal:** Bookmarks list screen with real saved posts.

| # | File | Work |
|---|------|------|
| 1 | `lib/api/bookmarks.ts` | `getBookmarks(page, limit)` → `GET /bookmarks` |
| 2 | `hooks/use-bookmarks.ts` | Paginated bookmarks fetch, remove bookmark |
| 3 | `app/(main)/(profile)/bookmarks.tsx` | NEW — FlatList of bookmarked posts using PostCard, pull-to-refresh, empty state |

---

## Phase 4: Post Creation

**Goal:** Create new community posts from the mobile app.

| # | File | Work |
|---|------|------|
| 1 | `lib/api/community.ts` | Add `createPost({ title, content, type, category, tags })` → `POST /posts` |
| 2 | `components/community/TypePicker.tsx` | NEW — modal/bottom-sheet post type selector |
| 3 | `app/(main)/(community)/create.tsx` | NEW — form: title, content (multiline), type picker, category, tags input, submit |
| 4 | `app/(main)/(community)/index.tsx` | Wire FAB to navigate to create screen |

---

## Phase 5: Events (Live Data)

**Goal:** Events listing, detail, and interest/RSVP from API.

| # | File | Work |
|---|------|------|
| 1 | `lib/types/events.ts` | Event, EventInterest types |
| 2 | `lib/api/events.ts` | `getEvents(page, filters)`, `getEvent(id)`, `toggleInterest(id)` → `GET /events`, `GET /events/:id`, `POST /events/:id/interest` |
| 3 | `hooks/use-events.ts` | Paginated events, filters (upcoming/past/virtual) |
| 4 | `app/(main)/(home)/events.tsx` | REWRITE — real data, filter pills, pull-to-refresh, pagination |
| 5 | `app/(main)/(home)/event-detail.tsx` | NEW — full event detail: description, date/time, location/virtual link, attendee count, RSVP button |

---

## Phase 6: Marketplace (Live Data)

**Goal:** Browse therapists/providers, view profiles, book sessions.

| # | File | Work |
|---|------|------|
| 1 | `lib/types/marketplace.ts` | TherapistProfile, SessionType, Booking, Rating types |
| 2 | `lib/api/marketplace.ts` | `getTherapists(filters)`, `getTherapist(id)`, `getAvailability(id, date)`, `createBooking(...)`, `getMyBookings()` |
| 3 | `hooks/use-therapists.ts` | Search, filter (specialty, rating, availability), pagination |
| 4 | `app/(main)/(marketplace)/index.tsx` | REWRITE — real provider list with search, specialty filters, rating |
| 5 | `app/(main)/(marketplace)/[id].tsx` | NEW — therapist profile: bio, specialties, ratings/reviews, session types, "Book" CTA |
| 6 | `app/(main)/(marketplace)/book.tsx` | NEW — date picker → available slots → confirm → payment (Stripe) |
| 7 | `app/(main)/(marketplace)/bookings.tsx` | NEW — my bookings list (upcoming/past), cancel/reschedule |
| 8 | `app/(main)/(marketplace)/booking-detail.tsx` | NEW — booking detail: status, therapist info, date/time, session link, rating after completion |

---

## Phase 7: Tools — Assessments & AI Insights

**Goal:** Real screening questionnaires and AI clinical insights.

| # | File | Work |
|---|------|------|
| 1 | `lib/types/assessments.ts` | Assessment, Question, AssessmentResponse, AssessmentReport types |
| 2 | `lib/types/ai.ts` | ClinicalConversation, ClinicalMessage, ClinicalPlan types |
| 3 | `lib/api/assessments.ts` | `getAssessments()`, `getAssessment(id)`, `submitResponse(id, answers)`, `getReport(id)` |
| 4 | `lib/api/ai.ts` | `getConversations()`, `createConversation()`, `sendMessage(convId, content)`, `getPlans()` |
| 5 | `hooks/use-assessments.ts` | List, take questionnaire, view report |
| 6 | `hooks/use-ai-chat.ts` | Conversation state, streaming messages |
| 7 | `app/(main)/(tools)/index.tsx` | REWRITE — real assessment list + AI tools list from API |
| 8 | `app/(main)/(tools)/assessment.tsx` | NEW — step-through questionnaire (one question at a time), submit, show report |
| 9 | `app/(main)/(tools)/assessment-report.tsx` | NEW — display scored results, recommendations, share option |
| 10 | `app/(main)/(tools)/ai-chat.tsx` | NEW — chat interface with AI agent, message bubbles, clinical plan generation |

---

## Phase 8: Notifications & Real-Time

**Goal:** Push notifications (Firebase), in-app notification center, real-time updates.

| # | File | Work |
|---|------|------|
| 1 | `lib/types/notifications.ts` | Notification type |
| 2 | `lib/api/notifications.ts` | `getNotifications(page)`, `markRead(id)`, `markAllRead()`, `registerFcmToken(token)` |
| 3 | `lib/push-notifications.ts` | NEW — Firebase Cloud Messaging setup, permission request, token registration |
| 4 | `lib/socket.ts` | NEW — Socket.IO client, connect on auth, listen for notification/post/comment events |
| 5 | `hooks/use-notifications.ts` | Notifications list, unread count, mark read |
| 6 | `contexts/notification-context.tsx` | NEW — global unread count, socket listeners, push handling |
| 7 | `app/(main)/(home)/notifications.tsx` | NEW — notification list screen grouped by date, tap to navigate |
| 8 | `app/(main)/(home)/index.tsx` | Add unread badge to notification bell icon |

---

## Phase 9: Search & Discovery

**Goal:** Global search across posts, users, events, providers.

| # | File | Work |
|---|------|------|
| 1 | `lib/api/search.ts` | `search(query, type?)` → `GET /search` |
| 2 | `hooks/use-search.ts` | Debounced search, result tabs |
| 3 | `app/(main)/(home)/search.tsx` | NEW — search bar, segmented results (Posts, People, Events, Providers), recent searches |
| 4 | `app/(main)/(home)/index.tsx` | Add search icon in header → navigates to search screen |

---

## Phase 10: Crisis Support

**Goal:** SOS flow, crisis resources, hotline contacts.

| # | File | Work |
|---|------|------|
| 1 | `lib/types/crisis.ts` | CrisisResource, CrisisIncident types |
| 2 | `lib/api/crisis.ts` | `getCrisisResources()`, `reportIncident(data)` |
| 3 | `app/(main)/(home)/crisis.tsx` | NEW — emergency contacts (tap to call), crisis resources list, report incident form |
| 4 | `app/(main)/(home)/index.tsx` | Wire SOS button → crisis screen |

---

## Phase 11: Settings & Preferences

**Goal:** Functional settings screens backed by API.

| # | File | Work |
|---|------|------|
| 1 | `lib/api/preferences.ts` | `getPreferences()`, `updatePreferences(data)` → `GET/PATCH /user/preferences` |
| 2 | `app/(main)/(profile)/settings.tsx` | REWRITE — functional toggle switches for notification settings, privacy settings |
| 3 | `app/(main)/(profile)/notification-settings.tsx` | NEW — granular notification toggles (push, email, in-app per category) |
| 4 | `app/(main)/(profile)/privacy.tsx` | NEW — profile visibility, search visibility, data export |
| 5 | `app/(main)/(profile)/account.tsx` | NEW — change password, change email, delete account |
| 6 | `app/(main)/(profile)/billing.tsx` | NEW — subscription status, payment methods (Stripe), invoices |

---

## Phase 12: Q&A System

**Goal:** Dedicated Q&A with answers, voting, accepted answers.

| # | File | Work |
|---|------|------|
| 1 | `lib/types/questions.ts` | Question, Answer types |
| 2 | `lib/api/questions.ts` | `getQuestions()`, `getQuestion(id)`, `createQuestion()`, `createAnswer()`, `voteAnswer()`, `acceptAnswer()` |
| 3 | `hooks/use-questions.ts` | List + detail + answer hooks |
| 4 | `components/community/AnswerItem.tsx` | NEW — answer with vote, accept mark, author |
| 5 | `app/(main)/(community)/questions.tsx` | NEW — Q&A list (could be a filter on community feed or separate screen) |
| 6 | `app/(main)/(community)/question-detail.tsx` | NEW — question + answers list + answer input |
| 7 | `app/(main)/(community)/ask.tsx` | NEW — ask question form |

---

## Phase 13: Resources & Communities

**Goal:** Educational resources library, community groups.

| # | File | Work |
|---|------|------|
| 1 | `lib/api/resources.ts` | `getResources(filters)` → `GET /resources` |
| 2 | `lib/api/communities.ts` | `getCommunities()`, `getCommunity(id)`, `joinCommunity()`, `leaveCommunity()` |
| 3 | `app/(main)/(home)/resources.tsx` | REWRITE — resource listing with category filters, search, open in browser |
| 4 | `app/(main)/(community)/communities.tsx` | NEW — browse/join community groups |
| 5 | `app/(main)/(community)/community-detail.tsx` | NEW — community page: description, members, posts filtered to community, events |

---

## Phase 14: User Profiles & Networking

**Goal:** View other users' profiles, follow/connect.

| # | File | Work |
|---|------|------|
| 1 | `lib/api/users.ts` | `getUser(id)`, `followUser(id)`, `unfollowUser(id)` |
| 2 | `app/(main)/(profile)/[id].tsx` | NEW — public profile: bio, posts, stats, follow button |
| 3 | Components | Wire author name taps throughout app to navigate to `/(main)/(profile)/[userId]` |

---

## Phase 15: Therapist Dashboard (Professional Users)

**Goal:** Therapists manage their marketplace presence from mobile.

| # | File | Work |
|---|------|------|
| 1 | `lib/api/therapist.ts` | `getTherapistDashboard()`, `updateAvailability()`, `updatePricing()`, `getTherapistBookings()` |
| 2 | `app/(main)/(profile)/therapist-dashboard.tsx` | NEW — earnings, upcoming sessions, rating summary |
| 3 | `app/(main)/(profile)/availability.tsx` | NEW — weekly schedule editor, exceptions |
| 4 | `app/(main)/(profile)/pricing.tsx` | NEW — session types & pricing management |

---

## Priority Matrix

| Phase | Feature | Depends On | Impact |
|-------|---------|------------|--------|
| 1 | Home (live data) | — | High — first screen users see |
| 2 | Profile & Edit | — | High — core identity |
| 3 | Bookmarks | Phase 2 | Medium — already wired in community |
| 4 | Post Creation | — | High — completes community loop |
| 5 | Events | — | Medium — active feature on web |
| 6 | Marketplace | — | High — revenue feature |
| 7 | Tools/AI | — | High — differentiating feature |
| 8 | Notifications | — | High — engagement driver |
| 9 | Search | — | Medium — discovery |
| 10 | Crisis Support | — | High — safety critical |
| 11 | Settings | — | Medium — expected functionality |
| 12 | Q&A | Phase 4 | Low — subset of community |
| 13 | Resources/Communities | — | Medium — content discovery |
| 14 | User Profiles | Phase 2 | Medium — networking |
| 15 | Therapist Dashboard | Phase 6 | Low — professional-only |
