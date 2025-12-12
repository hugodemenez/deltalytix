-- CreateTable
CREATE TABLE "public"."TeamSubscription" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "trialEndsAt" TIMESTAMP(3),
    "interval" TEXT,

    CONSTRAINT "TeamSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamInvitation" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT (now() + '7 days'::interval),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamManager" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "access" TEXT NOT NULL DEFAULT 'viewer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamManager_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamSubscription_id_key" ON "public"."TeamSubscription"("id");

-- CreateIndex
CREATE UNIQUE INDEX "TeamSubscription_email_key" ON "public"."TeamSubscription"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TeamSubscription_userId_key" ON "public"."TeamSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamSubscription_teamId_key" ON "public"."TeamSubscription"("teamId");

-- CreateIndex
CREATE INDEX "TeamSubscription_email_idx" ON "public"."TeamSubscription"("email");

-- CreateIndex
CREATE INDEX "TeamSubscription_userId_idx" ON "public"."TeamSubscription"("userId");

-- CreateIndex
CREATE INDEX "TeamSubscription_teamId_idx" ON "public"."TeamSubscription"("teamId");

-- CreateIndex
CREATE INDEX "Team_userId_idx" ON "public"."Team"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_userId_key" ON "public"."Team"("name", "userId");

-- CreateIndex
CREATE INDEX "TeamInvitation_teamId_idx" ON "public"."TeamInvitation"("teamId");

-- CreateIndex
CREATE INDEX "TeamInvitation_email_idx" ON "public"."TeamInvitation"("email");

-- CreateIndex
CREATE INDEX "TeamInvitation_status_idx" ON "public"."TeamInvitation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TeamInvitation_teamId_email_key" ON "public"."TeamInvitation"("teamId", "email");

-- CreateIndex
CREATE INDEX "TeamManager_teamId_idx" ON "public"."TeamManager"("teamId");

-- CreateIndex
CREATE INDEX "TeamManager_managerId_idx" ON "public"."TeamManager"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamManager_teamId_managerId_key" ON "public"."TeamManager"("teamId", "managerId");

-- AddForeignKey
ALTER TABLE "public"."TeamSubscription" ADD CONSTRAINT "TeamSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamSubscription" ADD CONSTRAINT "TeamSubscription_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Team" ADD CONSTRAINT "Team_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamInvitation" ADD CONSTRAINT "TeamInvitation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamManager" ADD CONSTRAINT "TeamManager_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
