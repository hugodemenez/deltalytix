/*
  Warnings:

  - A unique constraint covering the columns `[title,date,lang,timezone]` on the table `FinancialEvent` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "FinancialEvent_title_date_lang_timezone_key" ON "public"."FinancialEvent"("title", "date", "lang", "timezone");
