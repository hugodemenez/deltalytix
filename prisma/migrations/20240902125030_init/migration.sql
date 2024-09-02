/*
  Warnings:

  - You are about to drop the `Post` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Post" DROP CONSTRAINT "Post_authorId_fkey";

-- DropTable
DROP TABLE "public"."Post";

-- DropTable
DROP TABLE "public"."User";

-- CreateTable
CREATE TABLE "public"."Trade" (
    "id" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "buyId" TEXT NOT NULL,
    "sellId" TEXT NOT NULL,
    "instrument" TEXT NOT NULL,
    "buyPrice" TEXT NOT NULL,
    "sellPrice" TEXT NOT NULL,
    "buyDate" TEXT NOT NULL,
    "sellDate" TEXT NOT NULL,
    "pnl" TEXT NOT NULL,
    "timeInPosition" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "side" TEXT NOT NULL DEFAULT '',
    "comission" TEXT NOT NULL DEFAULT '0',

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);
