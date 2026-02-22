# F12 — Parent ↔ Therapist Secure Messaging
## Conversation threads · Real-time with Socket.IO · Unread badge

> **Days 8–10** · web-main + API  
> Prerequisite: Phase 2 Prisma migration complete. Socket.IO already installed in API.

---

## Context

Parents need a direct, private channel to their assigned therapist — for quick questions between sessions, sharing observations, and following up on the session plan. This is a 1:1 messaging system between a parent (USER role) and their assigned therapist (THERAPIST role). Clinic admins can read all conversations. Group messaging is out of scope for Phase 2.

---

## Prisma Models

```prisma
model Conversation {
  id           String    @id @default(cuid())
  parentId     String    // USER role
  therapistId  String    // THERAPIST role
  caseId       String?   // optional link to the Case
  lastMessageAt DateTime?
  createdAt    DateTime  @default(now())

  parent       User      @relation("ParentConversations",    fields:[parentId],    references:[id])
  therapist    User      @relation("TherapistConversations", fields:[therapistId], references:[id])
  messages     Message[]

  @@unique([parentId, therapistId])  // one conversation per pair
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  senderId       String
  body           String       @db.Text
  readAt         DateTime?
  createdAt      DateTime     @default(now())

  conversation   Conversation @relation(fields:[conversationId], references:[id])
  sender         User         @relation("SentMessages", fields:[senderId], references:[id])
}
```

---

## API Module — `apps/api/src/messaging/`

Create: `messaging.module.ts`, `messaging.controller.ts`, `messaging.service.ts`, `messaging.gateway.ts`  
Register in `app.module.ts`

### REST Endpoints

| Method | Route | Guard | Purpose |
|---|---|---|---|
| POST | `/messaging/conversations` | JWT | Create or get existing conversation |
| GET | `/messaging/conversations` | JWT | List all conversations for current user |
| GET | `/messaging/conversations/:id/messages` | JWT (participant) | Paginated message history |
| POST | `/messaging/conversations/:id/messages` | JWT (participant) | Send a message |
| PATCH | `/messaging/conversations/:id/read` | JWT (participant) | Mark all messages as read |

### `POST /messaging/conversations` — body + response
```typescript
// body
{ recipientId: string }   // the other person in the conversation

// response — finds existing or creates new
{ conversationId: string, isNew: boolean }
```

### `GET /messaging/conversations` — response
```typescript
[{
  id: string,
  otherParty: { id, name, avatarUrl, role },
  lastMessage: { body: string, createdAt: string } | null,
  unreadCount: number,   // messages where readAt IS NULL and senderId != currentUser
}]
```

### `GET /messaging/conversations/:id/messages`
- Verify caller is `parentId` or `therapistId` of the conversation (throw 403 otherwise)
- Query params: `page`, `limit` (default 30)
- Return messages ordered `createdAt DESC` (newest first, client reverses for display)

### `POST /messaging/conversations/:id/messages` — body
```typescript
{ body: string }
```
After creating: emit Socket.IO event `message:new` to room `conversation:{conversationId}`  
Update `Conversation.lastMessageAt`

### `PATCH /messaging/conversations/:id/read`
Set `readAt = now()` on all messages in the conversation where `senderId != currentUser.id` and `readAt IS NULL`

### Socket.IO Gateway — `messaging.gateway.ts`

```typescript
// On connect: join room for each of the user's conversation IDs
// socket.join(`conversation:${id}`)

// Emit to room on new message:
// this.server.to(`conversation:${conversationId}`).emit('message:new', message)

// Also emit 'conversations:updated' to both participants for unread count refresh
```

---

## web-main UI

### Where it lives
New route: `/messages` in web-main  
Add a **Messages** icon to the main nav with an unread count badge

### What to build

**`/messages` — conversation list page**
- Left panel: list of conversations sorted by `lastMessageAt` DESC
- Each row: avatar + name of other party, last message preview, unread count badge (teal pill), timestamp
- Clicking a conversation → opens the message thread on the right (split view on desktop, full screen on mobile)
- Empty state: "You have no messages yet"

**Message thread (right panel or full page on mobile)**
- Header: other party's name + avatar + online indicator (optional)
- Message bubbles: right-aligned for sent, left-aligned for received
- Teal bubbles for sent messages, gray for received — consistent with brand
- Load older messages on scroll up (pagination)
- Text input + send button at the bottom
- Mark as read when the conversation is opened (`PATCH .../read`)

**New conversation trigger**  
From the parent's therapist profile (web-booking) or from the case detail (web-cases):  
Add a **"Message Therapist"** button → `POST /messaging/conversations` → navigate to `/messages?conversationId=xxx`

**Unread count badge**  
Global unread count = sum of `unreadCount` across all conversations  
Fetch on app load, update via Socket.IO `conversations:updated` event  
Show as a red/teal badge on the Messages nav icon

### API + Socket hook shape
```typescript
useConversations()                    → query → Conversation[]
useMessages(conversationId, page)     → query → Message[]
useSendMessage()                      → mutation
useMarkAsRead(conversationId)         → mutation
useCreateOrGetConversation()          → mutation → { conversationId }
useUnreadCount()                      → derived from useConversations()
```

Real-time: use a `useEffect` to subscribe to Socket.IO `message:new` events and invalidate `['messages', conversationId]` query on receipt.

---

## Acceptance Criteria

- [ ] Parent can open a conversation with their assigned therapist from web-booking or web-cases
- [ ] `POST /messaging/conversations` with the same pair returns the existing conversation (no duplicate)
- [ ] Conversation list shows all conversations, sorted by most recent message
- [ ] Unread count badge appears on each conversation row and on the nav icon
- [ ] Sending a message appears in real time for the recipient (no page refresh needed)
- [ ] Opening a conversation marks all received messages as read
- [ ] Unread badge disappears after reading
- [ ] Message history loads correctly with pagination (scroll up to load older)
- [ ] Therapist sees the conversation on their end in web-main
- [ ] Non-participants cannot access `GET /messaging/conversations/:id/messages` (403)
- [ ] Empty state renders on `/messages` when the user has no conversations
