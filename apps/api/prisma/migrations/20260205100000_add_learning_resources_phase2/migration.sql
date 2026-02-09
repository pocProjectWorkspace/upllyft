-- Learning Resources Phase 2 Migration
-- New enums, Worksheet fields, WorksheetAssignment model

-- CreateEnum
CREATE TYPE "WorksheetDataSource" AS ENUM ('MANUAL', 'SCREENING', 'UPLOADED_REPORT', 'IEP_GOALS');
CREATE TYPE "WorksheetAssignmentStatus" AS ENUM ('ASSIGNED', 'VIEWED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE');

-- AlterTable: Add new fields to worksheets
ALTER TABLE "worksheets" ADD COLUMN "dataSource" "WorksheetDataSource" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "worksheets" ADD COLUMN "screeningId" TEXT;
ALTER TABLE "worksheets" ADD COLUMN "caseId" TEXT;
ALTER TABLE "worksheets" ADD COLUMN "iepGoalIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "worksheets" ADD COLUMN "uploadedReportUrl" TEXT;
ALTER TABLE "worksheets" ADD COLUMN "parsedReportData" JSONB;

-- CreateTable: WorksheetAssignment
CREATE TABLE "worksheet_assignments" (
    "id" TEXT NOT NULL,
    "worksheetId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "caseId" TEXT,
    "status" "WorksheetAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "parentNotes" TEXT,
    "completedAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worksheet_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "worksheets_screeningId_idx" ON "worksheets"("screeningId");
CREATE INDEX "worksheets_caseId_idx" ON "worksheets"("caseId");

CREATE INDEX "worksheet_assignments_assignedById_idx" ON "worksheet_assignments"("assignedById");
CREATE INDEX "worksheet_assignments_assignedToId_idx" ON "worksheet_assignments"("assignedToId");
CREATE INDEX "worksheet_assignments_childId_idx" ON "worksheet_assignments"("childId");
CREATE INDEX "worksheet_assignments_caseId_idx" ON "worksheet_assignments"("caseId");
CREATE INDEX "worksheet_assignments_status_idx" ON "worksheet_assignments"("status");
CREATE UNIQUE INDEX "worksheet_assignments_worksheetId_assignedToId_childId_key" ON "worksheet_assignments"("worksheetId", "assignedToId", "childId");

-- AddForeignKey
ALTER TABLE "worksheets" ADD CONSTRAINT "worksheets_screeningId_fkey" FOREIGN KEY ("screeningId") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "worksheets" ADD CONSTRAINT "worksheets_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "worksheet_assignments" ADD CONSTRAINT "worksheet_assignments_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "worksheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "worksheet_assignments" ADD CONSTRAINT "worksheet_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "worksheet_assignments" ADD CONSTRAINT "worksheet_assignments_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "worksheet_assignments" ADD CONSTRAINT "worksheet_assignments_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "worksheet_assignments" ADD CONSTRAINT "worksheet_assignments_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
