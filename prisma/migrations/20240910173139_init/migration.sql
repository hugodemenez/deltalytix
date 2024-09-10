-- CreateTable
CREATE TABLE "public"."TickDetails" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "tickValue" DOUBLE PRECISION NOT NULL,
    "tickSize" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TickDetails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TickDetails_id_key" ON "public"."TickDetails"("id");
