/*
  Warnings:

  - Added the required column `quantity` to the `Trade` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Trade" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "quantity" INTEGER NOT NULL,
    "buyId" BIGINT NOT NULL,
    "sellId" BIGINT NOT NULL,
    "instrument" TEXT NOT NULL,
    "buyPrice" TEXT NOT NULL,
    "sellPrice" TEXT NOT NULL,
    "buyDate" TEXT NOT NULL,
    "sellDate" TEXT NOT NULL,
    "pnl" TEXT NOT NULL,
    "timeInPosition" TEXT NOT NULL
);
INSERT INTO "new_Trade" ("buyDate", "buyId", "buyPrice", "id", "instrument", "pnl", "sellDate", "sellId", "sellPrice", "timeInPosition") SELECT "buyDate", "buyId", "buyPrice", "id", "instrument", "pnl", "sellDate", "sellId", "sellPrice", "timeInPosition" FROM "Trade";
DROP TABLE "Trade";
ALTER TABLE "new_Trade" RENAME TO "Trade";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
