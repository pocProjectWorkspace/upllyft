-- AlterEnum: Add SESSION_NOTES to WorksheetDataSource
ALTER TYPE "WorksheetDataSource" ADD VALUE 'SESSION_NOTES';

-- AlterTable: Add version tracking + session notes fields to worksheets
ALTER TABLE "worksheets" ADD COLUMN "sessionNoteIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "worksheets" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "worksheets" ADD COLUMN "parentVersionId" TEXT;

-- AlterTable: Add verified contributor fields to User
ALTER TABLE "User" ADD COLUMN "isVerifiedContributor" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "verifiedContributorAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "contributorBio" TEXT;

-- CreateTable: WorksheetCompletion
CREATE TABLE "worksheet_completions" (
    "id" TEXT NOT NULL,
    "worksheetId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "timeSpentMinutes" INTEGER,
    "difficultyRating" INTEGER,
    "engagementRating" INTEGER,
    "helpLevel" TEXT,
    "parentNotes" TEXT,
    "completionQuality" TEXT,

    CONSTRAINT "worksheet_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WorksheetEffectiveness
CREATE TABLE "worksheet_effectiveness" (
    "id" TEXT NOT NULL,
    "worksheetId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "preScore" DOUBLE PRECISION,
    "postScore" DOUBLE PRECISION,
    "progressDelta" DOUBLE PRECISION,
    "goalId" TEXT,
    "goalProgress" DOUBLE PRECISION,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "worksheet_effectiveness_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: worksheet_completions
CREATE INDEX "worksheet_completions_worksheetId_idx" ON "worksheet_completions"("worksheetId");
CREATE INDEX "worksheet_completions_childId_idx" ON "worksheet_completions"("childId");
CREATE INDEX "worksheet_completions_assignmentId_idx" ON "worksheet_completions"("assignmentId");
CREATE INDEX "worksheet_completions_completedAt_idx" ON "worksheet_completions"("completedAt");

-- CreateIndex: worksheet_effectiveness
CREATE INDEX "worksheet_effectiveness_worksheetId_idx" ON "worksheet_effectiveness"("worksheetId");
CREATE INDEX "worksheet_effectiveness_childId_idx" ON "worksheet_effectiveness"("childId");
CREATE INDEX "worksheet_effectiveness_domain_idx" ON "worksheet_effectiveness"("domain");

-- CreateIndex: worksheets parentVersionId
CREATE INDEX "worksheets_parentVersionId_idx" ON "worksheets"("parentVersionId");

-- AddForeignKey: worksheets.parentVersionId -> worksheets.id
ALTER TABLE "worksheets" ADD CONSTRAINT "worksheets_parentVersionId_fkey" FOREIGN KEY ("parentVersionId") REFERENCES "worksheets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: worksheet_completions
ALTER TABLE "worksheet_completions" ADD CONSTRAINT "worksheet_completions_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "worksheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "worksheet_completions" ADD CONSTRAINT "worksheet_completions_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "worksheet_completions" ADD CONSTRAINT "worksheet_completions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "worksheet_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: worksheet_effectiveness
ALTER TABLE "worksheet_effectiveness" ADD CONSTRAINT "worksheet_effectiveness_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "worksheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "worksheet_effectiveness" ADD CONSTRAINT "worksheet_effectiveness_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
