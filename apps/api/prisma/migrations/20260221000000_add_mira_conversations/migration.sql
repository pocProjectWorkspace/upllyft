-- CreateTable
CREATE TABLE "mira_conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "childId" TEXT,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mira_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mira_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "cards" JSONB,
    "choices" JSONB,
    "actions" JSONB,
    "sentiment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mira_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mira_conversations_userId_idx" ON "mira_conversations"("userId");

-- CreateIndex
CREATE INDEX "mira_conversations_childId_idx" ON "mira_conversations"("childId");

-- CreateIndex
CREATE INDEX "mira_conversations_updatedAt_idx" ON "mira_conversations"("updatedAt");

-- CreateIndex
CREATE INDEX "mira_messages_conversationId_idx" ON "mira_messages"("conversationId");

-- CreateIndex
CREATE INDEX "mira_messages_createdAt_idx" ON "mira_messages"("createdAt");

-- AddForeignKey
ALTER TABLE "mira_conversations" ADD CONSTRAINT "mira_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mira_conversations" ADD CONSTRAINT "mira_conversations_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mira_messages" ADD CONSTRAINT "mira_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "mira_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
