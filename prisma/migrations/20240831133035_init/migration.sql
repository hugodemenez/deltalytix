-- CreateTable
CREATE TABLE "Trade" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "instrument" TEXT NOT NULL,
    "buyPrice" TEXT NOT NULL,
    "sellPrice" TEXT NOT NULL,
    "buyDate" TEXT NOT NULL,
    "sellDate" TEXT NOT NULL,
    "pnl" TEXT NOT NULL,
    "timeInPosition" TEXT NOT NULL
);
