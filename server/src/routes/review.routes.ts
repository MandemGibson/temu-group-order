import { Router } from "express";
import { createReview } from "../controllers/review.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createReviewSchema } from "../validators/schemas";

const router = Router();

router.post(
  "/reviews",
  requireAuth,
  validate({ body: createReviewSchema }),
  createReview
);

export default router;
