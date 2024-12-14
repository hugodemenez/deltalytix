-- CreateTable
CREATE TABLE "public"."SubscriptionFeedback" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubscriptionFeedback_email_idx" ON "public"."SubscriptionFeedback"("email");

-- AddForeignKey
ALTER TABLE "public"."SubscriptionFeedback" ADD CONSTRAINT "SubscriptionFeedback_email_fkey" FOREIGN KEY ("email") REFERENCES "public"."Subscription"("email") ON DELETE RESTRICT ON UPDATE CASCADE;
