-- Taxonomy backfill for already-seeded data (no-ops on a fresh seed).
-- 1) parenting → family, crypto → finance (dedup via array_agg DISTINCT)
-- 2) family interest key rename in audience reports
-- 3) distribute a deterministic slice of creators into MENA countries so the
--    new country filters return results.

-- 1) Creator category tags.
UPDATE "creators"
SET "categoryTags" = (
  SELECT array_agg(DISTINCT CASE
    WHEN t = 'parenting' THEN 'family'
    WHEN t = 'crypto'    THEN 'finance'
    ELSE t END)
  FROM unnest("categoryTags") AS t
)
WHERE "categoryTags" && ARRAY['parenting', 'crypto']::text[];

-- 2) Audience interest distribution: rename "parenting" key to "family".
UPDATE "audience_reports"
SET "interestDistribution" =
  ("interestDistribution" - 'parenting')
  || jsonb_build_object('family', "interestDistribution" -> 'parenting')
WHERE "interestDistribution" ? 'parenting';

-- 3) MENA distribution: ~1/7 of creators get a MENA country (deterministic by id).
UPDATE "creators" AS c
SET
  "country"   = m.arr[1 + (abs(hashtext(c.id)) % array_length(m.arr, 1))],
  "location"  = m.arr[1 + (abs(hashtext(c.id)) % array_length(m.arr, 1))],
  "languages" = ARRAY['Arabic']::text[]
FROM (
  SELECT ARRAY[
    'Algeria','Bahrain','Djibouti','Egypt','Iran','Iraq','Israel','Jordan',
    'Kuwait','Lebanon','Libya','Mauritania','Morocco','Oman','Palestine',
    'Qatar','Saudi Arabia','Sudan','Syria','Tunisia','United Arab Emirates','Yemen'
  ] AS arr
) AS m
WHERE abs(hashtext(c.id)) % 7 = 0;
