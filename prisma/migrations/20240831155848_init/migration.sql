/*
  Warnings:

  - The primary key for the `Trade` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `Trade` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Trade" (
    "id" BIGINT NOT NULL PRIMARY KEY,
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
