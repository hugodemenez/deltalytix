-- CreateTable
CREATE TABLE "public"."Order" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderAction" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "averageFilledPrice" DOUBLE PRECISION NOT NULL,
    "isOpeningOrder" BOOLEAN NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "symbol" TEXT NOT NULL,
    "instrumentType" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderId_key" ON "public"."Order"("orderId");

-- CreateIndex
CREATE INDEX "Order_accountId_idx" ON "public"."Order"("accountId");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "public"."Order"("userId");

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
