"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.leavePool = exports.updateJoin = exports.joinPool = void 0;
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("@prisma/client");
const db_1 = require("../db");
const moolre_service_1 = require("../services/moolre.service");
const notification_service_1 = require("../services/notification.service");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const joinPool = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const poolId = String(req.params.id);
        const buyerId = req.user.id;
        const { items, itemDescription, temuItemUrl, itemSpecs, itemScreenshotUrl, contributionPesewas, idempotencyKey, } = req.body;
        // Parse multi-item cart entries
        let rawItems = Array.isArray(items) && items.length > 0 ? items : [];
        // Fallback if legacy single item fields sent
        if (rawItems.length === 0 && itemDescription) {
            rawItems.push({
                itemDescription,
                temuItemUrl,
                itemSpecs,
                itemScreenshotUrl,
                estimatedCostGhs: contributionPesewas ? Number(contributionPesewas) / 100 : undefined,
            });
        }
        if (rawItems.length === 0 && (!contributionPesewas || isNaN(Number(contributionPesewas)))) {
            res.status(400).json({ error: "At least one cart item or valid contribution algorithm is required" });
            return;
        }
        const itemsToCreate = rawItems.map((it) => ({
            itemDescription: String(it.itemDescription || "Temu Cart Item"),
            temuItemUrl: it.temuItemUrl ? String(it.temuItemUrl) : null,
            itemSpecs: it.itemSpecs ? String(it.itemSpecs) : null,
            quantity: Math.max(1, Number(it.quantity || 1)),
            estimatedCostGhs: it.estimatedCostGhs ? Number(it.estimatedCostGhs) : null,
            itemScreenshotUrl: it.itemScreenshotUrl ? String(it.itemScreenshotUrl) : null,
        }));
        // Calculate contribution from items or parameter
        let contributionNum = Number(contributionPesewas || 0);
        if (!contributionNum && itemsToCreate.length > 0) {
            const totalGhs = itemsToCreate.reduce((sum, item) => {
                return sum + (Number(item.estimatedCostGhs || 0) * item.quantity);
            }, 0);
            contributionNum = Math.round(totalGhs * 100);
        }
        const keyToUse = idempotencyKey
            ? String(idempotencyKey)
            : crypto_1.default.randomUUID();
        // Perform atomic transaction with internal balance & capacity validation
        const result = await db_1.prisma.$transaction(async (tx) => {
            // 1. Re-fetch and lock pool status & joins inside transaction
            const pool = await tx.pool.findUnique({
                where: { id: poolId },
                include: {
                    leader: true,
                    joins: {
                        where: { leftVoluntarilyAt: null },
                    },
                },
            });
            if (!pool) {
                throw new Error("NOT_FOUND: Pool not found");
            }
            if (pool.status !== client_1.PoolStatus.open) {
                throw new Error(`BAD_REQUEST: Cannot join pool with status '${pool.status}'`);
            }
            if (new Date() > pool.deadlineAt) {
                throw new Error("BAD_REQUEST: Join deadline for this pool has passed");
            }
            if (pool.joins.length >= pool.maxParticipants) {
                throw new Error("BAD_REQUEST: Pool has reached maximum participant capacity");
            }
            const existingJoin = pool.joins.find((j) => j.buyerId === buyerId);
            if (existingJoin) {
                throw new Error("BAD_REQUEST: You have already joined this pool");
            }
            // 2. Calculate current available buyer credit atomically inside transaction
            const creditAggregate = await tx.buyerCredit.aggregate({
                where: { userId: buyerId },
                _sum: { amountPesewas: true },
            });
            const availableCredit = Math.max(0, creditAggregate._sum.amountPesewas || 0);
            const joinFee = pool.joinFeePesewas;
            const creditApplied = Math.min(availableCredit, joinFee);
            const moolrePaid = joinFee - creditApplied;
            // Calculate commission split
            const platformSharePesewas = Math.round((joinFee * pool.platformCommissionBps) / 10000);
            const leaderSharePesewas = joinFee - platformSharePesewas;
            // 3. If credit is applied, add negative ledger entry
            let creditRecord = null;
            if (creditApplied > 0) {
                creditRecord = await tx.buyerCredit.create({
                    data: {
                        userId: buyerId,
                        amountPesewas: -creditApplied,
                        sourceType: client_1.CreditSourceType.join_fee_spend,
                        sourcePoolId: pool.id,
                    },
                });
            }
            // 4. Create Transaction
            const transaction = await tx.transaction.create({
                data: {
                    userId: buyerId,
                    amountPesewas: joinFee,
                    status: moolrePaid === 0
                        ? client_1.TransactionStatus.paid
                        : client_1.TransactionStatus.pending,
                    idempotencyKey: keyToUse,
                    leaderSharePesewas,
                    platformSharePesewas,
                },
            });
            // Link credit entry to transaction if created
            if (creditRecord) {
                await tx.buyerCredit.update({
                    where: { id: creditRecord.id },
                    data: { transactionId: transaction.id },
                });
            }
            // 5. Create PoolJoin with Multi-Item Cart Entries
            const poolJoin = await tx.poolJoin.create({
                data: {
                    poolId: pool.id,
                    buyerId,
                    itemScreenshotUrl: itemsToCreate[0]?.itemScreenshotUrl || (itemScreenshotUrl ? String(itemScreenshotUrl) : null),
                    contributionPesewas: contributionNum,
                    transactionId: transaction.id,
                    editableUntilPaid: moolrePaid > 0,
                    items: {
                        create: itemsToCreate,
                    },
                },
                include: {
                    items: true,
                    transaction: true,
                },
            });
            // 6. If fee is 100% covered by credit, check if pool reached cart floor
            if (moolrePaid === 0) {
                const allActiveJoins = await tx.poolJoin.findMany({
                    where: { poolId: pool.id, leftVoluntarilyAt: null },
                });
                const currentTotalPesewas = allActiveJoins.reduce((sum, j) => sum + j.contributionPesewas, 0);
                const CART_FLOOR_PESEWAS = config_1.TEMU_MIN_ORDER_PESEWAS;
                if (currentTotalPesewas >= CART_FLOOR_PESEWAS &&
                    pool.status === client_1.PoolStatus.open) {
                    const now = new Date();
                    const shipDeadlineAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
                    await tx.pool.update({
                        where: { id: pool.id },
                        data: {
                            status: client_1.PoolStatus.funded,
                            fundedAt: now,
                            shipDeadlineAt,
                        },
                    });
                    // Dispatch pool_funded notification
                    for (const join of allActiveJoins) {
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
                    const activeBuyerIds = new Set(allActiveJoins.map((j) => j.buyerId));
                    if (!activeBuyerIds.has(pool.leaderId)) {
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
                }
            }
            return {
                poolJoin,
                transaction,
                creditApplied,
                moolrePaid,
                poolTitle: pool.title,
                leaderName: pool.leader?.name || "Group Leader",
            };
        });
        // Dispatch pool_joined notification
        (0, notification_service_1.dispatchNotification)({
            userId: buyerId,
            type: client_1.NotificationType.pool_joined,
            payload: {
                poolTitle: result.poolTitle,
                leaderName: result.leaderName,
            },
            sendSmsChannel: true,
        });
        // 5. If Moolre payment is required, initiate charge
        if (result.moolrePaid > 0) {
            const chargeResult = await moolre_service_1.moolreService.initiateCharge({
                phone: req.body.momoPhone || req.user.phone,
                amountPesewas: result.moolrePaid,
                idempotencyKey: keyToUse,
                reference: `Fides Pool Join (${result.poolTitle.slice(0, 15)})`,
            });
            res.status(201).json({
                message: "Join initiated, payment prompt sent to mobile money",
                poolJoin: result.poolJoin,
                transaction: result.transaction,
                creditAppliedPesewas: result.creditApplied,
                moolrePaidPesewas: result.moolrePaid,
                moolrePrompt: chargeResult,
            });
            return;
        }
        res.status(201).json({
            message: "Pool joined successfully using available platform credit!",
            poolJoin: result.poolJoin,
            transaction: result.transaction,
            creditAppliedPesewas: result.creditApplied,
            moolrePaidPesewas: 0,
        });
    }
    catch (error) {
        logger_1.logger.error("Error joining pool:", error);
        if (error.message?.startsWith("NOT_FOUND:")) {
            res.status(404).json({ error: error.message.replace("NOT_FOUND: ", "") });
            return;
        }
        if (error.message?.startsWith("BAD_REQUEST:")) {
            res.status(400).json({ error: error.message.replace("BAD_REQUEST: ", "") });
            return;
        }
        res.status(500).json({ error: "Internal server error joining pool", details: error.message });
    }
};
exports.joinPool = joinPool;
const updateJoin = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const joinId = String(req.params.id);
        const join = await db_1.prisma.poolJoin.findUnique({
            where: { id: joinId },
        });
        if (!join || join.buyerId !== req.user.id) {
            res.status(404).json({ error: "Pool join not found or unauthorized" });
            return;
        }
        if (!join.editableUntilPaid) {
            res.status(400).json({ error: "Join item details are locked after payment confirmation" });
            return;
        }
        const updated = await db_1.prisma.poolJoin.update({
            where: { id: joinId },
            data: {
                itemScreenshotUrl: req.body.itemScreenshotUrl || join.itemScreenshotUrl,
                contributionPesewas: req.body.contributionPesewas ? Number(req.body.contributionPesewas) : join.contributionPesewas,
            },
        });
        res.status(200).json({ message: "Join updated successfully", poolJoin: updated });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to update join", details: error.message });
    }
};
exports.updateJoin = updateJoin;
const leavePool = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const joinId = String(req.params.id);
        const join = await db_1.prisma.poolJoin.findUnique({
            where: { id: joinId },
            include: { pool: true, transaction: true },
        });
        if (!join || join.buyerId !== req.user.id) {
            res.status(404).json({ error: "Pool join not found or unauthorized" });
            return;
        }
        if (join.pool.status !== client_1.PoolStatus.open) {
            res.status(400).json({ error: "Cannot leave pool after funding" });
            return;
        }
        await db_1.prisma.poolJoin.update({
            where: { id: joinId },
            data: { leftVoluntarilyAt: new Date() },
        });
        res.status(200).json({ message: "Voluntarily left pool successfully" });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to leave pool", details: error.message });
    }
};
exports.leavePool = leavePool;
