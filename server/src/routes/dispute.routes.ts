import { Router } from "express";
import { createDispute } from "../controllers/dispute.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { raiseDisputeSchema } from "../validators/schemas";

const router = Router();

router.post(
  "/pool-joins/:id/disputes",
  requireAuth,
  validate({ body: raiseDisputeSchema }),
  createDispute
);

export default router;
