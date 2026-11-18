import { Request, Response } from "express";
import {
  TransactionStatus,
  PoolStatus,
  NotificationType,
} from "@prisma/client";
import { prisma } from "../db";
import { moolreService } from "../services/moolre.service";
import { dispatchNotification } from "../services/notification.service";
import { TEMU_MIN_ORDER_PESEWAS } from "../config";
import { logger } from "../utils/logger";

export const handleMoolreWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const signature = req.headers["x-moolre-signature"] as string | undefined;
    const isValidSignature = moolreService.verifyWebhookSignature(
      req.body,
      signature
    );

    if (!isValidSignature) {
      res.status(401).json({ error: "Invalid webhook signature" });
      return;
    }

    const body = req.body;
    const externalRef =
      body.data?.externalref ||
      body.externalref ||
      body.idempotencyKey;

    const moolreTxRef =
      body.data?.transactionid ||
      body.transactionid ||
      body.moolreTxRef;

    const statusVal = body.status;

    if (!externalRef || typeof externalRef !== "string") {
      res.status(400).json({ error: "externalref/idempotencyKey is required" });
      return;
    }

    const transaction = await prisma.transaction.findUnique({
      where: { idempotencyKey: externalRef },
      include: {
        poolJoin: true,
      },
    });

    if (!transaction) {
      res
        .status(404)
        .json({ error: "Transaction not found for external reference" });
      return;
    }

    // Idempotency check: if transaction already processed
    if (
      transaction.status === TransactionStatus.paid ||
      transaction.status === TransactionStatus.disbursed
    ) {
      res.status(200).json({
        message: "Webhook already processed",
        status: transaction.status,
      });
      return;
    }

    const isSuccess =
      statusVal === 1 ||
      statusVal === "1" ||
      body.code === "P01" ||
      body.code === "SS01" ||
      body.code === "TR099" ||
      body.status === "SUCCESS" ||
      body.status === "PAID";

    if (isSuccess) {
      await prisma.$transaction(async (tx) => {
        // 1. Update Transaction state
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.paid,
            moolreTxRef: moolreTxRef ? String(moolreTxRef) : undefined,
          },
        });

        // 2. Lock poolJoin editable state
        if (transaction.poolJoin) {
          await tx.poolJoin.update({
            where: { id: transaction.poolJoin.id },
            data: { editableUntilPaid: false },
          });

          // 3. Recalculate pool total contribution
          const poolId = transaction.poolJoin.poolId;
          const pool = await tx.pool.findUnique({
            where: { id: poolId },
            include: { leader: true },
          });

          if (pool && pool.status === PoolStatus.open) {
            const activeJoins = await tx.poolJoin.findMany({
              where: { poolId, leftVoluntarilyAt: null },
            });

            const currentTotalPesewas = activeJoins.reduce(
              (sum, j) => sum + j.contributionPesewas,
              0
            );

            const CART_FLOOR_PESEWAS = TEMU_MIN_ORDER_PESEWAS;
            if (currentTotalPesewas >= CART_FLOOR_PESEWAS) {
              const now = new Date();
              const shipDeadlineAt = new Date(
                now.getTime() + 48 * 60 * 60 * 1000
              );
              await tx.pool.update({
                where: { id: poolId },
                data: {
                  status: PoolStatus.funded,
                  fundedAt: now,
                  shipDeadlineAt,
                },
              });

              // Dispatch pool_funded notification (SMS + In-app) to all buyers in pool
              for (const join of activeJoins) {
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
        }
      });

      res.status(200).json({
        success: true,
        message: "Payment confirmed and transaction updated to paid",
      });
      return;
    } else {
      // Mark transaction failed
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: TransactionStatus.failed },
      });

      res.status(200).json({
        success: true,
        message: "Transaction updated to failed",
      });
      return;
    }
  } catch (error) {
    logger.error("Error handling Moolre webhook:", error);
    res.status(500).json({ error: "Internal server error processing webhook" });
  }
};
