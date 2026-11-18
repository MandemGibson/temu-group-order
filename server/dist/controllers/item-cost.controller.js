"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmItemCostFunded = exports.uploadPaymentProof = void 0;
const client_1 = require("@prisma/client");
const db_1 = require("../db");
const notification_service_1 = require("../services/notification.service");
const uploadPaymentProof = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const joinId = String(req.params.id);
        const { proofOfPaymentUrl } = req.body;
        if (!proofOfPaymentUrl || typeof proofOfPaymentUrl !== "string") {
            res.status(400).json({ error: "proofOfPaymentUrl is required" });
            return;
        }
        const join = await db_1.prisma.poolJoin.findUnique({
            where: { id: joinId },
            include: { pool: true },
        });
        if (!join) {
            res.status(404).json({ error: "Pool join record not found" });
            return;
        }
        if (join.buyerId !== req.user.id) {
            res
                .status(403)
                .json({
                error: "Forbidden: You cannot upload proof for another buyer",
            });
            return;
        }
        const allowedStatuses = [
            client_1.PoolStatus.funded,
            client_1.PoolStatus.ordered,
            client_1.PoolStatus.shipped,
        ];
        if (!allowedStatuses.includes(join.pool.status)) {
            res.status(400).json({
                error: `Cannot upload item cost payment proof when pool is in '${join.pool.status}' status. Pool must be funded first.`,
            });
            return;
        }
        const updatedJoin = await db_1.prisma.poolJoin.update({
            where: { id: joinId },
            data: {
                proofOfPaymentUrl: proofOfPaymentUrl.trim(),
                buyerConfirmedPaidAt: new Date(),
                itemCostStatus: client_1.ItemCostStatus.proof_uploaded,
            },
        });
        // Notify leader
        (0, notification_service_1.dispatchNotification)({
            userId: join.pool.leaderId,
            type: client_1.NotificationType.proof_uploaded_needs_confirmation,
            payload: {
                poolTitle: join.pool.title,
                buyerName: req.user.name || "A buyer",
            },
        });
        res.status(200).json({
            message: "Payment proof uploaded successfully. Awaiting leader confirmation.",
            poolJoin: updatedJoin,
        });
    }
    catch (error) {
        console.error("Error in uploadPaymentProof:", error);
        res.status(500).json({ error: "Failed to upload payment proof" });
    }
};
exports.uploadPaymentProof = uploadPaymentProof;
const confirmItemCostFunded = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const joinId = String(req.params.id);
        const { itemCostPesewas } = req.body;
        const join = await db_1.prisma.poolJoin.findUnique({
            where: { id: joinId },
            include: { pool: true },
        });
        if (!join) {
            res.status(404).json({ error: "Pool join record not found" });
            return;
        }
        const isLeader = join.pool.leaderId === req.user.id;
        const isAdmin = req.user.role === "admin" || req.user.role === "super_admin";
        if (!isLeader && !isAdmin) {
            res
                .status(403)
                .json({ error: "Forbidden: You are not the leader of this pool" });
            return;
        }
        const updatedJoin = await db_1.prisma.poolJoin.update({
            where: { id: joinId },
            data: {
                leaderConfirmedFundedAt: new Date(),
                itemCostStatus: client_1.ItemCostStatus.funded,
                ...(itemCostPesewas !== undefined && {
                    itemCostPesewas: Number(itemCostPesewas),
                }),
            },
        });
        res.status(200).json({
            message: "Item cost receipt confirmed successfully",
            poolJoin: updatedJoin,
        });
    }
    catch (error) {
        console.error("Error in confirmItemCostFunded:", error);
        res.status(500).json({ error: "Failed to confirm item cost receipt" });
    }
};
exports.confirmItemCostFunded = confirmItemCostFunded;
