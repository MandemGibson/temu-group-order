"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.suspendLeader = exports.approveLeader = exports.listLeaderApplications = void 0;
const client_1 = require("@prisma/client");
const db_1 = require("../db");
const listLeaderApplications = async (_req, res) => {
    try {
        const applications = await db_1.prisma.user.findMany({
            where: {
                leaderOnboardingStatus: {
                    in: [
                        client_1.LeaderOnboardingStatus.pending_review,
                        client_1.LeaderOnboardingStatus.approved,
                        client_1.LeaderOnboardingStatus.suspended,
                    ],
                },
            },
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                role: true,
                leaderOnboardingStatus: true,
                ghanaCardNumber: true,
                ghanaCardImageUrl: true,
                selfieImageUrl: true,
                leaderApprovedAt: true,
                leaderSuspendedAt: true,
                leaderSuspendedReason: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
        });
        res.status(200).json({ applications, count: applications.length });
    }
    catch (error) {
        console.error("Error in listLeaderApplications:", error);
        res.status(500).json({ error: "Failed to list leader applications" });
    }
};
exports.listLeaderApplications = listLeaderApplications;
const approveLeader = async (req, res) => {
    try {
        const leaderId = String(req.params.id);
        const user = await db_1.prisma.user.findUnique({
            where: { id: leaderId },
        });
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        const updatedUser = await db_1.prisma.user.update({
            where: { id: leaderId },
            data: {
                role: client_1.UserRole.leader,
                leaderOnboardingStatus: client_1.LeaderOnboardingStatus.approved,
                leaderApprovedAt: new Date(),
                leaderSuspendedAt: null,
                leaderSuspendedReason: null,
            },
        });
        res.status(200).json({
            message: "Leader application approved successfully",
            user: updatedUser,
        });
    }
    catch (error) {
        console.error("Error in approveLeader:", error);
        res.status(500).json({ error: "Failed to approve leader application" });
    }
};
exports.approveLeader = approveLeader;
const suspendLeader = async (req, res) => {
    try {
        const leaderId = String(req.params.id);
        const { reason } = req.body;
        if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
            res.status(400).json({ error: "Suspension reason is required" });
            return;
        }
        const user = await db_1.prisma.user.findUnique({
            where: { id: leaderId },
        });
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        const updatedUser = await db_1.prisma.user.update({
            where: { id: leaderId },
            data: {
                leaderOnboardingStatus: client_1.LeaderOnboardingStatus.suspended,
                leaderSuspendedAt: new Date(),
                leaderSuspendedReason: reason.trim(),
            },
        });
        res.status(200).json({
            message: "Leader suspended successfully",
            user: updatedUser,
        });
    }
    catch (error) {
        console.error("Error in suspendLeader:", error);
        res.status(500).json({ error: "Failed to suspend leader" });
    }
};
exports.suspendLeader = suspendLeader;
