-- CreateTable
CREATE TABLE "public"."FeedbackRateLimit" (
    "userId" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "FeedbackRateLimit_pkey" PRIMARY KEY ("userId", "windowStart")
);

-- CreateIndex
CREATE INDEX "FeedbackRateLimit_windowStart_idx"
ON "public"."FeedbackRateLimit"("windowStart");
