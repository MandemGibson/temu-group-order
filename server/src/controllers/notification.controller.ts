import { Response } from "express";
import { prisma } from "../db";
import { AuthRequest } from "../middleware/auth";

export const getNotifications = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user.id,
        channel: "in_app",
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: req.user.id,
        channel: "in_app",
        readAt: null,
      },
    });

    res.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Error in getNotifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

export const markAsRead = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const id = String(req.params.id);

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== req.user.id) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    res.json({ message: "Notification marked as read", notification: updated });
  } catch (error) {
    console.error("Error in markAsRead:", error);
    res.status(500).json({ error: "Failed to update notification" });
  }
};

export const markAllAsRead = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        channel: "in_app",
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error in markAllAsRead:", error);
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
};
