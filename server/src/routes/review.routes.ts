import { Router } from "express";
import { createReview } from "../controllers/review.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/reviews", requireAuth, createReview);

export default router;
