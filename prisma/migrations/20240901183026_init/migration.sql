/*
  Warnings:

  - The primary key for the `Trade` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "public"."Trade" DROP CONSTRAINT "Trade_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Trade_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Trade_id_seq";
