import { Response } from "express";
import { PoolStatus, NotificationType } from "@prisma/client";
import { prisma } from "../db";
import { AuthRequest } from "../middleware/auth";
import { dispatchNotification } from "../services/notification.service";

export const updateTracking = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const poolId = String(req.params.id);
    const { trackingNumber, shippingProofImageUrl } = req.body;

    if (!trackingNumber || typeof trackingNumber !== "string" || trackingNumber.trim().length === 0) {
      res.status(400).json({ error: "trackingNumber is required" });
      return;
    }

    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
    });

    if (!pool) {
      res.status(404).json({ error: "Pool not found" });
      return;
    }

    const isLeader = pool.leaderId === req.user.id;
    const isAdmin = req.user.role === "admin" || req.user.role === "super_admin";
    if (!isLeader && !isAdmin) {
      res.status(403).json({ error: "Forbidden: You are not the leader of this pool" });
      return;
    }

    const now = new Date();
    const updatedPool = await prisma.pool.update({
      where: { id: poolId },
      data: {
        trackingNumber: trackingNumber.trim(),
        shippingProofImageUrl: shippingProofImageUrl ? String(shippingProofImageUrl).trim() : null,
        shippedAt: now,
        status: PoolStatus.shipped,
      },
    });

    const activeJoins = await prisma.poolJoin.findMany({
      where: { poolId, leftVoluntarilyAt: null },
    });

    for (const j of activeJoins) {
      dispatchNotification({
        userId: j.buyerId,
        type: NotificationType.pool_shipped,
        payload: {
          poolTitle: pool.title,
          trackingNumber: trackingNumber.trim(),
        },
        sendSmsChannel: true,
      });
    }

    res.status(200).json({
      message: "Shipping tracking number and proof updated successfully",
      pool: updatedPool,
    });
  } catch (error) {
    console.error("Error in updateTracking:", error);
    res.status(500).json({ error: "Failed to update tracking details" });
  }
};

export const leaderMarkDelivered = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const joinId = String(req.params.id);

    const join = await prisma.poolJoin.findUnique({
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
      res.status(403).json({ error: "Forbidden: You are not the leader of this pool" });
      return;
    }

    const now = new Date();
    const updatedJoin = await prisma.poolJoin.update({
      where: { id: joinId },
      data: {
        leaderMarkedDeliveredAt: now,
      },
    });

    // Check if all active joins in this pool have been marked delivered by leader
    const activeJoins = await prisma.poolJoin.findMany({
      where: { poolId: join.poolId, leftVoluntarilyAt: null },
    });

    const allLeaderDelivered = activeJoins.every((j) => j.leaderMarkedDeliveredAt !== null);

    if (allLeaderDelivered && join.pool.status !== PoolStatus.delivered) {
      await prisma.pool.update({
        where: { id: join.poolId },
        data: {
          status: PoolStatus.delivered,
          deliveredAt: now,
        },
      });
    }

    dispatchNotification({
      userId: join.buyerId,
      type: NotificationType.delivery_marked_needs_confirmation,
      payload: {
        poolTitle: join.pool.title,
        leaderName: req.user.name || "Group Leader",
      },
    });

    res.status(200).json({
      message: "Marked package delivered for buyer",
      poolJoin: updatedJoin,
    });
  } catch (error) {
    console.error("Error in leaderMarkDelivered:", error);
    res.status(500).json({ error: "Failed to mark delivery" });
  }
};

export const buyerConfirmDelivery = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const joinId = String(req.params.id);

    const join = await prisma.poolJoin.findUnique({
      where: { id: joinId },
      include: { pool: true },
    });

    if (!join) {
      res.status(404).json({ error: "Pool join record not found" });
      return;
    }

    if (join.buyerId !== req.user.id) {
      res.status(403).json({ error: "Forbidden: You cannot confirm delivery for another buyer" });
      return;
    }

    const now = new Date();
    const updatedJoin = await prisma.poolJoin.update({
      where: { id: joinId },
      data: {
        buyerConfirmedDeliveredAt: now,
      },
    });

    // Check if all active joins have buyer confirmation
    const activeJoins = await prisma.poolJoin.findMany({
      where: { poolId: join.poolId, leftVoluntarilyAt: null },
    });

    const allBuyerConfirmed = activeJoins.every((j) => j.buyerConfirmedDeliveredAt !== null);

    if (allBuyerConfirmed && join.pool.status !== PoolStatus.delivered) {
      await prisma.pool.update({
        where: { id: join.poolId },
        data: {
          status: PoolStatus.delivered,
          deliveredAt: now,
        },
      });
    }

    dispatchNotification({
      userId: req.user.id,
      type: NotificationType.review_unlocked,
      payload: {
        poolTitle: join.pool.title,
        leaderName: "your group leader",
      },
    });

    res.status(200).json({
      message: "Delivery confirmed. You can now leave a review for this pool!",
      poolJoin: updatedJoin,
    });
  } catch (error) {
    console.error("Error in buyerConfirmDelivery:", error);
    res.status(500).json({ error: "Failed to confirm delivery" });
  }
};
