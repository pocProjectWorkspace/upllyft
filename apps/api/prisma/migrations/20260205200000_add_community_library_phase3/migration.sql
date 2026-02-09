-- Phase 3: Community Library, Ratings & Reviews, Moderation

-- Create enums
CREATE TYPE "WorksheetFlagReason" AS ENUM ('INAPPROPRIATE', 'INACCURATE', 'HARMFUL', 'SPAM', 'OTHER');
CREATE TYPE "WorksheetFlagStatus" AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED', 'ACTIONED');

-- Add community fields to worksheets
ALTER TABLE "worksheets" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "worksheets" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "worksheets" ADD COLUMN "contributorNotes" TEXT;
ALTER TABLE "worksheets" ADD COLUMN "clonedFromId" TEXT;
ALTER TABLE "worksheets" ADD COLUMN "cloneCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "worksheets" ADD COLUMN "averageRating" DOUBLE PRECISION;
ALTER TABLE "worksheets" ADD COLUMN "reviewCount" INTEGER NOT NULL DEFAULT 0;

-- Add foreign key for clonedFromId
ALTER TABLE "worksheets" ADD CONSTRAINT "worksheets_clonedFromId_fkey" FOREIGN KEY ("clonedFromId") REFERENCES "worksheets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create worksheet_reviews table
CREATE TABLE "worksheet_reviews" (
    "id" TEXT NOT NULL,
    "worksheetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "reviewText" TEXT,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worksheet_reviews_pkey" PRIMARY KEY ("id")
);

-- Create worksheet_flags table
CREATE TABLE "worksheet_flags" (
    "id" TEXT NOT NULL,
    "worksheetId" TEXT NOT NULL,
    "flaggedById" TEXT NOT NULL,
    "reason" "WorksheetFlagReason" NOT NULL,
    "details" TEXT,
    "status" "WorksheetFlagStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "worksheet_flags_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "worksheet_reviews_worksheetId_userId_key" ON "worksheet_reviews"("worksheetId", "userId");

-- Indexes for worksheet_reviews
CREATE INDEX "worksheet_reviews_worksheetId_idx" ON "worksheet_reviews"("worksheetId");
CREATE INDEX "worksheet_reviews_userId_idx" ON "worksheet_reviews"("userId");
CREATE INDEX "worksheet_reviews_rating_idx" ON "worksheet_reviews"("rating");

-- Indexes for worksheet_flags
CREATE INDEX "worksheet_flags_worksheetId_idx" ON "worksheet_flags"("worksheetId");
CREATE INDEX "worksheet_flags_flaggedById_idx" ON "worksheet_flags"("flaggedById");
CREATE INDEX "worksheet_flags_status_idx" ON "worksheet_flags"("status");

-- Indexes for worksheets community fields
CREATE INDEX "worksheets_isPublic_status_idx" ON "worksheets"("isPublic", "status");
CREATE INDEX "worksheets_averageRating_idx" ON "worksheets"("averageRating");
CREATE INDEX "worksheets_clonedFromId_idx" ON "worksheets"("clonedFromId");

-- Foreign keys for worksheet_reviews
ALTER TABLE "worksheet_reviews" ADD CONSTRAINT "worksheet_reviews_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "worksheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "worksheet_reviews" ADD CONSTRAINT "worksheet_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign keys for worksheet_flags
ALTER TABLE "worksheet_flags" ADD CONSTRAINT "worksheet_flags_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "worksheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "worksheet_flags" ADD CONSTRAINT "worksheet_flags_flaggedById_fkey" FOREIGN KEY ("flaggedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "worksheet_flags" ADD CONSTRAINT "worksheet_flags_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
