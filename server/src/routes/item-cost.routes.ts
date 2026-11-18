import { Router } from "express";
import {
  uploadPaymentProof,
  confirmItemCostFunded,
} from "../controllers/item-cost.controller";
import { requireAuth, requireLeader } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { confirmPaidSchema } from "../validators/schemas";

const router = Router();

router.post(
  "/pool-joins/:id/proof",
  requireAuth,
  validate({ body: confirmPaidSchema }),
  uploadPaymentProof
);
router.post(
  "/pool-joins/:id/confirm-funded",
  requireAuth,
  requireLeader,
  confirmItemCostFunded
);

export default router;
