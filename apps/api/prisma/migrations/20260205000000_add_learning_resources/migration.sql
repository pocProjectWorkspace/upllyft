-- CreateEnum
CREATE TYPE "WorksheetType" AS ENUM ('ACTIVITY', 'VISUAL_SUPPORT', 'STRUCTURED_PLAN', 'PROGRESS_TRACKER');

-- CreateEnum
CREATE TYPE "WorksheetStatus" AS ENUM ('DRAFT', 'GENERATING', 'PUBLISHED', 'ARCHIVED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "WorksheetColorMode" AS ENUM ('FULL_COLOR', 'GRAYSCALE', 'LINE_ART');

-- CreateEnum
CREATE TYPE "WorksheetDifficulty" AS ENUM ('FOUNDATIONAL', 'DEVELOPING', 'STRENGTHENING');

-- CreateEnum
CREATE TYPE "WorksheetImageStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "worksheets" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "WorksheetType" NOT NULL,
    "subType" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "pdfUrl" TEXT,
    "previewUrl" TEXT,
    "status" "WorksheetStatus" NOT NULL DEFAULT 'DRAFT',
    "colorMode" "WorksheetColorMode" NOT NULL DEFAULT 'FULL_COLOR',
    "difficulty" "WorksheetDifficulty" NOT NULL DEFAULT 'DEVELOPING',
    "targetDomains" TEXT[],
    "ageRangeMin" INTEGER,
    "ageRangeMax" INTEGER,
    "conditionTags" TEXT[],
    "createdById" TEXT NOT NULL,
    "childId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worksheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worksheet_images" (
    "id" TEXT NOT NULL,
    "worksheetId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "WorksheetImageStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "worksheet_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "worksheets_createdById_idx" ON "worksheets"("createdById");

-- CreateIndex
CREATE INDEX "worksheets_childId_idx" ON "worksheets"("childId");

-- CreateIndex
CREATE INDEX "worksheets_type_status_idx" ON "worksheets"("type", "status");

-- CreateIndex
CREATE INDEX "worksheets_createdAt_idx" ON "worksheets"("createdAt");

-- CreateIndex
CREATE INDEX "worksheet_images_worksheetId_idx" ON "worksheet_images"("worksheetId");

-- AddForeignKey
ALTER TABLE "worksheets" ADD CONSTRAINT "worksheets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheets" ADD CONSTRAINT "worksheets_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheet_images" ADD CONSTRAINT "worksheet_images_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "worksheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
