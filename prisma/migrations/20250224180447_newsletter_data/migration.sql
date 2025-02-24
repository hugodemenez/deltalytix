/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Newsletter` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Newsletter` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Newsletter" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";
