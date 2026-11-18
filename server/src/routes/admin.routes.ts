import { Router } from "express";
import {
  listLeaderApplications,
  approveLeader,
  suspendLeader,
} from "../controllers/admin.controller";
import {
  getDisputesForAdmin,
  resolveDispute,
} from "../controllers/dispute.controller";
import { requireAuth, requireAdmin } from "../middleware/auth";

const router = Router();

router.get(
  "/leader-applications",
  requireAuth,
  requireAdmin,
  listLeaderApplications
);
router.post(
  "/leaders/:id/approve",
  requireAuth,
  requireAdmin,
  approveLeader
);
router.post(
  "/leaders/:id/suspend",
  requireAuth,
  requireAdmin,
  suspendLeader
);

router.get("/disputes", requireAuth, requireAdmin, getDisputesForAdmin);
router.patch("/disputes/:id", requireAuth, requireAdmin, resolveDispute);

export default router;
