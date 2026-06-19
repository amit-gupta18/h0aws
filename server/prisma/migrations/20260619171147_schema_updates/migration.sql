/*
  Warnings:

  - You are about to drop the column `tags` on the `Invoice` table. All the data in the column will be lost.
  - Added the required column `invoiceDate` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "tags",
ADD COLUMN     "invoiceDate" DATE NOT NULL;
