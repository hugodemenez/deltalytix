/*
  Warnings:

  - A unique constraint covering the columns `[userId,day]` on the table `Mood` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Mood" ADD COLUMN     "emotionValue" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "hasTradingExperience" BOOLEAN,
ADD COLUMN     "journalContent" TEXT,
ADD COLUMN     "selectedNews" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "Mood_userId_day_key" ON "public"."Mood"("userId", "day");
