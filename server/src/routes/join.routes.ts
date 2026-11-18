import { Router } from "express";
import { joinPool, updateJoin, leavePool } from "../controllers/join.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Pool join endpoints
router.post("/pools/:id/join", requireAuth, joinPool);
router.patch("/pool-joins/:id", requireAuth, updateJoin);
router.delete("/pool-joins/:id", requireAuth, leavePool);

export default router;
