-- AlterTable
ALTER TABLE "FamilyMember" ADD COLUMN "timezone" TEXT;

-- AlterTable
ALTER TABLE "Todo" ADD COLUMN "category" TEXT;
ALTER TABLE "Todo" ADD COLUMN "tags" JSONB;
