import { Response } from "express";
import { PoolStatus } from "@prisma/client";
import { prisma } from "../db";
import { AuthRequest } from "../middleware/auth";

export const createReview = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { poolId, poolJoinId, rating, comment } = req.body;

    if (!poolId || !poolJoinId || rating === undefined) {
      res
        .status(400)
        .json({ error: "poolId, poolJoinId, and rating are required" });
      return;
    }

    const ratingNum = Number(rating);
    if (
      isNaN(ratingNum) ||
      ratingNum < 1 ||
      ratingNum > 5 ||
      !Number.isInteger(ratingNum)
    ) {
      res
        .status(400)
        .json({ error: "Rating must be an integer between 1 and 5" });
      return;
    }

    const join = await prisma.poolJoin.findUnique({
      where: { id: String(poolJoinId) },
      include: {
        pool: true,
        review: true,
      },
    });

    if (!join) {
      res.status(404).json({ error: "Pool join record not found" });
      return;
    }

    if (join.buyerId !== req.user.id) {
      res
        .status(403)
        .json({
          error: "Forbidden: You can only review orders you participated in",
        });
      return;
    }

    if (join.poolId !== String(poolId)) {
      res
        .status(400)
        .json({ error: "poolJoinId does not belong to the specified poolId" });
      return;
    }

    if (join.review) {
      res
        .status(400)
        .json({ error: "A review has already been submitted for this order" });
      return;
    }

    // Unlocked only after delivery is confirmed
    const isDelivered =
      join.buyerConfirmedDeliveredAt !== null ||
      join.leaderMarkedDeliveredAt !== null ||
      join.pool.status === PoolStatus.delivered;

    if (!isDelivered) {
      res.status(400).json({
        error:
          "Reviews can only be submitted after package delivery has been confirmed",
      });
      return;
    }

    const review = await prisma.review.create({
      data: {
        poolId: String(poolId),
        authorId: req.user.id,
        poolJoinId: String(poolJoinId),
        rating: ratingNum,
        comment: comment ? String(comment).trim() : null,
      },
    });

    res.status(201).json({
      message: "Review submitted successfully. Thank you for your feedback!",
      review,
    });
  } catch (error: any) {
    console.error("Error in createReview:", error);
    if (error.code === "P2002") {
      res
        .status(400)
        .json({ error: "A review has already been submitted for this order" });
      return;
    }
    res.status(500).json({ error: "Failed to submit review" });
  }
};
