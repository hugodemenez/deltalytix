-- CreateEnum
CREATE TYPE "public"."PaymentFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'BIANNUAL', 'ANNUAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."PromoType" AS ENUM ('DIRECT', 'PERCENTAGE');

-- AlterTable
ALTER TABLE "public"."Account" ADD COLUMN     "autoRenewal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nextPaymentDate" TIMESTAMP(3),
ADD COLUMN     "paymentFrequency" "public"."PaymentFrequency",
ADD COLUMN     "promoPercentage" DOUBLE PRECISION,
ADD COLUMN     "promoType" "public"."PromoType",
ADD COLUMN     "renewalNotice" INTEGER;

-- CreateTable
CREATE TABLE "public"."TradeAnalytics" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "mae" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mfe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "entryPriceFromData" DOUBLE PRECISION,
    "priceDifference" DOUBLE PRECISION,
    "riskRewardRatio" DOUBLE PRECISION,
    "efficiency" DOUBLE PRECISION,
    "dataSource" TEXT NOT NULL DEFAULT 'DATABENTO',
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HistoricalData" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "databentSymbol" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" INTEGER NOT NULL,
    "dataSource" TEXT NOT NULL DEFAULT 'DATABENTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricalData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TradeAnalytics_tradeId_key" ON "public"."TradeAnalytics"("tradeId");

-- CreateIndex
CREATE INDEX "TradeAnalytics_tradeId_idx" ON "public"."TradeAnalytics"("tradeId");

-- CreateIndex
CREATE INDEX "TradeAnalytics_computedAt_idx" ON "public"."TradeAnalytics"("computedAt");

-- CreateIndex
CREATE INDEX "HistoricalData_symbol_idx" ON "public"."HistoricalData"("symbol");

-- CreateIndex
CREATE INDEX "HistoricalData_databentSymbol_idx" ON "public"."HistoricalData"("databentSymbol");

-- CreateIndex
CREATE INDEX "HistoricalData_timestamp_idx" ON "public"."HistoricalData"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "HistoricalData_symbol_databentSymbol_timestamp_key" ON "public"."HistoricalData"("symbol", "databentSymbol", "timestamp");

-- CreateIndex
CREATE INDEX "Account_nextPaymentDate_idx" ON "public"."Account"("nextPaymentDate");
