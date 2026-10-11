-- Help Center FAQ (/help, edited at /admin/faq). Additive and IDEMPOTENT.
-- Rows are seeded by the API on boot when faq_categories is empty (src/faq/faq-seed.ts).
CREATE TABLE IF NOT EXISTS "faq_categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'ALL',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "faq_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "faq_categories_slug_key" ON "faq_categories"("slug");
CREATE INDEX IF NOT EXISTS "faq_categories_audience_sortOrder_idx" ON "faq_categories"("audience", "sortOrder");

CREATE TABLE IF NOT EXISTS "faq_items" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "faq_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "faq_items_slug_key" ON "faq_items"("slug");
CREATE INDEX IF NOT EXISTS "faq_items_categoryId_sortOrder_idx" ON "faq_items"("categoryId", "sortOrder");
DO $$ BEGIN
  ALTER TABLE "faq_items" ADD CONSTRAINT "faq_items_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "faq_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
