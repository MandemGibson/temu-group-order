-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('buyer', 'leader', 'admin');

-- CreateEnum
CREATE TYPE "LeaderOnboardingStatus" AS ENUM ('not_applied', 'pending_review', 'approved', 'rejected', 'suspended');

-- CreateEnum
CREATE TYPE "PoolStatus" AS ENUM ('open', 'funded', 'ordered', 'shipped', 'delivered', 'dead');

-- CreateEnum
CREATE TYPE "ItemCostStatus" AS ENUM ('unpaid', 'proof_uploaded', 'funded', 'dropped');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('pending', 'paid', 'disbursed', 'voided', 'failed');

-- CreateEnum
CREATE TYPE "CreditSourceType" AS ENUM ('dead_pool', 'dropped_join', 'join_fee_spend');

-- CreateEnum
CREATE TYPE "DisputeType" AS ENUM ('funded_dispute', 'delivery_dispute', 'fraud_report', 'shipping_deadline_missed');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('open', 'under_review', 'resolved_buyer', 'resolved_leader', 'dismissed');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneVerifiedAt" TIMESTAMP(3),
    "email" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'buyer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaderOnboardingStatus" "LeaderOnboardingStatus" NOT NULL DEFAULT 'not_applied',
    "leaderOnboardingFeeTxId" TEXT,
    "ghanaCardNumber" TEXT,
    "ghanaCardImageUrl" TEXT,
    "selfieImageUrl" TEXT,
    "leaderApprovedAt" TIMESTAMP(3),
    "leaderSuspendedAt" TIMESTAMP(3),
    "leaderSuspendedReason" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pool" (
    "id" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "isPlatformPool" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL,
    "itemScreenshotUrl" TEXT,
    "category" TEXT,
    "targetPesewas" INTEGER NOT NULL,
    "minPerPersonPesewas" INTEGER NOT NULL,
    "maxParticipants" INTEGER NOT NULL,
    "joinFeePesewas" INTEGER NOT NULL,
    "platformCommissionBps" INTEGER NOT NULL,
    "status" "PoolStatus" NOT NULL DEFAULT 'open',
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "itemCostDeadlineHours" INTEGER NOT NULL,
    "fundedAt" TIMESTAMP(3),
    "orderedAt" TIMESTAMP(3),
    "shipDeadlineAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "trackingNumber" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "recreatedFromId" TEXT,
    "recreateCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoolJoin" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "itemScreenshotUrl" TEXT,
    "contributionPesewas" INTEGER NOT NULL,
    "editableUntilPaid" BOOLEAN NOT NULL DEFAULT true,
    "transactionId" TEXT,
    "itemCostPesewas" INTEGER,
    "itemCostStatus" "ItemCostStatus" NOT NULL DEFAULT 'unpaid',
    "itemCostDeadlineAt" TIMESTAMP(3),
    "proofOfPaymentUrl" TEXT,
    "buyerConfirmedPaidAt" TIMESTAMP(3),
    "leaderConfirmedFundedAt" TIMESTAMP(3),
    "paymentReference" TEXT,
    "leaderMarkedDeliveredAt" TIMESTAMP(3),
    "buyerConfirmedDeliveredAt" TIMESTAMP(3),
    "leftVoluntarilyAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoolJoin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountPesewas" INTEGER NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'pending',
    "idempotencyKey" TEXT NOT NULL,
    "moolreTxRef" TEXT,
    "leaderSharePesewas" INTEGER NOT NULL,
    "platformSharePesewas" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerCredit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountPesewas" INTEGER NOT NULL,
    "sourceType" "CreditSourceType" NOT NULL,
    "sourcePoolId" TEXT,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuyerCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "poolJoinId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "poolJoinId" TEXT NOT NULL,
    "raisedById" TEXT NOT NULL,
    "type" "DisputeType" NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'open',
    "reason" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "adminNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_leaderOnboardingFeeTxId_key" ON "User"("leaderOnboardingFeeTxId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_leaderOnboardingStatus_idx" ON "User"("leaderOnboardingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Pool_recreatedFromId_key" ON "Pool"("recreatedFromId");

-- CreateIndex
CREATE INDEX "Pool_status_idx" ON "Pool"("status");

-- CreateIndex
CREATE INDEX "Pool_leaderId_idx" ON "Pool"("leaderId");

-- CreateIndex
CREATE INDEX "Pool_deadlineAt_idx" ON "Pool"("deadlineAt");

-- CreateIndex
CREATE UNIQUE INDEX "PoolJoin_transactionId_key" ON "PoolJoin"("transactionId");

-- CreateIndex
CREATE INDEX "PoolJoin_poolId_idx" ON "PoolJoin"("poolId");

-- CreateIndex
CREATE INDEX "PoolJoin_buyerId_idx" ON "PoolJoin"("buyerId");

-- CreateIndex
CREATE INDEX "PoolJoin_itemCostStatus_idx" ON "PoolJoin"("itemCostStatus");

-- CreateIndex
CREATE UNIQUE INDEX "PoolJoin_poolId_buyerId_key" ON "PoolJoin"("poolId", "buyerId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_idempotencyKey_key" ON "Transaction"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_moolreTxRef_key" ON "Transaction"("moolreTxRef");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BuyerCredit_transactionId_key" ON "BuyerCredit"("transactionId");

-- CreateIndex
CREATE INDEX "BuyerCredit_userId_idx" ON "BuyerCredit"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_poolJoinId_key" ON "Review"("poolJoinId");

-- CreateIndex
CREATE INDEX "Review_poolId_idx" ON "Review"("poolId");

-- CreateIndex
CREATE INDEX "Review_authorId_idx" ON "Review"("authorId");

-- CreateIndex
CREATE INDEX "Dispute_poolJoinId_idx" ON "Dispute"("poolJoinId");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- AddForeignKey
ALTER TABLE "Pool" ADD CONSTRAINT "Pool_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pool" ADD CONSTRAINT "Pool_recreatedFromId_fkey" FOREIGN KEY ("recreatedFromId") REFERENCES "Pool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolJoin" ADD CONSTRAINT "PoolJoin_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolJoin" ADD CONSTRAINT "PoolJoin_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolJoin" ADD CONSTRAINT "PoolJoin_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerCredit" ADD CONSTRAINT "BuyerCredit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerCredit" ADD CONSTRAINT "BuyerCredit_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_poolJoinId_fkey" FOREIGN KEY ("poolJoinId") REFERENCES "PoolJoin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_poolJoinId_fkey" FOREIGN KEY ("poolJoinId") REFERENCES "PoolJoin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
