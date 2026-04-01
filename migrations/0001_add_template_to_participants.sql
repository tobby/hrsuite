ALTER TABLE "cycle_participants" ADD COLUMN "template_id" varchar;

UPDATE "cycle_participants" cp
SET "template_id" = ac."template_id"
FROM "appraisal_cycles" ac
WHERE cp."cycle_id" = ac."id"
  AND ac."template_id" IS NOT NULL;
