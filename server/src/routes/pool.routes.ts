import { Router } from "express";
import {
  createPool,
  listPools,
  getPoolById,
  closePool,
  recreatePool,
} from "../controllers/pool.controller";
import { requireAuth, requireLeader } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createPoolSchema } from "../validators/schemas";

const router = Router();

router.get("/", listPools);
router.get("/:id", getPoolById);
router.post(
  "/",
  requireAuth,
  requireLeader,
  validate({ body: createPoolSchema }),
  createPool
);
router.patch("/:id/close", requireAuth, requireLeader, closePool);
router.post("/:id/recreate", requireAuth, requireLeader, recreatePool);

export default router;
