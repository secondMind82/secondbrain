-- Extend Backup with integrity + provenance metadata.
-- All new columns are nullable/defaulted so existing v1 backup rows remain valid.

-- AlterTable
ALTER TABLE "public"."Backup" ADD COLUMN     "checksum" TEXT,
ADD COLUMN     "appVersion" TEXT,
ADD COLUMN     "encoding" TEXT NOT NULL DEFAULT 'json',
ADD COLUMN     "recordCounts" JSONB;
