"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recreatePool = exports.closePool = exports.getPoolById = exports.listPools = exports.createPool = void 0;
const client_1 = require("@prisma/client");
const db_1 = require("../db");
const config_1 = require("../config");
const createPool = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const { title, itemScreenshotUrl, category, targetPesewas = config_1.TEMU_MIN_ORDER_PESEWAS, minPerPersonPesewas = 1000, maxParticipants = 10, joinFeePesewas = 1000, deadlineHours = 48, itemCostDeadlineHours = 24, platformCommissionBps = 1000, } = req.body;
        if (!title || typeof title !== "string" || title.trim().length === 0) {
            res.status(400).json({ error: "Pool title is required" });
            return;
        }
        const parsedDeadlineHours = Number(deadlineHours);
        if (isNaN(parsedDeadlineHours) ||
            parsedDeadlineHours < 24 ||
            parsedDeadlineHours > 72) {
            res
                .status(400)
                .json({ error: "Join deadline must be between 24 and 72 hours" });
            return;
        }
        const parsedItemCostHours = Number(itemCostDeadlineHours);
        if (isNaN(parsedItemCostHours) ||
            parsedItemCostHours < 12 ||
            parsedItemCostHours > 48) {
            res
                .status(400)
                .json({ error: "Item cost deadline must be between 12 and 48 hours" });
            return;
        }
        const deadlineAt = new Date(Date.now() + parsedDeadlineHours * 60 * 60 * 1000);
        const isPlatformPool = req.user.role === "admin" || req.user.role === "super_admin";
        const pool = await db_1.prisma.pool.create({
            data: {
                leaderId: req.user.id,
                isPlatformPool,
                title: title.trim(),
                itemScreenshotUrl: itemScreenshotUrl ? String(itemScreenshotUrl) : null,
                category: category ? String(category).trim() : null,
                targetPesewas: Number(targetPesewas),
                minPerPersonPesewas: Number(minPerPersonPesewas),
                maxParticipants: Number(maxParticipants),
                joinFeePesewas: Number(joinFeePesewas),
                platformCommissionBps: Number(platformCommissionBps),
                deadlineAt,
                itemCostDeadlineHours: parsedItemCostHours,
                status: client_1.PoolStatus.open,
            },
        });
        res.status(201).json({
            message: "Pool created successfully",
            pool,
        });
    }
    catch (error) {
        console.error("Error in createPool:", error);
        res.status(500).json({ error: "Failed to create pool" });
    }
};
exports.createPool = createPool;
const listPools = async (req, res) => {
    try {
        const { category, status, isPlatformPool, page = "1", limit = "20", } = req.query;
        const pageNum = Math.max(1, parseInt(String(page), 10));
        const limitNum = Math.min(50, Math.max(1, parseInt(String(limit), 10)));
        const skip = (pageNum - 1) * limitNum;
        const whereClause = {};
        if (status && typeof status === "string") {
            whereClause.status = status;
        }
        else {
            whereClause.status = client_1.PoolStatus.open;
        }
        if (category && typeof category === "string") {
            if (category.toLowerCase() === "others" || category.toLowerCase() === "uncategorized") {
                whereClause.OR = [
                    { category: null },
                    { category: "Others" },
                    { category: "" },
                ];
            }
            else {
                whereClause.category = category;
            }
        }
        if (isPlatformPool !== undefined) {
            whereClause.isPlatformPool = String(isPlatformPool) === "true";
        }
        const [pools, totalCount] = await Promise.all([
            db_1.prisma.pool.findMany({
                where: whereClause,
                skip,
                take: limitNum,
                orderBy: { createdAt: "desc" },
                include: {
                    leader: {
                        select: {
                            id: true,
                            name: true,
                            role: true,
                        },
                    },
                    joins: {
                        select: {
                            contributionPesewas: true,
                        },
                    },
                },
            }),
            db_1.prisma.pool.count({ where: whereClause }),
        ]);
        const formattedPools = pools.map((pool) => {
            const totalContributedPesewas = pool.joins.reduce((sum, join) => sum + join.contributionPesewas, 0);
            const { joins, ...poolData } = pool;
            return {
                ...poolData,
                participantCount: joins.length,
                totalContributedPesewas,
            };
        });
        res.status(200).json({
            pools: formattedPools,
            pagination: {
                total: totalCount,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(totalCount / limitNum),
            },
        });
    }
    catch (error) {
        console.error("Error in listPools:", error);
        res.status(500).json({ error: "Failed to list pools" });
    }
};
exports.listPools = listPools;
const getPoolById = async (req, res) => {
    try {
        const poolId = String(req.params.id);
        const pool = await db_1.prisma.pool.findUnique({
            where: { id: poolId },
            include: {
                leader: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        role: true,
                        createdAt: true,
                    },
                },
                joins: {
                    include: {
                        items: true,
                        buyer: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                reviews: true,
            },
        });
        if (!pool) {
            res.status(404).json({ error: "Pool not found" });
            return;
        }
        const totalContributedPesewas = pool.joins.reduce((sum, join) => sum + join.contributionPesewas, 0);
        res.status(200).json({
            pool: {
                ...pool,
                participantCount: pool.joins.length,
                totalContributedPesewas,
            },
        });
    }
    catch (error) {
        console.error("Error in getPoolById:", error);
        res.status(500).json({ error: "Failed to fetch pool details" });
    }
};
exports.getPoolById = getPoolById;
const closePool = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const poolId = String(req.params.id);
        const pool = await db_1.prisma.pool.findUnique({
            where: { id: poolId },
            include: { joins: true },
        });
        if (!pool) {
            res.status(404).json({ error: "Pool not found" });
            return;
        }
        // Authorization check: must be leader of this pool, or admin/super_admin
        const isLeader = pool.leaderId === req.user.id;
        const isAdmin = req.user.role === "admin" || req.user.role === "super_admin";
        if (!isLeader && !isAdmin) {
            res
                .status(403)
                .json({ error: "Forbidden: You are not the leader of this pool" });
            return;
        }
        if (pool.status !== client_1.PoolStatus.open) {
            res
                .status(400)
                .json({ error: `Cannot close pool with status '${pool.status}'` });
            return;
        }
        const totalContributedPesewas = pool.joins.reduce((sum, join) => sum + join.contributionPesewas, 0);
        const CART_FLOOR_PESEWAS = 35000; // 350 GHS
        if (totalContributedPesewas < CART_FLOOR_PESEWAS) {
            res.status(400).json({
                error: `Cannot close pool early: total contribution (${totalContributedPesewas / 100} GHS) must meet or exceed the 350 GHS cart floor.`,
                currentContributionPesewas: totalContributedPesewas,
                requiredPesewas: CART_FLOOR_PESEWAS,
            });
            return;
        }
        const now = new Date();
        const shipDeadlineAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48h shipping window
        const updatedPool = await db_1.prisma.pool.update({
            where: { id: poolId },
            data: {
                status: client_1.PoolStatus.funded,
                fundedAt: now,
                shipDeadlineAt,
            },
        });
        res.status(200).json({
            message: "Pool closed and marked funded successfully",
            pool: updatedPool,
        });
    }
    catch (error) {
        console.error("Error in closePool:", error);
        res.status(500).json({ error: "Failed to close pool" });
    }
};
exports.closePool = closePool;
const recreatePool = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const poolId = String(req.params.id);
        const deadPool = await db_1.prisma.pool.findUnique({
            where: { id: poolId },
        });
        if (!deadPool) {
            res.status(404).json({ error: "Original pool not found" });
            return;
        }
        const isLeader = deadPool.leaderId === req.user.id;
        const isAdmin = req.user.role === "admin" || req.user.role === "super_admin";
        if (!isLeader && !isAdmin) {
            res
                .status(403)
                .json({ error: "Forbidden: You are not the leader of this pool" });
            return;
        }
        if (deadPool.status !== client_1.PoolStatus.dead) {
            res.status(400).json({ error: "Only dead pools can be recreated" });
            return;
        }
        if (deadPool.recreateCount >= 1) {
            res
                .status(400)
                .json({
                error: "This pool has already been recreated maximum allowed times (1)",
            });
            return;
        }
        const deadlineAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // New 48h deadline
        const newPool = await db_1.prisma.pool.create({
            data: {
                leaderId: deadPool.leaderId,
                isPlatformPool: deadPool.isPlatformPool,
                title: `${deadPool.title} (Recreated)`,
                itemScreenshotUrl: deadPool.itemScreenshotUrl,
                category: deadPool.category,
                targetPesewas: deadPool.targetPesewas,
                minPerPersonPesewas: deadPool.minPerPersonPesewas,
                maxParticipants: deadPool.maxParticipants,
                joinFeePesewas: deadPool.joinFeePesewas,
                platformCommissionBps: deadPool.platformCommissionBps,
                deadlineAt,
                itemCostDeadlineHours: deadPool.itemCostDeadlineHours,
                recreatedFromId: deadPool.id,
                recreateCount: deadPool.recreateCount + 1,
                status: client_1.PoolStatus.open,
            },
        });
        res.status(201).json({
            message: "Pool recreated successfully",
            pool: newPool,
        });
    }
    catch (error) {
        console.error("Error in recreatePool:", error);
        res.status(500).json({ error: "Failed to recreate pool" });
    }
};
exports.recreatePool = recreatePool;
