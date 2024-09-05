/*
  Warnings:

  - A unique constraint covering the columns `[id]` on the table `Trade` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Trade_id_key" ON "public"."Trade"("id");
