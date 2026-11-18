import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../controllers/notification.controller";

const router = Router();

router.get("/", requireAuth, getNotifications);
router.patch("/read-all", requireAuth, markAllAsRead);
router.patch("/:id/read", requireAuth, markAsRead);

export default router;
