-- CreateTable
CREATE TABLE "public"."BusinessSubscription" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "trialEndsAt" TIMESTAMP(3),
    "interval" TEXT,

    CONSTRAINT "BusinessSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessSubscription_id_key" ON "public"."BusinessSubscription"("id");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessSubscription_email_key" ON "public"."BusinessSubscription"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessSubscription_userId_key" ON "public"."BusinessSubscription"("userId");

-- CreateIndex
CREATE INDEX "BusinessSubscription_email_idx" ON "public"."BusinessSubscription"("email");

-- CreateIndex
CREATE INDEX "BusinessSubscription_userId_idx" ON "public"."BusinessSubscription"("userId");

-- AddForeignKey
ALTER TABLE "public"."BusinessSubscription" ADD CONSTRAINT "BusinessSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
