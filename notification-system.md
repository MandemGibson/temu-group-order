# Notification System

## 1. Channels

| Channel | Used for | Provider |
|---|---|---|
| SMS | Time-sensitive, must-see events (OTP, deadlines, drops) | TBD — check Moolre first, fall back to Africa's Talking/Twilio |
| Email | Recovery-related, receipts, lower-urgency confirmations | Already collected at signup |
| In-app | Everything — persistent log a user can check regardless of whether SMS/email landed | `Notification` table, polled or pushed |

In-app is the reliability floor — SMS delivery can fail silently (wrong number, carrier issue), so every notification is written to the `Notification` table regardless of whether an SMS/email send also fires. A user should never lose an update just because a text didn't arrive.

## 2. Delivery mechanism

Sent through **pg-boss** (same queue already chosen for background jobs) rather than firing SMS/email synchronously inside API request handlers. Reasons:
- A slow or failing SMS provider shouldn't block or fail the user-facing action that triggered it (e.g. a buyer confirming payment shouldn't hang waiting on an SMS send)
- pg-boss gives retries for free if a provider call fails
- One consistent delivery pattern for both scheduled jobs and event-triggered notifications, rather than two different mechanisms

Flow: an event happens (API action or background job) → a `send-notification` job is queued with the event type, recipient, and payload → a worker picks it up → writes the `Notification` row → attempts SMS/email per the event's configured channels.

## 3. Schema addition

```prisma
enum NotificationType {
  otp_code
  pool_joined
  pool_funded
  item_cost_reminder
  item_cost_deadline_missed        // dropped, fee converted to credit
  proof_uploaded_needs_confirmation // to leader
  pool_shipped
  shipping_deadline_reminder        // to leader, before it's missed
  shipping_deadline_missed          // to leader + buyers, dispute auto-raised
  delivery_marked_needs_confirmation // to buyer
  pool_dead
  pool_recreated
  dispute_opened
  dispute_resolved
  leader_application_status
  review_unlocked
  leader_payout_disbursed
}

enum NotificationChannel {
  sms
  email
  in_app
}

model Notification {
  id          String               @id @default(uuid())
  userId      String
  user        User                 @relation(fields: [userId], references: [id])
  type        NotificationType
  channel     NotificationChannel
  payload     Json                 // event-specific data (poolId, amount, etc.)
  sentAt      DateTime?
  readAt      DateTime?
  failedAt    DateTime?
  createdAt   DateTime             @default(now())

  @@index([userId, readAt])
}
```

Add `notifications Notification[]` to the `User` model's relations.

## 4. Event catalog

| Event | Recipient | Channels | Urgency |
|---|---|---|---|
| OTP code | requester | SMS | Critical |
| Pool joined (confirmation) | buyer | in-app | Low |
| Pool funded | all joined buyers | SMS + in-app | High |
| Item-cost payment reminder | buyer (before their deadline) | SMS + in-app | High |
| Item-cost deadline missed | buyer (dropped, fee → credit) | SMS + in-app | High |
| Buyer uploaded proof | leader (needs to confirm funded) | in-app (+ SMS if leader hasn't acted in a while) | Medium |
| Pool shipped / tracking added | all buyers in pool | SMS + in-app | High |
| Shipping deadline approaching | leader | in-app | Medium |
| Shipping deadline missed | leader + all buyers | SMS + in-app | High |
| Leader marked delivered | buyer (needs to confirm) | in-app | Medium |
| Pool dead | leader + all buyers | SMS + in-app | High |
| Pool recreated | carried-over buyers | SMS + in-app | High |
| Dispute opened | leader (if buyer-raised) | in-app | High |
| Dispute resolved | both parties | in-app | High |
| Leader application approved/rejected | applicant | SMS + email | High |
| Review unlocked (post-delivery) | buyer | in-app | Low |
| Leader payout disbursed | leader | in-app | Medium |

**"Urgency" maps to channel choice**: Critical/High events always include SMS (time-sensitive, money- or deadline-related); Medium/Low events are in-app only to avoid SMS fatigue — a buyer getting a text for every low-stakes update would start ignoring all of them, including the ones that matter.

## 5. Open item

Exact SMS provider is still pending confirmation (check Moolre's docs for built-in SMS capability before adding Africa's Talking/Twilio as a dedicated provider) — this doc assumes SMS as a channel exists, but the underlying provider isn't locked in yet.

## 6. Message templates

SMS kept short and cost-conscious (most providers charge per 160-char segment). `{{platform}}` is a placeholder for whatever the final product name ends up being. In-app notifications get a short title + fuller body since space isn't a cost constraint there.

### otp_code
- **SMS**: `Your {{platform}} code is {{code}}. Expires in 5 min. Don't share this.`

### pool_joined
- **In-app title**: Joined pool
- **In-app body**: `You joined "{{poolTitle}}" with {{leaderName}}. You'll be notified once the pool is funded.`

### pool_funded
- **SMS**: `{{platform}}: "{{poolTitle}}" hit its minimum! Pay item cost to {{leaderName}} within {{itemCostHours}}h — check the app for details.`
- **In-app body**: `"{{poolTitle}}" is funded. Pay {{leaderName}} the item cost ({{itemCostAmount}}) via momo {{momoNumber}}, ref {{paymentReference}}, within {{itemCostHours}} hours.`

### item_cost_reminder
- **SMS**: `Reminder: pay item cost for "{{poolTitle}}" — {{hoursRemaining}}h left before you're dropped from the pool.`

### item_cost_deadline_missed
- **SMS**: `You missed the item-cost deadline for "{{poolTitle}}". You've been dropped; {{amount}} is now {{platform}} credit.`

### proof_uploaded_needs_confirmation (to leader)
- **In-app title**: Buyer uploaded proof
- **In-app body**: `{{buyerName}} uploaded proof of payment for "{{poolTitle}}". Confirm receipt to mark them funded.`

### pool_shipped
- **SMS**: `Your order in "{{poolTitle}}" has shipped! Tracking: {{trackingNumber}}.`

### shipping_deadline_reminder (to leader)
- **In-app title**: Shipping deadline approaching
- **In-app body**: `"{{poolTitle}}" closed {{hoursAgo}}h ago — you have {{hoursRemaining}}h left to ship before this is flagged.`

### shipping_deadline_missed
- **SMS (leader)**: `You missed the shipping deadline for "{{poolTitle}}". This has been flagged on your profile.`
- **SMS (buyers)**: `Your leader missed the shipping deadline for "{{poolTitle}}". A dispute has been opened automatically.`

### delivery_marked_needs_confirmation (to buyer)
- **In-app title**: Confirm delivery
- **In-app body**: `{{leaderName}} marked "{{poolTitle}}" as delivered. Confirm you received your item to unlock your review.`

### pool_dead
- **SMS (leader)**: `"{{poolTitle}}" didn't reach 350 cedis in time. Recreate the pool from your dashboard, or it closes for good.`
- **SMS (buyers)**: `"{{poolTitle}}" didn't fill in time. Your {{amount}} is now {{platform}} credit, or the leader may recreate it.`

### pool_recreated
- **SMS**: `"{{poolTitle}}" has been recreated with a new deadline. You're still in — no action needed.`

### dispute_opened (to leader, buyer-raised only)
- **In-app title**: Dispute raised
- **In-app body**: `A dispute was raised on "{{poolTitle}}": {{disputeType}}. Review the details in your dashboard.`

### dispute_resolved
- **In-app title**: Dispute resolved
- **In-app body**: `Your dispute on "{{poolTitle}}" has been resolved: {{resolution}}.`

### leader_application_status
- **SMS**: `{{platform}}: your leader application was {{status}}. {{#if approved}}Welcome — start creating pools from your dashboard.{{/if}}`
- **Email subject**: `Your {{platform}} leader application`

### review_unlocked
- **In-app title**: Leave a review
- **In-app body**: `You confirmed delivery for "{{poolTitle}}" — you can now leave {{leaderName}} a review.`

### leader_payout_disbursed
- **In-app title**: Payout available
- **In-app body**: `{{amount}} from "{{poolTitle}}" is now in your withdrawable balance.`
