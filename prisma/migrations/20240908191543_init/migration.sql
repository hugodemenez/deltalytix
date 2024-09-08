/*
  Warnings:

  - You are about to drop the column `buyDate` on the `Trade` table. All the data in the column will be lost.
  - You are about to drop the column `buyId` on the `Trade` table. All the data in the column will be lost.
  - You are about to drop the column `buyPrice` on the `Trade` table. All the data in the column will be lost.
  - You are about to drop the column `sellDate` on the `Trade` table. All the data in the column will be lost.
  - You are about to drop the column `sellId` on the `Trade` table. All the data in the column will be lost.
  - You are about to drop the column `sellPrice` on the `Trade` table. All the data in the column will be lost.
  - Added the required column `closeDate` to the `Trade` table without a default value. This is not possible if the table is not empty.
  - Added the required column `closePrice` to the `Trade` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entryDate` to the `Trade` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entryPrice` to the `Trade` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `pnl` on the `Trade` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "public"."Trade" DROP COLUMN "buyDate",
DROP COLUMN "buyId",
DROP COLUMN "buyPrice",
DROP COLUMN "sellDate",
DROP COLUMN "sellId",
DROP COLUMN "sellPrice",
ADD COLUMN     "closeDate" TEXT NOT NULL,
ADD COLUMN     "closeId" TEXT DEFAULT '',
ADD COLUMN     "closePrice" TEXT NOT NULL,
ADD COLUMN     "entryDate" TEXT NOT NULL,
ADD COLUMN     "entryId" TEXT DEFAULT '',
ADD COLUMN     "entryPrice" TEXT NOT NULL,
DROP COLUMN "pnl",
ADD COLUMN     "pnl" DOUBLE PRECISION NOT NULL;
