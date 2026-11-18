import { Router } from "express";
import {
  uploadPaymentProof,
  confirmItemCostFunded,
} from "../controllers/item-cost.controller";
import { requireAuth, requireLeader } from "../middleware/auth";

const router = Router();

router.post("/pool-joins/:id/proof", requireAuth, uploadPaymentProof);
router.post(
  "/pool-joins/:id/confirm-funded",
  requireAuth,
  requireLeader,
  confirmItemCostFunded
);

export default router;
