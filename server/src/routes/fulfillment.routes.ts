import { Router } from "express";
import {
  updateTracking,
  leaderMarkDelivered,
  buyerConfirmDelivery,
} from "../controllers/fulfillment.controller";
import { requireAuth, requireLeader } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { markShippedSchema } from "../validators/schemas";

const router = Router();

router.post(
  "/pools/:id/tracking",
  requireAuth,
  requireLeader,
  validate({ body: markShippedSchema }),
  updateTracking
);
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
