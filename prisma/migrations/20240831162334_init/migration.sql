/*
  Warnings:

  - Added the required column `buyId` to the `Trade` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sellId` to the `Trade` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Trade" (
    "id" BIGINT NOT NULL PRIMARY KEY,
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
INSERT INTO "new_Trade" ("buyDate", "buyPrice", "id", "instrument", "pnl", "sellDate", "sellPrice", "timeInPosition") SELECT "buyDate", "buyPrice", "id", "instrument", "pnl", "sellDate", "sellPrice", "timeInPosition" FROM "Trade";
DROP TABLE "Trade";
ALTER TABLE "new_Trade" RENAME TO "Trade";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
