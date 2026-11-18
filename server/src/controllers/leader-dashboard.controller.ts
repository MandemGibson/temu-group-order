import { Response } from "express";
import { PoolStatus, ItemCostStatus, TransactionStatus } from "@prisma/client";
import { prisma } from "../db";
import { AuthRequest } from "../middleware/auth";

export const getLeaderDashboard = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const leaderId = req.user.id;

    // Active pools led by this leader
    const pools = await prisma.pool.findMany({
      where: { leaderId },
      orderBy: { createdAt: "desc" },
      include: {
        joins: {
          select: {
            id: true,
            itemCostStatus: true,
            contributionPesewas: true,
            leaderMarkedDeliveredAt: true,
          },
        },
      },
    });

    const activePools = pools.filter(
      (p) =>
        p.status === PoolStatus.open ||
        p.status === PoolStatus.funded ||
        p.status === PoolStatus.shipped
    );

    // Pending confirmations (unconfirmed payment proofs)
    const pendingProofsCount = pools
      .flatMap((p) => p.joins)
      .filter((j) => j.itemCostStatus === ItemCostStatus.proof_uploaded).length;

    // Total earnings (sum of leaderSharePesewas for disbursed transactions in leader's pools)
    const disbursedTransactions = await prisma.transaction.findMany({
      where: {
        status: TransactionStatus.disbursed,
        poolJoin: {
          pool: {
            leaderId,
          },
        },
      },
      select: {
        leaderSharePesewas: true,
      },
    });

    const totalEarningsPesewas = disbursedTransactions.reduce(
      (sum, tx) => sum + tx.leaderSharePesewas,
      0
    );

    res.status(200).json({
      dashboard: {
        activePoolsCount: activePools.length,
        totalPoolsCount: pools.length,
        pendingProofsCount,
        totalEarningsPesewas,
        totalEarningsGhs: Number((totalEarningsPesewas / 100).toFixed(2)),
        activePools,
      },
    });
  } catch (error) {
    console.error("Error in getLeaderDashboard:", error);
    res.status(500).json({ error: "Failed to fetch leader dashboard" });
  }
};

export const getLeaderPayouts = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const leaderId = req.user.id;

    const payouts = await prisma.transaction.findMany({
      where: {
        status: TransactionStatus.disbursed,
        poolJoin: {
          pool: {
            leaderId,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        poolJoin: {
          include: {
            pool: {
              select: { id: true, title: true },
            },
            buyer: {
              select: { name: true },
            },
          },
        },
      },
    });

    const totalDisbursedPesewas = payouts.reduce(
      (sum, p) => sum + p.leaderSharePesewas,
      0
    );

    res.status(200).json({
      totalDisbursedPesewas,
      totalDisbursedGhs: Number((totalDisbursedPesewas / 100).toFixed(2)),
      payouts: payouts.map((p) => ({
        id: p.id,
        poolId: p.poolJoin?.poolId,
        poolTitle: p.poolJoin?.pool.title,
        buyerName: p.poolJoin?.buyer.name,
        leaderSharePesewas: p.leaderSharePesewas,
        leaderShareGhs: Number((p.leaderSharePesewas / 100).toFixed(2)),
        disbursedAt: p.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Error in getLeaderPayouts:", error);
    res.status(500).json({ error: "Failed to fetch leader payouts" });
  }
};
