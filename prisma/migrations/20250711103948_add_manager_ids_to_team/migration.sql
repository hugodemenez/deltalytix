-- AlterTable
ALTER TABLE "public"."Team" ADD COLUMN     "managerIds" JSONB NOT NULL DEFAULT '[]';
