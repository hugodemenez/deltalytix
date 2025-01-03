-- CreateTable
CREATE TABLE "public"."FinancialEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "importance" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialEvent_date_idx" ON "public"."FinancialEvent"("date");
