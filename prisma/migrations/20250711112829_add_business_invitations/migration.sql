-- CreateTable
CREATE TABLE "public"."BusinessInvitation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessInvitation_businessId_idx" ON "public"."BusinessInvitation"("businessId");

-- CreateIndex
CREATE INDEX "BusinessInvitation_email_idx" ON "public"."BusinessInvitation"("email");

-- CreateIndex
CREATE INDEX "BusinessInvitation_status_idx" ON "public"."BusinessInvitation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessInvitation_businessId_email_key" ON "public"."BusinessInvitation"("businessId", "email");

-- AddForeignKey
ALTER TABLE "public"."BusinessInvitation" ADD CONSTRAINT "BusinessInvitation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
