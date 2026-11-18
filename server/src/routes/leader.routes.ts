import { Router } from "express";
import { getLeaderProfile } from "../controllers/leader.controller";

const router = Router();

router.get("/:id", getLeaderProfile);

export default router;
