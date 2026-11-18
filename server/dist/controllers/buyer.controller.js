"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyCredit = exports.getMyOrders = void 0;
const db_1 = require("../db");
const getMyOrders = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const joins = await db_1.prisma.poolJoin.findMany({
            where: { buyerId: req.user.id },
            orderBy: { createdAt: "desc" },
            include: {
                items: true,
                pool: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        deadlineAt: true,
                        fundedAt: true,
                        shippedAt: true,
                        deliveredAt: true,
                        leader: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                            },
                        },
                    },
                },
                transaction: {
                    select: {
                        id: true,
                        amountPesewas: true,
                        status: true,
                        createdAt: true,
                    },
                },
            },
        });
        res.status(200).json({
            orders: joins,
            count: joins.length,
        });
    }
    catch (error) {
        console.error("Error in getMyOrders:", error);
        res.status(500).json({ error: "Failed to fetch orders" });
    }
};
exports.getMyOrders = getMyOrders;
const getMyCredit = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const ledgerEntries = await db_1.prisma.buyerCredit.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: "desc" },
            include: {
                transaction: {
                    select: {
                        id: true,
                        amountPesewas: true,
                        status: true,
                    },
                },
            },
        });
        const balancePesewas = ledgerEntries.reduce((sum, entry) => sum + entry.amountPesewas, 0);
        res.status(200).json({
            balancePesewas,
            balanceGhs: Number((balancePesewas / 100).toFixed(2)),
            ledger: ledgerEntries,
        });
    }
    catch (error) {
        console.error("Error in getMyCredit:", error);
        res.status(500).json({ error: "Failed to fetch credit balance" });
    }
};
exports.getMyCredit = getMyCredit;
