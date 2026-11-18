import { Router } from "express";
import {
  createPool,
  listPools,
  getPoolById,
  closePool,
  recreatePool,
} from "../controllers/pool.controller";
import { requireAuth, requireLeader } from "../middleware/auth";

const router = Router();

router.get("/", listPools);
router.get("/:id", getPoolById);
router.post("/", requireAuth, requireLeader, createPool);
router.patch("/:id/close", requireAuth, requireLeader, closePool);
router.post("/:id/recreate", requireAuth, requireLeader, recreatePool);

export default router;
