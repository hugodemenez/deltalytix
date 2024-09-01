/*
  Warnings:

  - You are about to drop the column `email` on the `Trade` table. All the data in the column will be lost.
  - You are about to drop the `UserProfiles` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId]` on the table `Trade` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Trade` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Trade" DROP CONSTRAINT "Trade_email_fkey";

-- AlterTable
ALTER TABLE "public"."Trade" DROP COLUMN "email",
ADD COLUMN     "userId" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."UserProfiles";

-- CreateIndex
CREATE UNIQUE INDEX "Trade_userId_key" ON "public"."Trade"("userId");
