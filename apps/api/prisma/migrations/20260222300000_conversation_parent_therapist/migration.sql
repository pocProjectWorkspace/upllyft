-- AlterTable: Add parentId and therapistId to conversations
ALTER TABLE "conversations" ADD COLUMN "parent_id" TEXT;
ALTER TABLE "conversations" ADD COLUMN "therapist_id" TEXT;

-- CreateIndex
CREATE INDEX "conversations_parent_id_idx" ON "conversations"("parent_id");
CREATE INDEX "conversations_therapist_id_idx" ON "conversations"("therapist_id");

-- CreateUniqueIndex (only when both non-null)
CREATE UNIQUE INDEX "conversations_parent_id_therapist_id_key" ON "conversations"("parent_id", "therapist_id");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
