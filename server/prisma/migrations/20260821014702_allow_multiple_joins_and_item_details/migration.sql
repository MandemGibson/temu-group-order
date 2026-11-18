-- DropIndex
DROP INDEX "PoolJoin_poolId_buyerId_key";

-- AlterTable
ALTER TABLE "PoolJoin" ADD COLUMN     "itemDescription" TEXT,
ADD COLUMN     "itemSpecs" TEXT,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "temuItemUrl" TEXT;
