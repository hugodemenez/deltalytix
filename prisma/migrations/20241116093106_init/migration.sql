-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "propfirm" TEXT NOT NULL DEFAULT '',
    "drawdownThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profitTarget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isPerformance" BOOLEAN NOT NULL DEFAULT false,
    "payoutCount" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_id_key" ON "public"."Account"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Account_number_key" ON "public"."Account"("number");

-- CreateIndex
CREATE INDEX "Account_number_idx" ON "public"."Account"("number");

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
