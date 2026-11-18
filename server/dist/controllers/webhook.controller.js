"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMoolreWebhook = void 0;
const client_1 = require("@prisma/client");
const db_1 = require("../db");
const moolre_service_1 = require("../services/moolre.service");
const notification_service_1 = require("../services/notification.service");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const handleMoolreWebhook = async (req, res) => {
    try {
        const signature = req.headers["x-moolre-signature"];
        const isValidSignature = moolre_service_1.moolreService.verifyWebhookSignature(req.body, signature);
        if (!isValidSignature) {
            res.status(401).json({ error: "Invalid webhook signature" });
            return;
        }
        const body = req.body;
        const externalRef = body.data?.externalref ||
            body.externalref ||
            body.idempotencyKey;
        const moolreTxRef = body.data?.transactionid ||
            body.transactionid ||
            body.moolreTxRef;
        const statusVal = body.status;
        if (!externalRef || typeof externalRef !== "string") {
            res.status(400).json({ error: "externalref/idempotencyKey is required" });
            return;
        }
        const transaction = await db_1.prisma.transaction.findUnique({
            where: { idempotencyKey: externalRef },
            include: {
                poolJoin: true,
            },
        });
        if (!transaction) {
            res
                .status(404)
                .json({ error: "Transaction not found for external reference" });
            return;
        }
        // Idempotency check: if transaction already processed
        if (transaction.status === client_1.TransactionStatus.paid ||
            transaction.status === client_1.TransactionStatus.disbursed) {
            res.status(200).json({
                message: "Webhook already processed",
                status: transaction.status,
            });
            return;
        }
        const isSuccess = statusVal === 1 ||
            statusVal === "1" ||
            body.code === "P01" ||
            body.code === "SS01" ||
            body.code === "TR099" ||
            body.status === "SUCCESS" ||
            body.status === "PAID";
        if (isSuccess) {
            await db_1.prisma.$transaction(async (tx) => {
                // 1. Update Transaction state
                await tx.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        status: client_1.TransactionStatus.paid,
                        moolreTxRef: moolreTxRef ? String(moolreTxRef) : undefined,
                    },
                });
                // 2. Lock poolJoin editable state
                if (transaction.poolJoin) {
                    await tx.poolJoin.update({
                        where: { id: transaction.poolJoin.id },
                        data: { editableUntilPaid: false },
                    });
                    // 3. Recalculate pool total contribution
                    const poolId = transaction.poolJoin.poolId;
                    const pool = await tx.pool.findUnique({
                        where: { id: poolId },
                        include: { leader: true },
                    });
                    if (pool && pool.status === client_1.PoolStatus.open) {
                        const activeJoins = await tx.poolJoin.findMany({
                            where: { poolId, leftVoluntarilyAt: null },
                        });
                        const currentTotalPesewas = activeJoins.reduce((sum, j) => sum + j.contributionPesewas, 0);
                        const CART_FLOOR_PESEWAS = config_1.TEMU_MIN_ORDER_PESEWAS;
                        if (currentTotalPesewas >= CART_FLOOR_PESEWAS) {
                            const now = new Date();
                            const shipDeadlineAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
                            await tx.pool.update({
                                where: { id: poolId },
                                data: {
                                    status: client_1.PoolStatus.funded,
                                    fundedAt: now,
                                    shipDeadlineAt,
                                },
                            });
                            // Dispatch pool_funded notification (SMS + In-app) to all buyers in pool
                            for (const join of activeJoins) {
                                (0, notification_service_1.dispatchNotification)({
                                    userId: join.buyerId,
                                    type: client_1.NotificationType.pool_funded,
                                    payload: {
                                        poolTitle: pool.title,
                                        leaderName: pool.leader?.name || "Group Leader",
                                        itemCostHours: pool.itemCostDeadlineHours || 24,
                                    },
                                    sendSmsChannel: true,
                                });
                            }
                        }
                    }
                }
            });
            res.status(200).json({
                success: true,
                message: "Payment confirmed and transaction updated to paid",
            });
            return;
        }
        else {
            // Mark transaction failed
            await db_1.prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: client_1.TransactionStatus.failed },
            });
            res.status(200).json({
                success: true,
                message: "Transaction updated to failed",
            });
            return;
        }
    }
    catch (error) {
        logger_1.logger.error("Error handling Moolre webhook:", error);
        res.status(500).json({ error: "Internal server error processing webhook" });
    }
};
exports.handleMoolreWebhook = handleMoolreWebhook;
