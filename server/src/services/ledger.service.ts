import {
  TransactionStatus,
  CreditSourceType,
  PoolStatus,
} from "@prisma/client";
import { prisma } from "../db";
import { moolreService } from "./moolre.service";
import { logger } from "../utils/logger";

/**
 * Disburse join fee splits when a pool succeeds (reaches 'funded' status).
 * Sets paid transactions to 'disbursed' and initiates MoMo payout to leader via Moolre Transfer API.
 */
export async function disbursePoolTransactions(poolId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const pool = await tx.pool.findUnique({
      where: { id: poolId },
      include: { leader: true },
    });

    if (
      !pool ||
      (pool.status !== PoolStatus.funded &&
        pool.status !== PoolStatus.ordered &&
        pool.status !== PoolStatus.shipped &&
        pool.status !== PoolStatus.delivered)
    ) {
      throw new Error(
        `Pool ${poolId} is not in a funded/completed status, cannot disburse fees.`
      );
    }

    const joins = await tx.poolJoin.findMany({
      where: {
        poolId,
        leftVoluntarilyAt: null,
        transaction: { status: TransactionStatus.paid },
      },
      include: { transaction: true },
    });

    let disbursedCount = 0;
    let totalLeaderPesewas = 0;

    for (const join of joins) {
      if (!join.transaction) continue;

      await tx.transaction.update({
        where: { id: join.transaction.id },
        data: {
          status: TransactionStatus.disbursed,
        },
      });

      totalLeaderPesewas += join.transaction.leaderSharePesewas;
      disbursedCount++;
    }

    return {
      disbursedCount,
      totalLeaderPesewas,
      leaderPhone: pool.leader?.phone,
      leaderName: pool.leader?.name,
      poolTitle: pool.title,
      poolId: pool.id,
    };
  });

  // Initiate real MoMo payout transfer to leader via Moolre Transfer API
  if (result.totalLeaderPesewas > 0 && result.leaderPhone) {
    const payoutRef = `PAYOUT_${result.poolId.slice(0, 8)}_${Date.now()}`;
    logger.info(
      `Initiating Moolre MoMo Payout to Leader ${result.leaderName} (${result.leaderPhone}): GH₵ ${(result.totalLeaderPesewas / 100).toFixed(2)}`
    );

    try {
      const payoutResult = await moolreService.initiatePayoutTransfer({
        receiverPhone: result.leaderPhone,
        amountPesewas: result.totalLeaderPesewas,
        externalRef: payoutRef,
        reference: `Fides Leader Payout for ${result.poolTitle.slice(0, 20)}`,
      });

      if (!payoutResult.success) {
        logger.warn(
          `Moolre Payout Transfer reported failure: ${payoutResult.message}. Reference: ${payoutRef}`
        );
      } else {
        logger.info(`Moolre Payout Result:`, payoutResult);
      }
    } catch (payoutErr) {
      logger.error(`Moolre payout transfer exception:`, payoutErr);
    }
  }

  return { disbursedCount: result.disbursedCount, totalLeaderPesewas: result.totalLeaderPesewas };
}

/**
 * Void join fees to buyer credit when a pool dies (fails to reach 350 GHS minimum).
 * Sets paid transactions to 'voided' and creates positive BuyerCredit ledger entries.
 */
export async function voidPoolTransactionsToCredit(poolId: string) {
  return prisma.$transaction(async (tx) => {
    const pool = await tx.pool.findUnique({ where: { id: poolId } });

    if (!pool || pool.status !== PoolStatus.dead) {
      throw new Error(
        `Pool ${poolId} is not in dead status, cannot void to credit.`,
      );
    }

    const joins = await tx.poolJoin.findMany({
      where: {
        poolId,
        leftVoluntarilyAt: null,
        transaction: { status: TransactionStatus.paid },
      },
      include: { transaction: true },
    });

    let voidedCount = 0;
    for (const join of joins) {
      if (!join.transaction) continue;

      // Update Transaction status to voided
      await tx.transaction.update({
        where: { id: join.transaction.id },
        data: {
          status: TransactionStatus.voided,
        },
      });

      // Issue buyer credit for dead pool refund
      await tx.buyerCredit.create({
        data: {
          userId: join.buyerId,
          amountPesewas: join.transaction.amountPesewas,
          sourceType: CreditSourceType.dead_pool,
          sourcePoolId: poolId,
          transactionId: join.transaction.id,
        },
      });

      voidedCount++;
    }

    return { voidedCount };
  });
}
