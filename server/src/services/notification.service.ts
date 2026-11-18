import { NotificationType, NotificationChannel } from "@prisma/client";
import { prisma } from "../db";
import { sendSms } from "./sms.service";
import { logger } from "../utils/logger";

export interface NotificationPayload {
  poolTitle?: string;
  leaderName?: string;
  buyerName?: string;
  amount?: string;
  itemCostHours?: number | string;
  hoursRemaining?: number | string;
  hoursAgo?: number | string;
  momoNumber?: string;
  paymentReference?: string;
  trackingNumber?: string;
  code?: string;
  status?: string;
  disputeType?: string;
  resolution?: string;
  [key: string]: any;
}

// Generate formatted notification title and body per specification catalog
export const generateNotificationText = (
  type: NotificationType,
  payload: NotificationPayload
): { title: string; body: string; smsText?: string } => {
  const platform = "Fides";

  switch (type) {
    case NotificationType.otp_code:
      return {
        title: "Security Verification Code",
        body: `Your ${platform} code is ${payload.code}. Expires in 5 min.`,
        smsText: `Your ${platform} code is ${payload.code}. Expires in 5 min. Don't share this.`,
      };

    case NotificationType.pool_joined:
      return {
        title: "Joined Pool",
        body: `You joined "${payload.poolTitle}" with ${payload.leaderName || "leader"}. You'll be notified once the pool is funded.`,
      };

    case NotificationType.pool_funded:
      return {
        title: "Pool Funded — Item Cost Payment Due",
        body: `"${payload.poolTitle}" is funded! Pay ${payload.leaderName} the item cost (${payload.amount}) via MoMo ${payload.momoNumber || ""}, ref: ${payload.paymentReference || ""}, within ${payload.itemCostHours || 24} hours.`,
        smsText: `${platform}: "${payload.poolTitle}" hit its minimum! Pay item cost to ${payload.leaderName} within ${payload.itemCostHours || 24}h — check the app for details.`,
      };

    case NotificationType.item_cost_reminder:
      return {
        title: "Payment Reminder",
        body: `Reminder: pay item cost for "${payload.poolTitle}" — ${payload.hoursRemaining}h left before you're dropped.`,
        smsText: `Reminder: pay item cost for "${payload.poolTitle}" — ${payload.hoursRemaining}h left before you're dropped from the pool.`,
      };

    case NotificationType.item_cost_deadline_missed:
      return {
        title: "Item-Cost Deadline Missed",
        body: `You missed the item-cost deadline for "${payload.poolTitle}". You've been dropped; ${payload.amount || "your join fee"} is now ${platform} credit.`,
        smsText: `You missed the item-cost deadline for "${payload.poolTitle}". You've been dropped; ${payload.amount || "your fee"} is now ${platform} credit.`,
      };

    case NotificationType.proof_uploaded_needs_confirmation:
      return {
        title: "Buyer Uploaded Proof",
        body: `${payload.buyerName || "A buyer"} uploaded proof of payment for "${payload.poolTitle}". Confirm receipt to mark them funded.`,
      };

    case NotificationType.pool_shipped:
      return {
        title: "Order Shipped",
        body: `Your order in "${payload.poolTitle}" has shipped via SpeedAF! Tracking number: ${payload.trackingNumber}.`,
        smsText: `Your order in "${payload.poolTitle}" has shipped! Tracking: ${payload.trackingNumber}.`,
      };

    case NotificationType.shipping_deadline_reminder:
      return {
        title: "Shipping Deadline Approaching",
        body: `"${payload.poolTitle}" closed ${payload.hoursAgo || 24}h ago — you have ${payload.hoursRemaining || 24}h left to ship before this is flagged.`,
      };

    case NotificationType.shipping_deadline_missed:
      return {
        title: "Shipping Deadline Missed",
        body: `Shipping deadline for "${payload.poolTitle}" was missed. An automated dispute has been flagged.`,
        smsText: `Shipping deadline for "${payload.poolTitle}" was missed. An automated dispute has been created.`,
      };

    case NotificationType.delivery_marked_needs_confirmation:
      return {
        title: "Confirm Delivery",
        body: `${payload.leaderName || "The leader"} marked "${payload.poolTitle}" as delivered. Confirm you received your item to unlock your review.`,
      };

    case NotificationType.pool_dead:
      return {
        title: "Pool Closed (Unfilled)",
        body: `"${payload.poolTitle}" didn't reach the 350 GHS cart floor in time. Your ${payload.amount || "join fee"} is now ${platform} credit.`,
        smsText: `"${payload.poolTitle}" didn't fill in time. Your ${payload.amount || "fee"} is now ${platform} credit.`,
      };

    case NotificationType.pool_recreated:
      return {
        title: "Pool Recreated",
        body: `"${payload.poolTitle}" has been recreated with a new deadline. You're still in — no action needed.`,
        smsText: `"${payload.poolTitle}" has been recreated with a new deadline. You're still in — no action needed.`,
      };

    case NotificationType.dispute_opened:
      return {
        title: "Dispute Raised",
        body: `A dispute was raised on "${payload.poolTitle}": ${payload.disputeType}. Review details in your dashboard.`,
      };

    case NotificationType.dispute_resolved:
      return {
        title: "Dispute Resolved",
        body: `Your dispute on "${payload.poolTitle}" has been resolved: ${payload.resolution}.`,
      };

    case NotificationType.leader_application_status:
      return {
        title: "Leader Application Update",
        body: `Your leader application status is now: ${payload.status}.`,
        smsText: `${platform}: your leader application was ${payload.status}.`,
      };

    case NotificationType.review_unlocked:
      return {
        title: "Leave a Review",
        body: `You confirmed delivery for "${payload.poolTitle}" — you can now leave ${payload.leaderName} a review.`,
      };

    case NotificationType.leader_payout_disbursed:
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

/**
 * Dispatch notification: Persists in_app notification to database and dispatches SMS if critical/high urgency
 */
export const dispatchNotification = async ({
  userId,
  type,
  payload,
  sendSmsChannel = false,
}: {
  userId: string;
  type: NotificationType;
  payload: NotificationPayload;
  sendSmsChannel?: boolean;
}) => {
  try {
    const { title, body, smsText } = generateNotificationText(type, payload);

    // 1. Create In-App Notification (Always persistent in DB)
    const inAppRecord = await prisma.notification.create({
      data: {
        userId,
        type,
        channel: NotificationChannel.in_app,
        title,
        body,
        payload: payload as any,
        sentAt: new Date(),
      },
    });

    // 2. Dispatch SMS Channel if configured or requested
    if (sendSmsChannel) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.phone) {
        const textToSend = smsText || body;
        await sendSms(user.phone, textToSend);

        await prisma.notification.create({
          data: {
            userId,
            type,
            channel: NotificationChannel.sms,
            title,
            body: textToSend,
            payload: payload as any,
            sentAt: new Date(),
          },
        });
      }
    }

    return inAppRecord;
  } catch (error) {
    logger.error(`Error dispatching notification (${type}):`, error);
  }
};
