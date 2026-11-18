"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllAsRead = exports.markAsRead = exports.getNotifications = void 0;
const db_1 = require("../db");
const getNotifications = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const notifications = await db_1.prisma.notification.findMany({
            where: {
                userId: req.user.id,
                channel: "in_app",
            },
            orderBy: { createdAt: "desc" },
            take: 30,
        });
        const unreadCount = await db_1.prisma.notification.count({
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
    }
    catch (error) {
        console.error("Error in getNotifications:", error);
        res.status(500).json({ error: "Failed to fetch notifications" });
    }
};
exports.getNotifications = getNotifications;
const markAsRead = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const id = String(req.params.id);
        const notification = await db_1.prisma.notification.findUnique({
            where: { id },
        });
        if (!notification || notification.userId !== req.user.id) {
            res.status(404).json({ error: "Notification not found" });
            return;
        }
        const updated = await db_1.prisma.notification.update({
            where: { id },
            data: { readAt: new Date() },
        });
        res.json({ message: "Notification marked as read", notification: updated });
    }
    catch (error) {
        console.error("Error in markAsRead:", error);
        res.status(500).json({ error: "Failed to update notification" });
    }
};
exports.markAsRead = markAsRead;
const markAllAsRead = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        await db_1.prisma.notification.updateMany({
            where: {
                userId: req.user.id,
                channel: "in_app",
                readAt: null,
            },
            data: { readAt: new Date() },
        });
        res.json({ message: "All notifications marked as read" });
    }
    catch (error) {
        console.error("Error in markAllAsRead:", error);
        res.status(500).json({ error: "Failed to mark notifications as read" });
    }
};
exports.markAllAsRead = markAllAsRead;
