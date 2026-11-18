-- CreateTable
CREATE TABLE "PoolJoinItem" (
    "id" TEXT NOT NULL,
    "poolJoinId" TEXT NOT NULL,
    "itemDescription" TEXT NOT NULL,
    "temuItemUrl" TEXT,
    "itemSpecs" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "estimatedCostGhs" DOUBLE PRECISION,
    "itemScreenshotUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoolJoinItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PoolJoinItem_poolJoinId_idx" ON "PoolJoinItem"("poolJoinId");

-- AddForeignKey
ALTER TABLE "PoolJoinItem" ADD CONSTRAINT "PoolJoinItem_poolJoinId_fkey" FOREIGN KEY ("poolJoinId") REFERENCES "PoolJoin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "PoolJoin_poolId_buyerId_key" ON "PoolJoin"("poolId", "buyerId");
