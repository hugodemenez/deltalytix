-- CreateTable
CREATE TABLE "public"."Trade" (
    "id" BIGSERIAL NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "buyId" BIGINT NOT NULL,
    "sellId" BIGINT NOT NULL,
    "instrument" TEXT NOT NULL,
    "buyPrice" TEXT NOT NULL,
    "sellPrice" TEXT NOT NULL,
    "buyDate" TEXT NOT NULL,
    "sellDate" TEXT NOT NULL,
    "pnl" TEXT NOT NULL,
    "timeInPosition" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserProfiles" (
    "id" UUID NOT NULL,
    "username" TEXT,
    "full_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "avatar_url" TEXT,
    "website" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "UserProfiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfiles_username_key" ON "public"."UserProfiles"("username");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfiles_email_key" ON "public"."UserProfiles"("email");

-- AddForeignKey
ALTER TABLE "public"."Trade" ADD CONSTRAINT "Trade_email_fkey" FOREIGN KEY ("email") REFERENCES "public"."UserProfiles"("email") ON DELETE RESTRICT ON UPDATE CASCADE;
