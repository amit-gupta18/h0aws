-- CreateEnum
CREATE TYPE "InvoiceTemplate" AS ENUM ('CLASSIC', 'MODERN', 'COMPACT');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "defaultTemplate" "InvoiceTemplate" NOT NULL DEFAULT 'CLASSIC';

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "templateId" "InvoiceTemplate" NOT NULL DEFAULT 'CLASSIC';
