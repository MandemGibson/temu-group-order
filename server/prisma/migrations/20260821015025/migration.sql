/*
  Warnings:

  - You are about to drop the column `itemDescription` on the `PoolJoin` table. All the data in the column will be lost.
  - You are about to drop the column `itemSpecs` on the `PoolJoin` table. All the data in the column will be lost.
  - You are about to drop the column `temuItemUrl` on the `PoolJoin` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PoolJoin" DROP COLUMN "itemDescription",
DROP COLUMN "itemSpecs",
DROP COLUMN "temuItemUrl";
