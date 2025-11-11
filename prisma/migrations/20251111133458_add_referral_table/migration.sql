-- CreateTable
CREATE TABLE "public"."Referral" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "referredUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Referral_userId_key" ON "public"."Referral"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_slug_key" ON "public"."Referral"("slug");

-- CreateIndex
CREATE INDEX "Referral_userId_idx" ON "public"."Referral"("userId");

-- CreateIndex
CREATE INDEX "Referral_slug_idx" ON "public"."Referral"("slug");

-- AddForeignKey
ALTER TABLE "public"."Referral" ADD CONSTRAINT "Referral_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
