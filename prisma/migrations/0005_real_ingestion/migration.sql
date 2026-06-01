-- Real-data ingestion support (additive). Applied via `migrate deploy`.

-- Provenance of a creator's data: "mock" | "youtube" | …
ALTER TABLE "creators" ADD COLUMN "source" TEXT;

-- Platform-native id (e.g. YouTube channelId) for idempotent re-ingest/dedupe.
-- NULLs are distinct in a Postgres unique index, so existing mock rows (NULL)
-- never conflict; only real ingested accounts dedupe on (platform, externalId).
ALTER TABLE "platform_accounts" ADD COLUMN "externalId" TEXT;
CREATE UNIQUE INDEX "platform_accounts_platform_externalId_key"
  ON "platform_accounts" ("platform", "externalId");

-- Flags audience reports whose demographics are heuristically estimated.
ALTER TABLE "audience_reports" ADD COLUMN "estimated" BOOLEAN NOT NULL DEFAULT false;
