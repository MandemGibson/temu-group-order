import { Router } from "express";
import { getMyOrders, getMyCredit } from "../controllers/buyer.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/orders", requireAuth, getMyOrders);
router.get("/credit", requireAuth, getMyCredit);

export default router;
