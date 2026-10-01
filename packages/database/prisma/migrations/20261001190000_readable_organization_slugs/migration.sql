UPDATE "Organization"
SET "slug" = '__wakeops_migration__-' || "id";

WITH normalized AS (
  SELECT
    "id",
    COALESCE(
      NULLIF(TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER("name"), '[^a-z0-9]+', '-', 'g')), ''),
      'organization'
    ) AS base_slug,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(
        NULLIF(TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER("name"), '[^a-z0-9]+', '-', 'g')), ''),
        'organization'
      )
      ORDER BY "createdAt", "id"
    ) AS slug_number
  FROM "Organization"
)
UPDATE "Organization" AS organization
SET "slug" = CASE
  WHEN normalized.slug_number = 1 THEN normalized.base_slug
  ELSE normalized.base_slug || '-' || normalized.slug_number
END
FROM normalized
WHERE organization."id" = normalized."id";
