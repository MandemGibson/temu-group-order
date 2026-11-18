import { Response } from "express";
import { ItemCostStatus, PoolStatus, NotificationType } from "@prisma/client";
import { prisma } from "../db";
import { AuthRequest } from "../middleware/auth";
import { dispatchNotification } from "../services/notification.service";

export const uploadPaymentProof = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
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

    const join = await prisma.poolJoin.findUnique({
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

    const allowedStatuses: PoolStatus[] = [
      PoolStatus.funded,
      PoolStatus.ordered,
      PoolStatus.shipped,
    ];
    if (!allowedStatuses.includes(join.pool.status)) {
      res.status(400).json({
        error: `Cannot upload item cost payment proof when pool is in '${join.pool.status}' status. Pool must be funded first.`,
      });
      return;
    }

    const updatedJoin = await prisma.poolJoin.update({
      where: { id: joinId },
      data: {
        proofOfPaymentUrl: proofOfPaymentUrl.trim(),
        buyerConfirmedPaidAt: new Date(),
        itemCostStatus: ItemCostStatus.proof_uploaded,
      },
    });

    // Notify leader
    dispatchNotification({
      userId: join.pool.leaderId,
      type: NotificationType.proof_uploaded_needs_confirmation,
      payload: {
        poolTitle: join.pool.title,
        buyerName: req.user.name || "A buyer",
      },
    });

    res.status(200).json({
      message:
        "Payment proof uploaded successfully. Awaiting leader confirmation.",
      poolJoin: updatedJoin,
    });
  } catch (error) {
    console.error("Error in uploadPaymentProof:", error);
    res.status(500).json({ error: "Failed to upload payment proof" });
  }
};

export const confirmItemCostFunded = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const joinId = String(req.params.id);
    const { itemCostPesewas } = req.body;

    const join = await prisma.poolJoin.findUnique({
      where: { id: joinId },
      include: { pool: true },
    });

    if (!join) {
      res.status(404).json({ error: "Pool join record not found" });
      return;
    }

    const isLeader = join.pool.leaderId === req.user.id;
    const isAdmin =
      req.user.role === "admin" || req.user.role === "super_admin";
    if (!isLeader && !isAdmin) {
      res
        .status(403)
        .json({ error: "Forbidden: You are not the leader of this pool" });
      return;
    }

    const updatedJoin = await prisma.poolJoin.update({
      where: { id: joinId },
      data: {
        leaderConfirmedFundedAt: new Date(),
        itemCostStatus: ItemCostStatus.funded,
        ...(itemCostPesewas !== undefined && {
          itemCostPesewas: Number(itemCostPesewas),
        }),
      },
    });

    res.status(200).json({
      message: "Item cost receipt confirmed successfully",
      poolJoin: updatedJoin,
    });
  } catch (error) {
    console.error("Error in confirmItemCostFunded:", error);
    res.status(500).json({ error: "Failed to confirm item cost receipt" });
  }
};
