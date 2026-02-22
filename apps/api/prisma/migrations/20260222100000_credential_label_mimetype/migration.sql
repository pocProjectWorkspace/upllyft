-- Add label and mimeType columns to credentials table
ALTER TABLE "credentials" ADD COLUMN "label" TEXT NOT NULL DEFAULT '';
ALTER TABLE "credentials" ADD COLUMN "mimeType" TEXT NOT NULL DEFAULT 'application/octet-stream';

-- Make docType and fileName optional with defaults (were required before)
ALTER TABLE "credentials" ALTER COLUMN "docType" SET DEFAULT '';
ALTER TABLE "credentials" ALTER COLUMN "fileName" SET DEFAULT '';

-- Add foreign key for uploadedBy -> User
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
