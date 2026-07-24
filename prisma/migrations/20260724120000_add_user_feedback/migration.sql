-- CreateTable
CREATE TABLE "public"."UserFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserFeedback_userId_idx" ON "public"."UserFeedback"("userId");
