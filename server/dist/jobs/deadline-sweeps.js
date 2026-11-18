"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sweepExpiredJoinDeadlines = sweepExpiredJoinDeadlines;
exports.sweepExpiredItemCostDeadlines = sweepExpiredItemCostDeadlines;
exports.sweepMissedShippingDeadlines = sweepMissedShippingDeadlines;
exports.reconcilePendingTransactions = reconcilePendingTransactions;
const client_1 = require("@prisma/client");
const db_1 = require("../db");
const ledger_service_1 = require("../services/ledger.service");
const notification_service_1 = require("../services/notification.service");
const config_1 = require("../config");
const boss_scheduler_1 = require("./boss.scheduler");
const logger_1 = require("../utils/logger");
/**
 * Non-blocking notification dispatcher:
 * Enqueues to PgBoss queue if worker is running; otherwise fires asynchronously without blocking the sweep.
 */
function queueNotification(data) {
    const boss = (0, boss_scheduler_1.getPgBoss)();
    if (boss) {
        boss.send("send-notification", data).catch((err) => {
            logger_1.logger.error("Failed to enqueue notification to PgBoss queue:", err);
        });
    }
    else {
        // Non-blocking fallback
        (0, notification_service_1.dispatchNotification)(data).catch((err) => {
            logger_1.logger.error("Failed to dispatch notification asynchronously:", err);
        });
    }
}
/**
 * Sweeps expired open pools (now > deadlineAt).
 * Succeeded pools (>= 350 GHS / 35,000 pesewas) -> funded & disbursed.
 * Failed pools (< 350 GHS) -> dead & voided to buyer credit.
 * Processed in bounded batches of 50 to avoid memory spikes.
 */
async function sweepExpiredJoinDeadlines() {
    const now = new Date();
    const expiredPools = await db_1.prisma.pool.findMany({
        where: {
            status: client_1.PoolStatus.open,
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
        const totalContributedPesewas = pool.joins.reduce((sum, j) => sum + j.contributionPesewas, 0);
        const CART_FLOOR_PESEWAS = config_1.TEMU_MIN_ORDER_PESEWAS;
        if (totalContributedPesewas >= CART_FLOOR_PESEWAS) {
            // Pool Succeeded!
            const shipDeadlineAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
            await db_1.prisma.pool.update({
                where: { id: pool.id },
                data: {
                    status: client_1.PoolStatus.funded,
                    fundedAt: now,
                    shipDeadlineAt,
                },
            });
            await (0, ledger_service_1.disbursePoolTransactions)(pool.id);
            // Notify buyers asynchronously
            for (const j of pool.joins) {
                queueNotification({
                    userId: j.buyerId,
                    type: client_1.NotificationType.pool_funded,
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
                    type: client_1.NotificationType.pool_funded,
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
        }
        else {
            // Pool Failed (Under 350 GHS) -> Mark Dead & Void to Buyer Credit
            await db_1.prisma.pool.update({
                where: { id: pool.id },
                data: { status: client_1.PoolStatus.dead },
            });
            await (0, ledger_service_1.voidPoolTransactionsToCredit)(pool.id);
            for (const j of pool.joins) {
                queueNotification({
                    userId: j.buyerId,
                    type: client_1.NotificationType.pool_dead,
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
                    type: client_1.NotificationType.pool_dead,
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
    logger_1.logger.info(`[SWEEP] Join Deadlines: Processed ${expiredPools.length} pool(s) (${succeededCount} funded, ${deadCount} dead).`);
    return { total: expiredPools.length, succeededCount, deadCount };
}
/**
 * Sweeps buyers who missed item cost sub-deadlines (now > itemCostDeadlineAt).
 * Marks itemCostStatus = dropped and refunds join fee if paid.
 * Uses batch updates for unpaid joins and atomic transaction for paid refunds.
 */
async function sweepExpiredItemCostDeadlines() {
    const now = new Date();
    const droppedJoins = await db_1.prisma.poolJoin.findMany({
        where: {
            itemCostStatus: client_1.ItemCostStatus.unpaid,
            itemCostDeadlineAt: { lt: now },
            leftVoluntarilyAt: null,
            pool: {
                status: client_1.PoolStatus.funded,
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
    const joinsWithoutPaidTx = droppedJoins.filter((j) => !j.transaction || j.transaction.status !== client_1.TransactionStatus.paid);
    const joinsWithPaidTx = droppedJoins.filter((j) => j.transaction && j.transaction.status === client_1.TransactionStatus.paid);
    // 1. Batch update joins without paid transactions in a single query
    if (joinsWithoutPaidTx.length > 0) {
        await db_1.prisma.poolJoin.updateMany({
            where: { id: { in: joinsWithoutPaidTx.map((j) => j.id) } },
            data: { itemCostStatus: client_1.ItemCostStatus.dropped },
        });
    }
    // 2. Process joins requiring financial credit refunds inside atomic transaction
    if (joinsWithPaidTx.length > 0) {
        await db_1.prisma.$transaction(async (tx) => {
            for (const join of joinsWithPaidTx) {
                if (!join.transaction)
                    continue;
                await tx.poolJoin.update({
                    where: { id: join.id },
                    data: { itemCostStatus: client_1.ItemCostStatus.dropped },
                });
                await tx.transaction.update({
                    where: { id: join.transaction.id },
                    data: { status: client_1.TransactionStatus.voided },
                });
                await tx.buyerCredit.create({
                    data: {
                        userId: join.buyerId,
                        amountPesewas: join.transaction.amountPesewas,
                        sourceType: client_1.CreditSourceType.dropped_join,
                        sourcePoolId: join.poolId,
                        transactionId: join.transaction.id,
                    },
                });
            }
        });
    }
    logger_1.logger.info(`[SWEEP] Item Cost Deadlines: Marked ${droppedJoins.length} buyer join(s) as dropped (${joinsWithPaidTx.length} refunded to credit).`);
    return { droppedCount: droppedJoins.length };
}
/**
 * Sweeps funded/ordered pools past shipDeadlineAt with no tracking number.
 * Auto-raises 'shipping_deadline_missed' disputes in bulk (2 queries total).
 */
async function sweepMissedShippingDeadlines() {
    const now = new Date();
    const breachedPools = await db_1.prisma.pool.findMany({
        where: {
            status: { in: [client_1.PoolStatus.funded, client_1.PoolStatus.ordered] },
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
    const existingDisputes = await db_1.prisma.dispute.findMany({
        where: {
            poolJoinId: { in: joinIds },
            type: client_1.DisputeType.shipping_deadline_missed,
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
        type: client_1.DisputeType.shipping_deadline_missed,
        status: client_1.DisputeStatus.open,
        reason: "System auto-flag: Leader did not enter tracking number or ship order within 24-48h of pool funding deadline.",
    }));
    if (disputesToCreate.length > 0) {
        // Single bulk insert query
        await db_1.prisma.dispute.createMany({
            data: disputesToCreate,
            skipDuplicates: true,
        });
        logger_1.logger.info(`[SWEEP] Shipping Deadlines: Bulk created ${disputesToCreate.length} dispute(s).`);
    }
    return { disputesCreated: disputesToCreate.length };
}
/**
 * Reconciles stuck pending transactions older than 15 minutes.
 * Executed as a single atomic SQL updateMany query.
 */
async function reconcilePendingTransactions() {
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    const result = await db_1.prisma.transaction.updateMany({
        where: {
            status: client_1.TransactionStatus.pending,
            createdAt: { lt: fifteenMinsAgo },
        },
        data: { status: client_1.TransactionStatus.failed },
    });
    if (result.count > 0) {
        logger_1.logger.info(`[RECONCILE] Stale Transactions: Marked ${result.count} pending transaction(s) as failed in single batch.`);
    }
    return { reconciledCount: result.count };
}
