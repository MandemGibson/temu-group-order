import {
  PoolStatus,
  ItemCostStatus,
  TransactionStatus,
  CreditSourceType,
  DisputeType,
  DisputeStatus,
  NotificationType,
} from "@prisma/client";
import { prisma } from "../db";
import {
  disbursePoolTransactions,
  voidPoolTransactionsToCredit,
} from "../services/ledger.service";
import { dispatchNotification } from "../services/notification.service";
import { TEMU_MIN_ORDER_PESEWAS } from "../config";

/**
 * Sweeps expired open pools (now > deadlineAt).
 * Succeeded pools (>= 350 GHS / 35,000 pesewas) -> funded & disbursed.
 * Failed pools (< 350 GHS) -> dead & voided to buyer credit.
 */
export async function sweepExpiredJoinDeadlines() {
  const now = new Date();

  const expiredPools = await prisma.pool.findMany({
    where: {
      status: PoolStatus.open,
      deadlineAt: { lt: now },
    },
    include: {
      leader: true,
      joins: {
        where: { leftVoluntarilyAt: null },
      },
    },
  });

  let succeededCount = 0;
  let deadCount = 0;

  for (const pool of expiredPools) {
    const totalContributedPesewas = pool.joins.reduce(
      (sum, j) => sum + j.contributionPesewas,
      0,
    );

    const CART_FLOOR_PESEWAS = TEMU_MIN_ORDER_PESEWAS;

    if (totalContributedPesewas >= CART_FLOOR_PESEWAS) {
      // Pool Succeeded!
      const shipDeadlineAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      await prisma.pool.update({
        where: { id: pool.id },
        data: {
          status: PoolStatus.funded,
          fundedAt: now,
          shipDeadlineAt,
        },
      });

      await disbursePoolTransactions(pool.id);

      // Notify buyers
      for (const j of pool.joins) {
        dispatchNotification({
          userId: j.buyerId,
          type: NotificationType.pool_funded,
          payload: {
            poolTitle: pool.title,
            leaderName: pool.leader?.name || "Group Leader",
            itemCostHours: pool.itemCostDeadlineHours || 24,
          },
          sendSmsChannel: true,
        });
      }

      // Notify pool leader if not already notified in joins loop
      const buyerIds = new Set(pool.joins.map((j) => j.buyerId));
      if (!buyerIds.has(pool.leaderId)) {
        dispatchNotification({
          userId: pool.leaderId,
          type: NotificationType.pool_funded,
          payload: {
            poolTitle: pool.title,
            leaderName: pool.leader?.name || "Group Leader",
            itemCostHours: pool.itemCostDeadlineHours || 24,
            isLeader: true,
          },
          sendSmsChannel: true,
        });
      }

      succeededCount++;
    } else {
      // Pool Failed (Under 350 GHS) -> Mark Dead & Void to Buyer Credit
      await prisma.pool.update({
        where: { id: pool.id },
        data: { status: PoolStatus.dead },
      });

      await voidPoolTransactionsToCredit(pool.id);

      for (const j of pool.joins) {
        dispatchNotification({
          userId: j.buyerId,
          type: NotificationType.pool_dead,
          payload: {
            poolTitle: pool.title,
          },
          sendSmsChannel: true,
        });
      }

      // Notify pool leader if not already in joins loop
      const buyerIds = new Set(pool.joins.map((j) => j.buyerId));
      if (!buyerIds.has(pool.leaderId)) {
        dispatchNotification({
          userId: pool.leaderId,
          type: NotificationType.pool_dead,
          payload: {
            poolTitle: pool.title,
            isLeader: true,
          },
          sendSmsChannel: true,
        });
      }

      deadCount++;
    }
  }

  console.log(
    `[SWEEP] Join Deadlines: Processed ${expiredPools.length} pool(s) (${succeededCount} funded, ${deadCount} dead).`,
  );
  return { total: expiredPools.length, succeededCount, deadCount };
}

/**
 * Sweeps buyers who missed item cost sub-deadlines (now > itemCostDeadlineAt).
 * Marks itemCostStatus = dropped and refunds join fee if paid.
 */
export async function sweepExpiredItemCostDeadlines() {
  const now = new Date();

  const droppedJoins = await prisma.poolJoin.findMany({
    where: {
      itemCostStatus: ItemCostStatus.unpaid,
      itemCostDeadlineAt: { lt: now },
      leftVoluntarilyAt: null,
      pool: {
        status: PoolStatus.funded,
      },
    },
    include: {
      transaction: true,
    },
  });

  let count = 0;
  for (const join of droppedJoins) {
    await prisma.poolJoin.update({
      where: { id: join.id },
      data: { itemCostStatus: ItemCostStatus.dropped },
    });

    // If join fee was paid, refund to credit as dropped_join
    if (
      join.transaction &&
      join.transaction.status === TransactionStatus.paid
    ) {
      await prisma.transaction.update({
        where: { id: join.transaction.id },
        data: { status: TransactionStatus.voided },
      });

      await prisma.buyerCredit.create({
        data: {
          userId: join.buyerId,
          amountPesewas: join.transaction.amountPesewas,
          sourceType: CreditSourceType.dropped_join,
          sourcePoolId: join.poolId,
          transactionId: join.transaction.id,
        },
      });
    }

    count++;
  }

  if (count > 0) {
    console.log(
      `[SWEEP] Item Cost Deadlines: Marked ${count} buyer join(s) as dropped.`,
    );
  }
  return { droppedCount: count };
}

/**
 * Sweeps funded/ordered pools past shipDeadlineAt with no tracking number.
 * Auto-raises 'shipping_deadline_missed' disputes.
 */
export async function sweepMissedShippingDeadlines() {
  const now = new Date();

  const breachedPools = await prisma.pool.findMany({
    where: {
      status: { in: [PoolStatus.funded, PoolStatus.ordered] },
      shipDeadlineAt: { lt: now },
      shippedAt: null,
    },
    include: {
      joins: {
        where: { leftVoluntarilyAt: null },
      },
    },
  });

  let disputesCreated = 0;

  for (const pool of breachedPools) {
    for (const join of pool.joins) {
      // Check if dispute already exists for this join
      const existing = await prisma.dispute.findFirst({
        where: {
          poolJoinId: join.id,
          type: DisputeType.shipping_deadline_missed,
        },
      });

      if (!existing) {
        await prisma.dispute.create({
          data: {
            poolJoinId: join.id,
            raisedById: join.buyerId,
            type: DisputeType.shipping_deadline_missed,
            status: DisputeStatus.open,
            reason:
              "System auto-flag: Leader did not enter tracking number or ship order within 24-48h of pool funding deadline.",
          },
        });
        disputesCreated++;
      }
    }
  }

  if (disputesCreated > 0) {
    console.log(
      `[SWEEP] Shipping Deadlines: Auto-created ${disputesCreated} dispute(s).`,
    );
  }
  return { disputesCreated };
}

/**
 * Reconciles stuck pending transactions older than 15 minutes.
 */
export async function reconcilePendingTransactions() {
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);

  const staleTransactions = await prisma.transaction.findMany({
    where: {
      status: TransactionStatus.pending,
      createdAt: { lt: fifteenMinsAgo },
    },
  });

  let reconciledCount = 0;
  for (const tx of staleTransactions) {
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { status: TransactionStatus.failed },
    });
    reconciledCount++;
  }

  if (reconciledCount > 0) {
    console.log(
      `[RECONCILE] Stale Transactions: Marked ${reconciledCount} pending transaction(s) as failed.`,
    );
  }
  return { reconciledCount };
}
