"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeaderProfile = void 0;
const client_1 = require("@prisma/client");
const db_1 = require("../db");
const getLeaderProfile = async (req, res) => {
    try {
        const leaderId = String(req.params.id);
        const leader = await db_1.prisma.user.findUnique({
            where: { id: leaderId },
            select: {
                id: true,
                name: true,
                role: true,
                leaderOnboardingStatus: true,
                createdAt: true,
                leaderApprovedAt: true,
            },
        });
        if (!leader ||
            (leader.role !== client_1.UserRole.leader &&
                leader.role !== client_1.UserRole.admin &&
                leader.role !== client_1.UserRole.super_admin)) {
            res.status(404).json({ error: "Leader profile not found" });
            return;
        }
        const pools = await db_1.prisma.pool.findMany({
            where: { leaderId },
            select: {
                id: true,
                title: true,
                status: true,
                createdAt: true,
                reviews: {
                    select: {
                        rating: true,
                        comment: true,
                        createdAt: true,
                        author: { select: { name: true } },
                    },
                },
            },
        });
        const totalPoolsLed = pools.length;
        const activePoolsCount = pools.filter((p) => p.status === client_1.PoolStatus.open).length;
        const completedPoolsCount = pools.filter((p) => p.status === client_1.PoolStatus.delivered).length;
        const allReviews = pools.flatMap((p) => p.reviews);
        const averageRating = allReviews.length > 0
            ? Number((allReviews.reduce((sum, r) => sum + r.rating, 0) /
                allReviews.length).toFixed(1))
            : 0;
        res.status(200).json({
            leader: {
                ...leader,
                stats: {
                    totalPoolsLed,
                    activePoolsCount,
                    completedPoolsCount,
                    totalReviews: allReviews.length,
                    averageRating,
                },
                recentReviews: allReviews.slice(0, 10),
            },
        });
    }
    catch (error) {
        console.error("Error in getLeaderProfile:", error);
        res.status(500).json({ error: "Failed to fetch leader profile" });
    }
};
exports.getLeaderProfile = getLeaderProfile;
