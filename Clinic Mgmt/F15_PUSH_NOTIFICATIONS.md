# F15 — Push Notification Wiring
## FCM tokens · Session reminders · Booking confirmations

> **Day 14** · API + mobile (Expo)  
> Prerequisite: `firebase-admin` already in API. Phase 2 Prisma migration complete.

---

## Context

Push notifications are already partially wired in the API (Firebase Cloud Messaging configured). This feature completes the wiring: registers device tokens from the mobile app, and fires notifications on two key events — session booked and 24-hour reminder before a session.

Web push (for web-main) is out of scope for Phase 2.

---

## Prisma Model

```prisma
model DeviceToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  platform  String   // 'ios' | 'android'
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User     @relation(fields:[userId], references:[id])
}
```

---

## API — Notifications Module

### File structure
Create `apps/api/src/notifications/` if it doesn't exist already. If a notifications module exists, add to it.

`notifications.module.ts`, `notifications.controller.ts`, `notifications.service.ts`

### Endpoints

| Method | Route | Guard | Purpose |
|---|---|---|---|
| PUT | `/notifications/token` | JWT | Register or update device token |
| DELETE | `/notifications/token` | JWT | Remove device token (on logout) |

### `PUT /notifications/token` — body
```typescript
{ token: string, platform: 'ios' | 'android' }
```
Logic: upsert `DeviceToken` where `userId = request.user.id AND token = body.token`.

### `DELETE /notifications/token` — body
```typescript
{ token: string }
```
Logic: delete `DeviceToken` where `userId = request.user.id AND token = body.token`.

---

## Notification Service — Core Methods

```typescript
// Send to a single user (all their registered device tokens)
async sendToUser(userId: string, notification: {
  title: string,
  body: string,
  data?: Record<string, string>,   // deep link data
})

// Send to multiple users
async sendToUsers(userIds: string[], notification: { title, body, data? })
```

Logic: fetch all `DeviceToken` records for the userId(s) → call Firebase `messaging.sendEachForMulticast()` → remove invalid tokens from DB if FCM returns `registration-not-registered` error.

---

## Event Triggers — Wire These Into Existing Flows

### 1. Session booked
**Where:** `apps/api/src/booking/booking.service.ts` (or wherever a booking is created)  
After a booking is confirmed, emit or call:
```typescript
this.notificationsService.sendToUsers(
  [booking.patientId, booking.therapistId],
  {
    title: 'Session confirmed',
    body: `Your session on ${formattedDate} at ${formattedTime} is confirmed.`,
    data: { type: 'booking', bookingId: booking.id },
  }
)
```

### 2. 24-hour session reminder
**Where:** Use NestJS `@nestjs/schedule` (install if not present: `pnpm --filter @upllyft/api add @nestjs/schedule`)

Add a cron job that runs every hour:
```typescript
@Cron('0 * * * *')   // every hour on the hour
async sendSessionReminders() {
  // Find all bookings where:
  //   startTime is between (now + 23h) and (now + 25h)
  //   status = SCHEDULED
  //   reminderSentAt IS NULL   // add this field to Booking model to avoid duplicate sends
  // For each: send push to both parent and therapist
  // Set Booking.reminderSentAt = now()
}
```

Add `reminderSentAt DateTime?` to the `Booking` model (one-line migration).

---

## Mobile — Expo (apps/mobile)

### Register token on app launch

In the existing Expo app, add this logic to the root layout or auth context (after the user is authenticated):

```typescript
// 1. Request permission
const { status } = await Notifications.requestPermissionsAsync();
if (status !== 'granted') return;

// 2. Get FCM token
const token = await Notifications.getExpoPushTokenAsync();
// OR for native FCM: await messaging().getToken()

// 3. Register with API
await apiClient.put('/api/notifications/token', {
  token: token.data,
  platform: Platform.OS,  // 'ios' | 'android'
});
```

### Remove token on logout
```typescript
// In logout handler, before clearing auth state:
await apiClient.delete('/api/notifications/token', {
  data: { token: currentToken }
});
```

### Handle incoming notifications
Use Expo's `Notifications.addNotificationResponseReceivedListener` to handle taps:
- `data.type === 'booking'` → navigate to the booking detail screen
- `data.type === 'message'` → navigate to the messages screen (for Phase 2 F12)

---

## Acceptance Criteria

- [ ] Mobile app requests notification permission on first launch after login
- [ ] Device token is registered via `PUT /notifications/token`
- [ ] Token is removed via `DELETE /notifications/token` on logout
- [ ] Registering the same token twice does not create duplicate records (upsert)
- [ ] When a booking is confirmed, both parent and therapist receive a push notification
- [ ] Push notification body includes the session date and time
- [ ] 24-hour reminder cron job runs hourly
- [ ] Reminder is sent to both parent and therapist 24h before the session
- [ ] Reminder is not sent twice to the same booking (`reminderSentAt` guard)
- [ ] Invalid/expired tokens are removed from DB when FCM rejects them
- [ ] Tapping a booking notification on mobile navigates to the booking detail screen
