import { Response } from "express";
import crypto from "crypto";
import {
  PoolStatus,
  TransactionStatus,
  CreditSourceType,
  ItemCostStatus,
  NotificationType,
} from "@prisma/client";
import { prisma } from "../db";
import { AuthRequest } from "../middleware/auth";
import { moolreService } from "../services/moolre.service";
import { dispatchNotification } from "../services/notification.service";
import { TEMU_MIN_ORDER_PESEWAS } from "../config";
import { logger } from "../utils/logger";

export const joinPool = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const poolId = String(req.params.id);
    const buyerId = req.user.id;
    const {
      items,
      itemDescription,
      temuItemUrl,
      itemSpecs,
      itemScreenshotUrl,
      contributionPesewas,
      idempotencyKey,
    } = req.body;

    // Parse multi-item cart entries
    let rawItems: any[] = Array.isArray(items) && items.length > 0 ? items : [];

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

    const itemsToCreate = rawItems.map((it: any) => ({
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

    // Fetch pool details with active joins
    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      include: {
        leader: true,
        joins: {
          where: { leftVoluntarilyAt: null },
        },
      },
    });

    if (!pool) {
      res.status(404).json({ error: "Pool not found" });
      return;
    }

    if (pool.status !== PoolStatus.open) {
      res
        .status(400)
        .json({ error: `Cannot join pool with status '${pool.status}'` });
      return;
    }

    if (new Date() > pool.deadlineAt) {
      res.status(400).json({ error: "Join deadline for this pool has passed" });
      return;
    }

    // Check participant limit
    if (pool.joins.length >= pool.maxParticipants) {
      res
        .status(400)
        .json({ error: "Pool has reached maximum participant capacity" });
      return;
    }

    // Calculate current available buyer credit
    const creditAggregate = await prisma.buyerCredit.aggregate({
      where: { userId: buyerId },
      _sum: { amountPesewas: true },
    });

    const availableCredit = creditAggregate._sum.amountPesewas || 0;
    const joinFee = pool.joinFeePesewas;
    const creditApplied = Math.min(availableCredit, joinFee);
    const moolrePaid = joinFee - creditApplied;

    // Calculate commission split
    const platformSharePesewas = Math.round(
      (joinFee * pool.platformCommissionBps) / 10000
    );
    const leaderSharePesewas = joinFee - platformSharePesewas;

    const keyToUse = idempotencyKey
      ? String(idempotencyKey)
      : crypto.randomUUID();

    // Perform atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. If credit is applied, add negative ledger entry
      let creditRecord = null;
      if (creditApplied > 0) {
        creditRecord = await tx.buyerCredit.create({
          data: {
            userId: buyerId,
            amountPesewas: -creditApplied,
            sourceType: CreditSourceType.join_fee_spend,
            sourcePoolId: pool.id,
          },
        });
      }

      // 2. Create Transaction
      const transaction = await tx.transaction.create({
        data: {
          userId: buyerId,
          amountPesewas: joinFee,
          status:
            moolrePaid === 0
              ? TransactionStatus.paid
              : TransactionStatus.pending,
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

      // 3. Create PoolJoin with Multi-Item Cart Entries
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

      // 4. If fee is 100% covered by credit, check if pool reached cart floor
      if (moolrePaid === 0) {
        const allActiveJoins = await tx.poolJoin.findMany({
          where: { poolId: pool.id, leftVoluntarilyAt: null },
        });
        const currentTotalPesewas = allActiveJoins.reduce(
          (sum, j) => sum + j.contributionPesewas,
          0
        );

        const CART_FLOOR_PESEWAS = TEMU_MIN_ORDER_PESEWAS;
        if (
          currentTotalPesewas >= CART_FLOOR_PESEWAS &&
          pool.status === PoolStatus.open
        ) {
          const now = new Date();
          const shipDeadlineAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
          await tx.pool.update({
            where: { id: pool.id },
            data: {
              status: PoolStatus.funded,
              fundedAt: now,
              shipDeadlineAt,
            },
          });

          // Dispatch pool_funded notification
          for (const join of allActiveJoins) {
            dispatchNotification({
              userId: join.buyerId,
              type: NotificationType.pool_funded,
              payload: {
                poolTitle: pool.title,
                leaderName: pool.leader?.name || "Group Leader",
                itemCostHours: pool.itemCostDeadlineHours || 24,
              },
              sendSmsChannel: true,
            });
          }
        }
      }

      return { poolJoin, transaction };
    });

    // Dispatch pool_joined notification
    dispatchNotification({
      userId: buyerId,
      type: NotificationType.pool_joined,
      payload: {
        poolTitle: pool.title,
        leaderName: pool.leader?.name || "Group Leader",
      },
      sendSmsChannel: true,
    });

    // 5. If Moolre payment is required, initiate charge
    if (moolrePaid > 0) {
      const chargeResult = await moolreService.initiateCharge({
        phone: req.body.momoPhone || req.user.phone,
        amountPesewas: moolrePaid,
        idempotencyKey: keyToUse,
        reference: `Fides Pool Join (${pool.title.slice(0, 15)})`,
      });

      res.status(201).json({
        message: "Join initiated, payment prompt sent to mobile money",
        poolJoin: result.poolJoin,
        transaction: result.transaction,
        creditAppliedPesewas: creditApplied,
        moolrePaidPesewas: moolrePaid,
        moolrePrompt: chargeResult,
      });
      return;
    }

    res.status(201).json({
      message: "Pool joined successfully using available platform credit!",
      poolJoin: result.poolJoin,
      transaction: result.transaction,
      creditAppliedPesewas: creditApplied,
      moolrePaidPesewas: 0,
    });
  } catch (error: any) {
    logger.error("Error joining pool:", error);
    res.status(500).json({ error: "Internal server error joining pool", details: error.message });
  }
};

export const updateJoin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const joinId = String(req.params.id);
    const join = await prisma.poolJoin.findUnique({
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

    const updated = await prisma.poolJoin.update({
      where: { id: joinId },
      data: {
        itemScreenshotUrl: req.body.itemScreenshotUrl || join.itemScreenshotUrl,
        contributionPesewas: req.body.contributionPesewas ? Number(req.body.contributionPesewas) : join.contributionPesewas,
      },
    });

    res.status(200).json({ message: "Join updated successfully", poolJoin: updated });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update join", details: error.message });
  }
};

export const leavePool = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const joinId = String(req.params.id);
    const join = await prisma.poolJoin.findUnique({
      where: { id: joinId },
      include: { pool: true, transaction: true },
    });

    if (!join || join.buyerId !== req.user.id) {
      res.status(404).json({ error: "Pool join not found or unauthorized" });
      return;
    }

    if (join.pool.status !== PoolStatus.open) {
      res.status(400).json({ error: "Cannot leave pool after funding" });
      return;
    }

    await prisma.poolJoin.update({
      where: { id: joinId },
      data: { leftVoluntarilyAt: new Date() },
    });

    res.status(200).json({ message: "Voluntarily left pool successfully" });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to leave pool", details: error.message });
  }
};
