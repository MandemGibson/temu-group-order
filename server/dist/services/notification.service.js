"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchNotification = exports.generateNotificationText = void 0;
const client_1 = require("@prisma/client");
const db_1 = require("../db");
const sms_service_1 = require("./sms.service");
const logger_1 = require("../utils/logger");
// Generate formatted notification title and body per specification catalog
const generateNotificationText = (type, payload) => {
    const platform = "Fides";
    switch (type) {
        case client_1.NotificationType.otp_code:
            return {
                title: "Security Verification Code",
                body: `Your ${platform} code is ${payload.code}. Expires in 5 min.`,
                smsText: `Your ${platform} code is ${payload.code}. Expires in 5 min. Don't share this.`,
            };
        case client_1.NotificationType.pool_joined:
            return {
                title: "Joined Pool",
                body: `You joined "${payload.poolTitle}" with ${payload.leaderName || "leader"}. You'll be notified once the pool is funded.`,
            };
        case client_1.NotificationType.pool_funded:
            if (payload.isLeader) {
                return {
                    title: "Pool Funded — Item Cost Payments Open",
                    body: `"${payload.poolTitle}" is funded! Buyers can now submit item cost payments.`,
                    smsText: `${platform}: "${payload.poolTitle}" hit its minimum! Item cost payments from buyers are now open — check your leader dashboard.`,
                };
            }
            return {
                title: "Pool Funded — Item Cost Payment Due",
                body: `"${payload.poolTitle}" is funded! Pay ${payload.leaderName} the item cost (${payload.amount}) via MoMo ${payload.momoNumber || ""}, ref: ${payload.paymentReference || ""}, within ${payload.itemCostHours || 24} hours.`,
                smsText: `${platform}: "${payload.poolTitle}" hit its minimum! Pay item cost to ${payload.leaderName} within ${payload.itemCostHours || 24}h — check the app for details.`,
            };
        case client_1.NotificationType.item_cost_reminder:
            return {
                title: "Payment Reminder",
                body: `Reminder: pay item cost for "${payload.poolTitle}" — ${payload.hoursRemaining}h left before you're dropped.`,
                smsText: `Reminder: pay item cost for "${payload.poolTitle}" — ${payload.hoursRemaining}h left before you're dropped from the pool.`,
            };
        case client_1.NotificationType.item_cost_deadline_missed:
            return {
                title: "Item-Cost Deadline Missed",
                body: `You missed the item-cost deadline for "${payload.poolTitle}". You've been dropped; ${payload.amount || "your join fee"} is now ${platform} credit.`,
                smsText: `You missed the item-cost deadline for "${payload.poolTitle}". You've been dropped; ${payload.amount || "your fee"} is now ${platform} credit.`,
            };
        case client_1.NotificationType.proof_uploaded_needs_confirmation:
            return {
                title: "Buyer Uploaded Proof",
                body: `${payload.buyerName || "A buyer"} uploaded proof of payment for "${payload.poolTitle}". Confirm receipt to mark them funded.`,
            };
        case client_1.NotificationType.pool_shipped:
            return {
                title: "Order Shipped",
                body: `Your order in "${payload.poolTitle}" has shipped via SpeedAF! Tracking number: ${payload.trackingNumber}.`,
                smsText: `Your order in "${payload.poolTitle}" has shipped! Tracking: ${payload.trackingNumber}.`,
            };
        case client_1.NotificationType.shipping_deadline_reminder:
            return {
                title: "Shipping Deadline Approaching",
                body: `"${payload.poolTitle}" closed ${payload.hoursAgo || 24}h ago — you have ${payload.hoursRemaining || 24}h left to ship before this is flagged.`,
            };
        case client_1.NotificationType.shipping_deadline_missed:
            return {
                title: "Shipping Deadline Missed",
                body: `Shipping deadline for "${payload.poolTitle}" was missed. An automated dispute has been flagged.`,
                smsText: `Shipping deadline for "${payload.poolTitle}" was missed. An automated dispute has been created.`,
            };
        case client_1.NotificationType.delivery_marked_needs_confirmation:
            return {
                title: "Confirm Delivery",
                body: `${payload.leaderName || "The leader"} marked "${payload.poolTitle}" as delivered. Confirm you received your item to unlock your review.`,
            };
        case client_1.NotificationType.pool_dead:
            if (payload.isLeader) {
                return {
                    title: "Pool Closed (Unfilled)",
                    body: `"${payload.poolTitle}" didn't reach the 350 GHS cart floor in time and has been closed.`,
                    smsText: `${platform}: "${payload.poolTitle}" didn't fill in time and has been closed.`,
                };
            }
            return {
                title: "Pool Closed (Unfilled)",
                body: `"${payload.poolTitle}" didn't reach the 350 GHS cart floor in time. Your ${payload.amount || "join fee"} is now ${platform} credit.`,
                smsText: `"${payload.poolTitle}" didn't fill in time. Your ${payload.amount || "fee"} is now ${platform} credit.`,
            };
        case client_1.NotificationType.pool_recreated:
            return {
                title: "Pool Recreated",
                body: `"${payload.poolTitle}" has been recreated with a new deadline. You're still in — no action needed.`,
                smsText: `"${payload.poolTitle}" has been recreated with a new deadline. You're still in — no action needed.`,
            };
        case client_1.NotificationType.dispute_opened:
            return {
                title: "Dispute Raised",
                body: `A dispute was raised on "${payload.poolTitle}": ${payload.disputeType}. Review details in your dashboard.`,
            };
        case client_1.NotificationType.dispute_resolved:
            return {
                title: "Dispute Resolved",
                body: `Your dispute on "${payload.poolTitle}" has been resolved: ${payload.resolution}.`,
            };
        case client_1.NotificationType.leader_application_status:
            return {
                title: "Leader Application Update",
                body: `Your leader application status is now: ${payload.status}.`,
                smsText: `${platform}: your leader application was ${payload.status}.`,
            };
        case client_1.NotificationType.review_unlocked:
            return {
                title: "Leave a Review",
                body: `You confirmed delivery for "${payload.poolTitle}" — you can now leave ${payload.leaderName} a review.`,
            };
        case client_1.NotificationType.leader_payout_disbursed:
            return {
                title: "Payout Available",
                body: `${payload.amount} from "${payload.poolTitle}" is now in your withdrawable balance.`,
            };
        default:
            return {
                title: "New Notification",
                body: `You have an update regarding "${payload.poolTitle || platform}".`,
            };
    }
};
exports.generateNotificationText = generateNotificationText;
/**
 * Dispatch notification: Persists in_app notification to database and dispatches SMS if critical/high urgency
 */
const dispatchNotification = async ({ userId, type, payload, sendSmsChannel = false, }) => {
    try {
        const { title, body, smsText } = (0, exports.generateNotificationText)(type, payload);
        // 1. Create In-App Notification (Always persistent in DB)
        const inAppRecord = await db_1.prisma.notification.create({
            data: {
                userId,
                type,
                channel: client_1.NotificationChannel.in_app,
                title,
                body,
                payload: payload,
                sentAt: new Date(),
            },
        });
        // 2. Dispatch SMS Channel if configured or requested
        if (sendSmsChannel) {
            const user = await db_1.prisma.user.findUnique({ where: { id: userId } });
            if (user?.phone) {
                const textToSend = smsText || body;
                await (0, sms_service_1.sendSms)(user.phone, textToSend);
                await db_1.prisma.notification.create({
                    data: {
                        userId,
                        type,
                        channel: client_1.NotificationChannel.sms,
                        title,
                        body: textToSend,
                        payload: payload,
                        sentAt: new Date(),
                    },
                });
            }
        }
        return inAppRecord;
    }
    catch (error) {
        logger_1.logger.error(`Error dispatching notification (${type}):`, error);
    }
};
exports.dispatchNotification = dispatchNotification;
