-- CreateTable
CREATE TABLE "public"."TeamInvitation" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamInvitation_teamId_idx" ON "public"."TeamInvitation"("teamId");

-- CreateIndex
CREATE INDEX "TeamInvitation_email_idx" ON "public"."TeamInvitation"("email");

-- CreateIndex
CREATE INDEX "TeamInvitation_status_idx" ON "public"."TeamInvitation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TeamInvitation_teamId_email_key" ON "public"."TeamInvitation"("teamId", "email");

-- AddForeignKey
ALTER TABLE "public"."TeamInvitation" ADD CONSTRAINT "TeamInvitation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
