-- CreateTable
CREATE TABLE "public"."DashboardLayout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "widgets" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardLayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DashboardLayout_userId_key" ON "public"."DashboardLayout"("userId");

-- CreateIndex
CREATE INDEX "DashboardLayout_userId_idx" ON "public"."DashboardLayout"("userId");

-- AddForeignKey
ALTER TABLE "public"."DashboardLayout" ADD CONSTRAINT "DashboardLayout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("auth_user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
