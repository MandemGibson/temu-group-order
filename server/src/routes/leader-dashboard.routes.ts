import { Router } from "express";
import {
  getLeaderDashboard,
  getLeaderPayouts,
} from "../controllers/leader-dashboard.controller";
import { requireAuth, requireLeader } from "../middleware/auth";

const router = Router();

router.get("/dashboard", requireAuth, requireLeader, getLeaderDashboard);
router.get("/payouts", requireAuth, requireLeader, getLeaderPayouts);

export default router;
