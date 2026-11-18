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
/**
 * Sweeps expired open pools (now > deadlineAt).
 * Succeeded pools (>= 350 GHS / 35,000 pesewas) -> funded & disbursed.
 * Failed pools (< 350 GHS) -> dead & voided to buyer credit.
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
    });
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
            // Notify buyers
            for (const j of pool.joins) {
                (0, notification_service_1.dispatchNotification)({
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
            // Notify pool leader if not already notified in joins loop
            const buyerIds = new Set(pool.joins.map((j) => j.buyerId));
            if (!buyerIds.has(pool.leaderId)) {
                (0, notification_service_1.dispatchNotification)({
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
                (0, notification_service_1.dispatchNotification)({
                    userId: j.buyerId,
                    type: client_1.NotificationType.pool_dead,
                    payload: {
                        poolTitle: pool.title,
                    },
                    sendSmsChannel: true,
                });
            }
            // Notify pool leader if not already in joins loop
            const buyerIds = new Set(pool.joins.map((j) => j.buyerId));
            if (!buyerIds.has(pool.leaderId)) {
                (0, notification_service_1.dispatchNotification)({
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
    console.log(`[SWEEP] Join Deadlines: Processed ${expiredPools.length} pool(s) (${succeededCount} funded, ${deadCount} dead).`);
    return { total: expiredPools.length, succeededCount, deadCount };
}
/**
 * Sweeps buyers who missed item cost sub-deadlines (now > itemCostDeadlineAt).
 * Marks itemCostStatus = dropped and refunds join fee if paid.
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
    });
    let count = 0;
    for (const join of droppedJoins) {
        await db_1.prisma.poolJoin.update({
            where: { id: join.id },
            data: { itemCostStatus: client_1.ItemCostStatus.dropped },
        });
        // If join fee was paid, refund to credit as dropped_join
        if (join.transaction &&
            join.transaction.status === client_1.TransactionStatus.paid) {
            await db_1.prisma.transaction.update({
                where: { id: join.transaction.id },
                data: { status: client_1.TransactionStatus.voided },
            });
            await db_1.prisma.buyerCredit.create({
                data: {
                    userId: join.buyerId,
                    amountPesewas: join.transaction.amountPesewas,
                    sourceType: client_1.CreditSourceType.dropped_join,
                    sourcePoolId: join.poolId,
                    transactionId: join.transaction.id,
                },
            });
        }
        count++;
    }
    if (count > 0) {
        console.log(`[SWEEP] Item Cost Deadlines: Marked ${count} buyer join(s) as dropped.`);
    }
    return { droppedCount: count };
}
/**
 * Sweeps funded/ordered pools past shipDeadlineAt with no tracking number.
 * Auto-raises 'shipping_deadline_missed' disputes.
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
    });
    let disputesCreated = 0;
    for (const pool of breachedPools) {
        for (const join of pool.joins) {
            // Check if dispute already exists for this join
            const existing = await db_1.prisma.dispute.findFirst({
                where: {
                    poolJoinId: join.id,
                    type: client_1.DisputeType.shipping_deadline_missed,
                },
            });
            if (!existing) {
                await db_1.prisma.dispute.create({
                    data: {
                        poolJoinId: join.id,
                        raisedById: join.buyerId,
                        type: client_1.DisputeType.shipping_deadline_missed,
                        status: client_1.DisputeStatus.open,
                        reason: "System auto-flag: Leader did not enter tracking number or ship order within 24-48h of pool funding deadline.",
                    },
                });
                disputesCreated++;
            }
        }
    }
    if (disputesCreated > 0) {
        console.log(`[SWEEP] Shipping Deadlines: Auto-created ${disputesCreated} dispute(s).`);
    }
    return { disputesCreated };
}
/**
 * Reconciles stuck pending transactions older than 15 minutes.
 */
async function reconcilePendingTransactions() {
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    const staleTransactions = await db_1.prisma.transaction.findMany({
        where: {
            status: client_1.TransactionStatus.pending,
            createdAt: { lt: fifteenMinsAgo },
        },
    });
    let reconciledCount = 0;
    for (const tx of staleTransactions) {
        await db_1.prisma.transaction.update({
            where: { id: tx.id },
            data: { status: client_1.TransactionStatus.failed },
        });
        reconciledCount++;
    }
    if (reconciledCount > 0) {
        console.log(`[RECONCILE] Stale Transactions: Marked ${reconciledCount} pending transaction(s) as failed.`);
    }
    return { reconciledCount };
}
