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

    const keyToUse = idempotencyKey
      ? String(idempotencyKey)
      : crypto.randomUUID();

    // Perform atomic transaction with internal balance & capacity validation
    const result = await prisma.$transaction(async (tx) => {
      // 1. Re-fetch and lock pool status & joins inside transaction
      const pool = await tx.pool.findUnique({
        where: { id: poolId },
        include: {
          leader: true,
          joins: {
            where: { leftVoluntarilyAt: null },
          },
        },
      });

      if (!pool) {
        throw new Error("NOT_FOUND: Pool not found");
      }

      if (pool.status !== PoolStatus.open) {
        throw new Error(`BAD_REQUEST: Cannot join pool with status '${pool.status}'`);
      }

      if (new Date() > pool.deadlineAt) {
        throw new Error("BAD_REQUEST: Join deadline for this pool has passed");
      }

      if (pool.joins.length >= pool.maxParticipants) {
        throw new Error("BAD_REQUEST: Pool has reached maximum participant capacity");
      }

      const existingJoin = pool.joins.find((j) => j.buyerId === buyerId);
      if (existingJoin) {
        throw new Error("BAD_REQUEST: You have already joined this pool");
      }

      // 2. Calculate current available buyer credit atomically inside transaction
      const creditAggregate = await tx.buyerCredit.aggregate({
        where: { userId: buyerId },
        _sum: { amountPesewas: true },
      });

      const availableCredit = Math.max(0, creditAggregate._sum.amountPesewas || 0);
      const joinFee = pool.joinFeePesewas;
      const creditApplied = Math.min(availableCredit, joinFee);
      const moolrePaid = joinFee - creditApplied;

      // Calculate commission split
      const platformSharePesewas = Math.round(
        (joinFee * pool.platformCommissionBps) / 10000
      );
      const leaderSharePesewas = joinFee - platformSharePesewas;

      // 3. If credit is applied, add negative ledger entry
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

      // 4. Create Transaction
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

      // 5. Create PoolJoin with Multi-Item Cart Entries
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

      // 6. If fee is 100% covered by credit, check if pool reached cart floor
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

          const activeBuyerIds = new Set(allActiveJoins.map((j) => j.buyerId));
          if (!activeBuyerIds.has(pool.leaderId)) {
            dispatchNotification({
              userId: pool.leaderId,
              type: NotificationType.pool_funded,
              payload: {
                poolTitle: pool.title,
                leaderName: pool.leader?.name || "Group Leader",
                itemCostHours: pool.itemCostDeadlineHours || 24,
                isLeader: true,
              },
              sendSmsChannel: true,
            });
          }
        }
      }

      return {
        poolJoin,
        transaction,
        creditApplied,
        moolrePaid,
        poolTitle: pool.title,
        leaderName: pool.leader?.name || "Group Leader",
      };
    });

    // Dispatch pool_joined notification
    dispatchNotification({
      userId: buyerId,
      type: NotificationType.pool_joined,
      payload: {
        poolTitle: result.poolTitle,
        leaderName: result.leaderName,
      },
      sendSmsChannel: true,
    });

    // 5. If Moolre payment is required, initiate charge
    if (result.moolrePaid > 0) {
      const chargeResult = await moolreService.initiateCharge({
        phone: req.body.momoPhone || req.user.phone,
        amountPesewas: result.moolrePaid,
        idempotencyKey: keyToUse,
        reference: `Fides Pool Join (${result.poolTitle.slice(0, 15)})`,
      });

      res.status(201).json({
        message: "Join initiated, payment prompt sent to mobile money",
        poolJoin: result.poolJoin,
        transaction: result.transaction,
        creditAppliedPesewas: result.creditApplied,
        moolrePaidPesewas: result.moolrePaid,
        moolrePrompt: chargeResult,
      });
      return;
    }

    res.status(201).json({
      message: "Pool joined successfully using available platform credit!",
      poolJoin: result.poolJoin,
      transaction: result.transaction,
      creditAppliedPesewas: result.creditApplied,
      moolrePaidPesewas: 0,
    });
  } catch (error: any) {
    logger.error("Error joining pool:", error);
    if (error.message?.startsWith("NOT_FOUND:")) {
      res.status(404).json({ error: error.message.replace("NOT_FOUND: ", "") });
      return;
    }
    if (error.message?.startsWith("BAD_REQUEST:")) {
      res.status(400).json({ error: error.message.replace("BAD_REQUEST: ", "") });
      return;
    }
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
