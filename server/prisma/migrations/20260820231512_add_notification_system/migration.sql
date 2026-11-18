-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('otp_code', 'pool_joined', 'pool_funded', 'item_cost_reminder', 'item_cost_deadline_missed', 'proof_uploaded_needs_confirmation', 'pool_shipped', 'shipping_deadline_reminder', 'shipping_deadline_missed', 'delivery_marked_needs_confirmation', 'pool_dead', 'pool_recreated', 'dispute_opened', 'dispute_resolved', 'leader_application_status', 'review_unlocked', 'leader_payout_disbursed');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('sms', 'email', 'in_app');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "payload" JSONB,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
