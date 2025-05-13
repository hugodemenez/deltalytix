-- AlterTable
ALTER TABLE "public"."Trade" ADD COLUMN     "groupId" TEXT DEFAULT '';

-- CreateIndex
CREATE INDEX "Trade_groupId_idx" ON "public"."Trade"("groupId");
