-- CreateTable
CREATE TABLE "public"."Mood" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "mood" TEXT NOT NULL,
    "conversation" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mood_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Mood_userId_idx" ON "public"."Mood"("userId");

-- CreateIndex
CREATE INDEX "Mood_day_idx" ON "public"."Mood"("day");

-- AddForeignKey
ALTER TABLE "public"."Mood" ADD CONSTRAINT "Mood_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
