-- Full-text search + vector similarity indexes.
-- These use features Prisma cannot express in schema.prisma directly:
--   * a STORED generated tsvector column for Postgres full-text search
--   * HNSW indexes over pgvector embedding columns (cosine distance)

-- Postgres requires a generated column's expression to be IMMUTABLE. Two gotchas:
--   * to_tsvector must take an explicit 'english'::regconfig (not a bare literal)
--   * array_to_string is only STABLE, so we wrap it in an IMMUTABLE helper.
CREATE OR REPLACE FUNCTION immutable_array_to_string(text[]) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$ SELECT array_to_string($1, ' ') $$;

-- ── Creators full-text search ────────────────────────────────────────────────
ALTER TABLE "creators"
  ADD COLUMN IF NOT EXISTS "search_vector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'english'::regconfig,
      coalesce("name", '') || ' ' ||
      coalesce("handle", '') || ' ' ||
      coalesce("bio", '') || ' ' ||
      coalesce(immutable_array_to_string("categoryTags"), '') || ' ' ||
      coalesce("location", '') || ' ' ||
      coalesce(immutable_array_to_string("languages"), '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS "creators_search_idx" ON "creators" USING GIN ("search_vector");

-- ── Vector similarity (HNSW, cosine) ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "creators_embedding_idx"
  ON "creators" USING hnsw ("embedding" vector_cosine_ops);

CREATE INDEX IF NOT EXISTS "content_items_embedding_idx"
  ON "content_items" USING hnsw ("embedding" vector_cosine_ops);

CREATE INDEX IF NOT EXISTS "brands_embedding_idx"
  ON "brands" USING hnsw ("embedding" vector_cosine_ops);
