import { Router } from "express";
import {
  updateTracking,
  leaderMarkDelivered,
  buyerConfirmDelivery,
} from "../controllers/fulfillment.controller";
import { requireAuth, requireLeader } from "../middleware/auth";

const router = Router();

router.post("/pools/:id/tracking", requireAuth, requireLeader, updateTracking);
router.post(
  "/pool-joins/:id/mark-delivered",
  requireAuth,
  requireLeader,
  leaderMarkDelivered,
);
router.post(
  "/pool-joins/:id/confirm-delivery",
  requireAuth,
  buyerConfirmDelivery,
);

export default router;
