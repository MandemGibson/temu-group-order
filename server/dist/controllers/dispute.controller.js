"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDispute = exports.getDisputesForAdmin = exports.createDispute = void 0;
const client_1 = require("@prisma/client");
const db_1 = require("../db");
const createDispute = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const joinId = String(req.params.id);
        const { type, reason, evidenceUrl } = req.body;
        if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
            res.status(400).json({ error: "Dispute reason is required" });
            return;
        }
        const validTypes = Object.values(client_1.DisputeType);
        if (!type || !validTypes.includes(type)) {
            res.status(400).json({
                error: `Dispute type must be one of: ${validTypes.join(", ")}`,
            });
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
        const isBuyer = join.buyerId === req.user.id;
        const isLeader = join.pool.leaderId === req.user.id;
        const isAdmin = req.user.role === "admin" || req.user.role === "super_admin";
        if (!isBuyer && !isLeader && !isAdmin) {
            res
                .status(403)
                .json({ error: "Forbidden: You cannot raise a dispute on this order" });
            return;
        }
        const dispute = await db_1.prisma.dispute.create({
            data: {
                poolJoinId: joinId,
                raisedById: req.user.id,
                type: type,
                status: client_1.DisputeStatus.open,
                reason: reason.trim(),
                evidenceUrl: evidenceUrl ? String(evidenceUrl).trim() : null,
            },
        });
        res.status(201).json({
            message: "Dispute raised successfully. Our support team will review it shortly.",
            dispute,
        });
    }
    catch (error) {
        console.error("Error in createDispute:", error);
        res.status(500).json({ error: "Failed to create dispute" });
    }
};
exports.createDispute = createDispute;
const getDisputesForAdmin = async (req, res) => {
    try {
        const disputes = await db_1.prisma.dispute.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                raisedBy: {
                    select: { id: true, name: true, phone: true, role: true },
                },
                poolJoin: {
                    include: {
                        pool: {
                            select: { id: true, title: true, status: true, leaderId: true },
                        },
                        buyer: {
                            select: { id: true, name: true, phone: true },
                        },
                    },
                },
            },
        });
        res.status(200).json({ disputes, count: disputes.length });
    }
    catch (error) {
        console.error("Error in getDisputesForAdmin:", error);
        res.status(500).json({ error: "Failed to fetch disputes" });
    }
};
exports.getDisputesForAdmin = getDisputesForAdmin;
const resolveDispute = async (req, res) => {
    try {
        const disputeId = String(req.params.id);
        const { status, adminNotes } = req.body;
        const validStatuses = [
            client_1.DisputeStatus.resolved_buyer,
            client_1.DisputeStatus.resolved_leader,
            client_1.DisputeStatus.dismissed,
            client_1.DisputeStatus.under_review,
        ];
        if (!status ||
            !validStatuses.includes(status)) {
            res.status(400).json({
                error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
            });
            return;
        }
        const dispute = await db_1.prisma.dispute.findUnique({
            where: { id: disputeId },
        });
        if (!dispute) {
            res.status(404).json({ error: "Dispute not found" });
            return;
        }
        const updatedDispute = await db_1.prisma.dispute.update({
            where: { id: disputeId },
            data: {
                status: status,
                adminNotes: adminNotes ? String(adminNotes).trim() : undefined,
                resolvedAt: status !== client_1.DisputeStatus.under_review ? new Date() : undefined,
            },
        });
        res.status(200).json({
            message: "Dispute updated successfully",
            dispute: updatedDispute,
        });
    }
    catch (error) {
        console.error("Error in resolveDispute:", error);
        res.status(500).json({ error: "Failed to resolve dispute" });
    }
};
exports.resolveDispute = resolveDispute;
