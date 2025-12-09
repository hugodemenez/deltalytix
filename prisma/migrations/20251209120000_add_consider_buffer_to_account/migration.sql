-- Add considerBuffer flag to control buffer exclusion behavior
ALTER TABLE "public"."Account"
ADD COLUMN "considerBuffer" BOOLEAN NOT NULL DEFAULT TRUE;

