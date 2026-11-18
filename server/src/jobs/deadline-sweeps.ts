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
import { getPgBoss } from "./boss.scheduler";
import { logger } from "../utils/logger";

/**
 * Non-blocking notification dispatcher:
 * Enqueues to PgBoss queue if worker is running; otherwise fires asynchronously without blocking the sweep.
 */
function queueNotification(data: {
  userId: string;
  type: NotificationType;
  payload: any;
  sendSmsChannel?: boolean;
}) {
  const boss = getPgBoss();
  if (boss) {
    boss.send("send-notification", data).catch((err) => {
      logger.error("Failed to enqueue notification to PgBoss queue:", err);
    });
  } else {
    // Non-blocking fallback
    dispatchNotification(data).catch((err) => {
      logger.error("Failed to dispatch notification asynchronously:", err);
    });
  }
}

/**
 * Sweeps expired open pools (now > deadlineAt).
 * Succeeded pools (>= 350 GHS / 35,000 pesewas) -> funded & disbursed.
 * Failed pools (< 350 GHS) -> dead & voided to buyer credit.
 * Processed in bounded batches of 50 to avoid memory spikes.
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
    take: 50,
    orderBy: { deadlineAt: "asc" },
  });

  if (expiredPools.length === 0) {
    return { total: 0, succeededCount: 0, deadCount: 0 };
  }

  let succeededCount = 0;
  let deadCount = 0;

  for (const pool of expiredPools) {
    const totalContributedPesewas = pool.joins.reduce(
      (sum, j) => sum + j.contributionPesewas,
      0
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

      // Notify buyers asynchronously
      for (const j of pool.joins) {
        queueNotification({
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

      // Notify pool leader if not already notified
      const buyerIds = new Set(pool.joins.map((j) => j.buyerId));
      if (!buyerIds.has(pool.leaderId)) {
        queueNotification({
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
        queueNotification({
          userId: j.buyerId,
          type: NotificationType.pool_dead,
          payload: {
            poolTitle: pool.title,
          },
          sendSmsChannel: true,
        });
      }

      const buyerIds = new Set(pool.joins.map((j) => j.buyerId));
      if (!buyerIds.has(pool.leaderId)) {
        queueNotification({
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

  logger.info(
    `[SWEEP] Join Deadlines: Processed ${expiredPools.length} pool(s) (${succeededCount} funded, ${deadCount} dead).`
  );
  return { total: expiredPools.length, succeededCount, deadCount };
}

/**
 * Sweeps buyers who missed item cost sub-deadlines (now > itemCostDeadlineAt).
 * Marks itemCostStatus = dropped and refunds join fee if paid.
 * Uses batch updates for unpaid joins and atomic transaction for paid refunds.
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
    take: 100,
    orderBy: { itemCostDeadlineAt: "asc" },
  });

  if (droppedJoins.length === 0) {
    return { droppedCount: 0 };
  }

  // Partition joins: those without paid transactions vs those needing credit refunds
  const joinsWithoutPaidTx = droppedJoins.filter(
    (j) => !j.transaction || j.transaction.status !== TransactionStatus.paid
  );
  const joinsWithPaidTx = droppedJoins.filter(
    (j) => j.transaction && j.transaction.status === TransactionStatus.paid
  );

  // 1. Batch update joins without paid transactions in a single query
  if (joinsWithoutPaidTx.length > 0) {
    await prisma.poolJoin.updateMany({
      where: { id: { in: joinsWithoutPaidTx.map((j) => j.id) } },
      data: { itemCostStatus: ItemCostStatus.dropped },
    });
  }

  // 2. Process joins requiring financial credit refunds inside atomic transaction
  if (joinsWithPaidTx.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const join of joinsWithPaidTx) {
        if (!join.transaction) continue;

        await tx.poolJoin.update({
          where: { id: join.id },
          data: { itemCostStatus: ItemCostStatus.dropped },
        });

        await tx.transaction.update({
          where: { id: join.transaction.id },
          data: { status: TransactionStatus.voided },
        });

        await tx.buyerCredit.create({
          data: {
            userId: join.buyerId,
            amountPesewas: join.transaction.amountPesewas,
            sourceType: CreditSourceType.dropped_join,
            sourcePoolId: join.poolId,
            transactionId: join.transaction.id,
          },
        });
      }
    });
  }

  logger.info(
    `[SWEEP] Item Cost Deadlines: Marked ${droppedJoins.length} buyer join(s) as dropped (${joinsWithPaidTx.length} refunded to credit).`
  );
  return { droppedCount: droppedJoins.length };
}

/**
 * Sweeps funded/ordered pools past shipDeadlineAt with no tracking number.
 * Auto-raises 'shipping_deadline_missed' disputes in bulk (2 queries total).
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
    take: 50,
    orderBy: { shipDeadlineAt: "asc" },
  });

  const allJoins = breachedPools.flatMap((p) => p.joins);
  if (allJoins.length === 0) {
    return { disputesCreated: 0 };
  }

  const joinIds = allJoins.map((j) => j.id);

  // Single bulk query to find all joins that already have shipping deadline disputes
  const existingDisputes = await prisma.dispute.findMany({
    where: {
      poolJoinId: { in: joinIds },
      type: DisputeType.shipping_deadline_missed,
    },
    select: { poolJoinId: true },
  });

  const existingDisputeJoinIds = new Set(existingDisputes.map((d) => d.poolJoinId));

  // Filter only joins that need a dispute created
  const disputesToCreate = allJoins
    .filter((j) => !existingDisputeJoinIds.has(j.id))
    .map((j) => ({
      poolJoinId: j.id,
      raisedById: j.buyerId,
      type: DisputeType.shipping_deadline_missed,
      status: DisputeStatus.open,
      reason:
        "System auto-flag: Leader did not enter tracking number or ship order within 24-48h of pool funding deadline.",
    }));

  if (disputesToCreate.length > 0) {
    // Single bulk insert query
    await prisma.dispute.createMany({
      data: disputesToCreate,
      skipDuplicates: true,
    });

    logger.info(
      `[SWEEP] Shipping Deadlines: Bulk created ${disputesToCreate.length} dispute(s).`
    );
  }

  return { disputesCreated: disputesToCreate.length };
}

/**
 * Reconciles stuck pending transactions older than 15 minutes.
 * Executed as a single atomic SQL updateMany query.
 */
export async function reconcilePendingTransactions() {
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);

  const result = await prisma.transaction.updateMany({
    where: {
      status: TransactionStatus.pending,
      createdAt: { lt: fifteenMinsAgo },
    },
    data: { status: TransactionStatus.failed },
  });

  if (result.count > 0) {
    logger.info(
      `[RECONCILE] Stale Transactions: Marked ${result.count} pending transaction(s) as failed in single batch.`
    );
  }
  return { reconciledCount: result.count };
}
