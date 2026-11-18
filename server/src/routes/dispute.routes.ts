import { Router } from "express";
import { createDispute } from "../controllers/dispute.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/pool-joins/:id/disputes", requireAuth, createDispute);

export default router;
