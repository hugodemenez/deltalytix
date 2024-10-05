-- CreateTable
CREATE TABLE "public"."Trade" (
    "id" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "entryId" TEXT DEFAULT '',
    "closeId" TEXT DEFAULT '',
    "instrument" TEXT NOT NULL,
    "entryPrice" TEXT NOT NULL,
    "closePrice" TEXT NOT NULL,
    "entryDate" TEXT NOT NULL,
    "closeDate" TEXT NOT NULL,
    "pnl" DOUBLE PRECISION NOT NULL,
    "timeInPosition" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "side" TEXT DEFAULT '',
    "commission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comment" TEXT,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TickDetails" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "tickValue" DOUBLE PRECISION NOT NULL,
    "tickSize" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TickDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Subscription" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trade_id_key" ON "public"."Trade"("id");

-- CreateIndex
CREATE UNIQUE INDEX "TickDetails_id_key" ON "public"."TickDetails"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_id_key" ON "public"."Subscription"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_email_key" ON "public"."Subscription"("email");
