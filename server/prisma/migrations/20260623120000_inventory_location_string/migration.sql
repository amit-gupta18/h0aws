-- DropForeignKey
ALTER TABLE "Inventory" DROP CONSTRAINT "Inventory_locationId_fkey";

-- DropForeignKey
ALTER TABLE "Inventory" DROP CONSTRAINT "Inventory_productId_fkey";

-- DropForeignKey
ALTER TABLE "Location" DROP CONSTRAINT "Location_businessId_fkey";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "location" TEXT,
ADD COLUMN     "quantity" DECIMAL(10,3) NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "Inventory";

-- DropTable
DROP TABLE "Location";
