-- Email outbox: bulk emails wait here for the provider's daily allowance. Additive and IDEMPOTENT.
CREATE TABLE IF NOT EXISTS "email_outbox" (
    "id"             TEXT NOT NULL,
    "toEmail"        TEXT NOT NULL,
    "toName"         TEXT,
    "subject"        TEXT NOT NULL,
    "html"           TEXT,
    "text"           TEXT,
    "tags"           TEXT[] DEFAULT ARRAY[]::TEXT[],
    "idempotencyKey" TEXT,
    "status"         TEXT NOT NULL DEFAULT 'QUEUED',
    "attempts"       INTEGER NOT NULL DEFAULT 0,
    "lastError"      TEXT,
    "sendAfter"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt"      TIMESTAMP(3),
    "sentAt"         TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_outbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_outbox_idempotencyKey_key" ON "email_outbox"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "email_outbox_status_sendAfter_idx" ON "email_outbox"("status", "sendAfter");
CREATE INDEX IF NOT EXISTS "email_outbox_sentAt_idx" ON "email_outbox"("sentAt");
