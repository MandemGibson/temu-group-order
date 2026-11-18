"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disbursePoolTransactions = disbursePoolTransactions;
exports.voidPoolTransactionsToCredit = voidPoolTransactionsToCredit;
const client_1 = require("@prisma/client");
const db_1 = require("../db");
const moolre_service_1 = require("./moolre.service");
const logger_1 = require("../utils/logger");
/**
 * Disburse join fee splits when a pool succeeds (reaches 'funded' status).
 * Sets paid transactions to 'disbursed' and initiates MoMo payout to leader via Moolre Transfer API.
 */
async function disbursePoolTransactions(poolId) {
    const pool = await db_1.prisma.pool.findUnique({
        where: { id: poolId },
        include: { leader: true },
    });
    if (!pool ||
        (pool.status !== client_1.PoolStatus.funded &&
            pool.status !== client_1.PoolStatus.ordered &&
            pool.status !== client_1.PoolStatus.shipped &&
            pool.status !== client_1.PoolStatus.delivered)) {
        throw new Error(`Pool ${poolId} is not in a funded/completed status, cannot disburse fees.`);
    }
    const joins = await db_1.prisma.poolJoin.findMany({
        where: {
            poolId,
            leftVoluntarilyAt: null,
            transaction: { status: client_1.TransactionStatus.paid },
        },
        include: { transaction: true },
    });
    let disbursedCount = 0;
    let totalLeaderPesewas = 0;
    for (const join of joins) {
        if (!join.transaction)
            continue;
        await db_1.prisma.transaction.update({
            where: { id: join.transaction.id },
            data: {
                status: client_1.TransactionStatus.disbursed,
            },
        });
        totalLeaderPesewas += join.transaction.leaderSharePesewas;
        disbursedCount++;
    }
    // Initiate real MoMo payout transfer to leader via Moolre Transfer API
    if (totalLeaderPesewas > 0 && pool.leader?.phone) {
        const payoutRef = `PAYOUT_${pool.id.slice(0, 8)}_${Date.now()}`;
        logger_1.logger.info(`💸 Initiating Moolre MoMo Payout to Leader ${pool.leader.name} (${pool.leader.phone}): GH₵ ${(totalLeaderPesewas / 100).toFixed(2)}`);
        const payoutResult = await moolre_service_1.moolreService.initiatePayoutTransfer({
            receiverPhone: pool.leader.phone,
            amountPesewas: totalLeaderPesewas,
            externalRef: payoutRef,
            reference: `Fides Leader Payout for ${pool.title.slice(0, 20)}`,
        });
        logger_1.logger.info(`💸 Moolre Payout Result:`, payoutResult);
    }
    return { disbursedCount, totalLeaderPesewas };
}
/**
 * Void join fees to buyer credit when a pool dies (fails to reach 350 GHS minimum).
 * Sets paid transactions to 'voided' and creates positive BuyerCredit ledger entries.
 */
async function voidPoolTransactionsToCredit(poolId) {
    return db_1.prisma.$transaction(async (tx) => {
        const pool = await tx.pool.findUnique({ where: { id: poolId } });
        if (!pool || pool.status !== client_1.PoolStatus.dead) {
            throw new Error(`Pool ${poolId} is not in dead status, cannot void to credit.`);
        }
        const joins = await tx.poolJoin.findMany({
            where: {
                poolId,
                leftVoluntarilyAt: null,
                transaction: { status: client_1.TransactionStatus.paid },
            },
            include: { transaction: true },
        });
        let voidedCount = 0;
        for (const join of joins) {
            if (!join.transaction)
                continue;
            // Update Transaction status to voided
            await tx.transaction.update({
                where: { id: join.transaction.id },
                data: {
                    status: client_1.TransactionStatus.voided,
                },
            });
            // Issue buyer credit for dead pool refund
            await tx.buyerCredit.create({
                data: {
                    userId: join.buyerId,
                    amountPesewas: join.transaction.amountPesewas,
                    sourceType: client_1.CreditSourceType.dead_pool,
                    sourcePoolId: poolId,
                    transactionId: join.transaction.id,
                },
            });
            voidedCount++;
        }
        return { voidedCount };
    });
}
