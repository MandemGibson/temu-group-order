import {
  UserRole,
  LeaderOnboardingStatus,
  PoolStatus,
  ItemCostStatus,
  TransactionStatus,
  CreditSourceType,
  NotificationType,
  NotificationChannel,
  DisputeType,
  DisputeStatus,
} from "@prisma/client";
import { prisma } from "../src/db";

async function main() {
  console.log("🌱 Clean seeding Temu Group-Order platform database...");

  // 0. Clean existing data in correct dependency order
  await prisma.review.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.buyerCredit.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.poolJoin.deleteMany();
  await prisma.pool.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Database cleared.");

  // 1. Create System Users
  // Super Admin
  const admin = await prisma.user.create({
    data: {
      phone: "+233241000001",
      name: "Temu Ghana Platform Admin",
      role: UserRole.super_admin,
      leaderOnboardingStatus: LeaderOnboardingStatus.approved,
      leaderApprovedAt: new Date(),
    },
  });

  // Leaders
  const leader1 = await prisma.user.create({
    data: {
      phone: "+233241000002",
      name: "Akosua Mensah",
      role: UserRole.leader,
      leaderOnboardingStatus: LeaderOnboardingStatus.approved,
      leaderApprovedAt: new Date(),
      ghanaCardNumber: "GHA-712398412-1",
      selfieImageUrl:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    },
  });

  const leader2 = await prisma.user.create({
    data: {
      phone: "+233241000003",
      name: "Kwame Osei",
      role: UserRole.leader,
      leaderOnboardingStatus: LeaderOnboardingStatus.approved,
      leaderApprovedAt: new Date(),
      ghanaCardNumber: "GHA-891230491-3",
      selfieImageUrl:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    },
  });

  const leader3 = await prisma.user.create({
    data: {
      phone: "+233241000004",
      name: "Esi Appiah",
      role: UserRole.leader,
      leaderOnboardingStatus: LeaderOnboardingStatus.approved,
      leaderApprovedAt: new Date(),
      ghanaCardNumber: "GHA-341298410-5",
      selfieImageUrl:
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
    },
  });

  // Buyers
  const buyer1 = await prisma.user.create({
    data: {
      phone: "+233241000010",
      name: "Kofi Boateng",
      role: UserRole.buyer,
    },
  });

  const buyer2 = await prisma.user.create({
    data: {
      phone: "+233241000011",
      name: "Ama Serwaa",
      role: UserRole.buyer,
    },
  });

  const buyer3 = await prisma.user.create({
    data: {
      phone: "+233241000012",
      name: "Yaw Mensah",
      role: UserRole.buyer,
    },
  });

  const buyer4 = await prisma.user.create({
    data: {
      phone: "+233241000013",
      name: "Abena Ofori",
      role: UserRole.buyer,
    },
  });

  // Applicant awaiting approval
  const applicant = await prisma.user.create({
    data: {
      phone: "+233241000020",
      name: "Daniel Owusu",
      role: UserRole.buyer,
      leaderOnboardingStatus: LeaderOnboardingStatus.pending_review,
      ghanaCardNumber: "GHA-998811223-4",
      selfieImageUrl:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    },
  });

  // 2. Add Platform Buyer Credit Balances
  await prisma.buyerCredit.create({
    data: {
      userId: buyer1.id,
      amountPesewas: 4500, // GH₵ 45.00 credit
      sourceType: CreditSourceType.admin_grant,
    },
  });

  await prisma.buyerCredit.create({
    data: {
      userId: buyer2.id,
      amountPesewas: 2000, // GH₵ 20.00 credit
      sourceType: CreditSourceType.admin_grant,
    },
  });

  await prisma.buyerCredit.create({
    data: {
      userId: buyer3.id,
      amountPesewas: 1500, // GH₵ 15.00 credit
      sourceType: CreditSourceType.dead_pool_refund,
    },
  });

  console.log("👤 Users & Buyer Credits created.");

  // 3. Create Pools covering all lifecycle stages
  const now = new Date();
  const deadline48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const deadline36h = new Date(now.getTime() + 36 * 60 * 60 * 1000);
  const deadline24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const past2d = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  // --- Pool 1: Open Electronics ---
  const pool1 = await prisma.pool.create({
    data: {
      leaderId: leader1.id,
      isPlatformPool: false,
      title: "Baseus 65W GaN Fast Chargers & Anker Braided Cables",
      category: "Electronics",
      targetPesewas: 35000, // GH₵ 350.00
      minPerPersonPesewas: 4000,
      maxParticipants: 10,
      joinFeePesewas: 1000, // GH₵ 10.00
      platformCommissionBps: 1000,
      status: PoolStatus.open,
      deadlineAt: deadline48h,
      itemCostDeadlineHours: 24,
    },
  });

  // Joins for Pool 1
  const tx1_1 = await prisma.transaction.create({
    data: {
      userId: buyer1.id,
      amountPesewas: 1000,
      leaderSharePesewas: 900,
      platformSharePesewas: 100,
      status: TransactionStatus.paid,
      idempotencyKey: "seed_tx_1_1",
    },
  });

  await prisma.poolJoin.create({
    data: {
      poolId: pool1.id,
      buyerId: buyer1.id,
      transactionId: tx1_1.id,
      contributionPesewas: 15000, // GH₵ 150.00
      itemScreenshotUrl:
        "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400",
      editableUntilPaid: false,
    },
  });

  const tx1_2 = await prisma.transaction.create({
    data: {
      userId: buyer2.id,
      amountPesewas: 1000,
      leaderSharePesewas: 900,
      platformSharePesewas: 100,
      status: TransactionStatus.paid,
      idempotencyKey: "seed_tx_1_2",
    },
  });

  await prisma.poolJoin.create({
    data: {
      poolId: pool1.id,
      buyerId: buyer2.id,
      transactionId: tx1_2.id,
      contributionPesewas: 8000, // GH₵ 80.00 (Total: GH₵ 230.00 / 350.00 = 65% filled)
      itemScreenshotUrl:
        "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400",
      editableUntilPaid: false,
    },
  });

  // --- Pool 2: Open Fashion ---
  const pool2 = await prisma.pool.create({
    data: {
      leaderId: leader2.id,
      isPlatformPool: false,
      title: "Temu Summer Linen Dresses, Sunglasses & Tote Bags",
      category: "Fashion",
      targetPesewas: 35000,
      minPerPersonPesewas: 3000,
      maxParticipants: 12,
      joinFeePesewas: 1200,
      platformCommissionBps: 1000,
      status: PoolStatus.open,
      deadlineAt: deadline36h,
      itemCostDeadlineHours: 24,
    },
  });

  const tx2_1 = await prisma.transaction.create({
    data: {
      userId: buyer3.id,
      amountPesewas: 1200,
      leaderSharePesewas: 1080,
      platformSharePesewas: 120,
      status: TransactionStatus.paid,
      idempotencyKey: "seed_tx_2_1",
    },
  });

  await prisma.poolJoin.create({
    data: {
      poolId: pool2.id,
      buyerId: buyer3.id,
      transactionId: tx2_1.id,
      contributionPesewas: 15000, // GH₵ 150.00
      itemScreenshotUrl:
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400",
      editableUntilPaid: false,
    },
  });

  // --- Pool 3: Open Home & Kitchen (Almost Funded - 91%) ---
  const pool3 = await prisma.pool.create({
    data: {
      leaderId: leader1.id,
      isPlatformPool: false,
      title: "Smart LED RGB Ambient Light Bars & Kitchen Organizers",
      category: "Home & Kitchen",
      targetPesewas: 35000,
      minPerPersonPesewas: 5000,
      maxParticipants: 8,
      joinFeePesewas: 1000,
      platformCommissionBps: 1000,
      status: PoolStatus.open,
      deadlineAt: deadline24h,
      itemCostDeadlineHours: 18,
    },
  });

  const tx3_1 = await prisma.transaction.create({
    data: {
      userId: buyer1.id,
      amountPesewas: 1000,
      leaderSharePesewas: 900,
      platformSharePesewas: 100,
      status: TransactionStatus.paid,
      idempotencyKey: "seed_tx_3_1",
    },
  });

  await prisma.poolJoin.create({
    data: {
      poolId: pool3.id,
      buyerId: buyer1.id,
      transactionId: tx3_1.id,
      contributionPesewas: 32000, // GH₵ 320.00 / 350.00 = 91% filled!
      itemScreenshotUrl:
        "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400",
      editableUntilPaid: false,
    },
  });

  // --- Pool 4: Open Others (Null category in DB) ---
  const pool4 = await prisma.pool.create({
    data: {
      leaderId: leader3.id,
      isPlatformPool: false,
      title:
        "Uncategorized Miscellaneous Car Detail Supplies & Microfiber Cloths",
      category: null, // Nullable category (Others)
      targetPesewas: 40000, // GH₵ 400.00
      minPerPersonPesewas: 3000,
      maxParticipants: 10,
      joinFeePesewas: 800,
      platformCommissionBps: 1000,
      status: PoolStatus.open,
      deadlineAt: deadline48h,
      itemCostDeadlineHours: 24,
    },
  });

  const tx4_1 = await prisma.transaction.create({
    data: {
      userId: buyer4.id,
      amountPesewas: 800,
      leaderSharePesewas: 720,
      platformSharePesewas: 80,
      status: TransactionStatus.paid,
      idempotencyKey: "seed_tx_4_1",
    },
  });

  await prisma.poolJoin.create({
    data: {
      poolId: pool4.id,
      buyerId: buyer4.id,
      transactionId: tx4_1.id,
      contributionPesewas: 12000, // GH₵ 120.00
      itemScreenshotUrl:
        "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=400",
      editableUntilPaid: false,
    },
  });

  // --- Pool 5: Funded (Item Cost Phase) ---
  const pool5 = await prisma.pool.create({
    data: {
      leaderId: leader1.id,
      isPlatformPool: false,
      title: "Anker Soundcore Motion+ Bluetooth Speaker Batch",
      category: "Electronics",
      targetPesewas: 35000,
      minPerPersonPesewas: 5000,
      maxParticipants: 5,
      joinFeePesewas: 1000,
      platformCommissionBps: 1000,
      status: PoolStatus.funded,
      fundedAt: past2d,
      deadlineAt: past2d,
      shipDeadlineAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      itemCostDeadlineHours: 24,
    },
  });

  const tx5_1 = await prisma.transaction.create({
    data: {
      userId: buyer1.id,
      amountPesewas: 1000,
      leaderSharePesewas: 900,
      platformSharePesewas: 100,
      status: TransactionStatus.disbursed,
      idempotencyKey: "seed_tx_5_1",
    },
  });

  await prisma.poolJoin.create({
    data: {
      poolId: pool5.id,
      buyerId: buyer1.id,
      transactionId: tx5_1.id,
      contributionPesewas: 20000, // GH₵ 200.00
      itemCostStatus: ItemCostStatus.proof_uploaded,
      buyerConfirmedPaidAt: new Date(),
      proofOfPaymentUrl:
        "https://images.unsplash.com/photo-1556742049-0a67d93b3b44?w=400",
      editableUntilPaid: false,
    },
  });

  const tx5_2 = await prisma.transaction.create({
    data: {
      userId: buyer2.id,
      amountPesewas: 1000,
      leaderSharePesewas: 900,
      platformSharePesewas: 100,
      status: TransactionStatus.disbursed,
      idempotencyKey: "seed_tx_5_2",
    },
  });

  await prisma.poolJoin.create({
    data: {
      poolId: pool5.id,
      buyerId: buyer2.id,
      transactionId: tx5_2.id,
      contributionPesewas: 18000, // GH₵ 180.00
      itemCostStatus: ItemCostStatus.unpaid,
      itemCostDeadlineAt: new Date(now.getTime() + 12 * 60 * 60 * 1000),
      editableUntilPaid: false,
    },
  });

  // --- Pool 6: Shipped (SpeedAF Waybill & Tracking Uploaded) ---
  const pool6 = await prisma.pool.create({
    data: {
      leaderId: leader2.id,
      isPlatformPool: false,
      title: "Lenovo LP40 Wireless TWS Earbuds & Phone Stands",
      category: "Electronics",
      targetPesewas: 35000,
      minPerPersonPesewas: 4000,
      maxParticipants: 10,
      joinFeePesewas: 1000,
      platformCommissionBps: 1000,
      status: PoolStatus.shipped,
      fundedAt: past2d,
      shippedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      deadlineAt: past2d,
      trackingNumber: "TEMU_GH_8892019",
      shippingProofImageUrl:
        "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400",
      itemCostDeadlineHours: 24,
    },
  });

  const tx6_1 = await prisma.transaction.create({
    data: {
      userId: buyer1.id,
      amountPesewas: 1000,
      leaderSharePesewas: 900,
      platformSharePesewas: 100,
      status: TransactionStatus.disbursed,
      idempotencyKey: "seed_tx_6_1",
    },
  });

  const join6_1 = await prisma.poolJoin.create({
    data: {
      poolId: pool6.id,
      buyerId: buyer1.id,
      transactionId: tx6_1.id,
      contributionPesewas: 37000, // GH₵ 370.00
      itemCostStatus: ItemCostStatus.funded,
      leaderConfirmedFundedAt: past2d,
      editableUntilPaid: false,
    },
  });

  // --- Pool 7: Delivered & Reviews Unlocked ---
  const pool7 = await prisma.pool.create({
    data: {
      leaderId: leader1.id,
      isPlatformPool: false,
      title: "Ergonomic Office Mesh Chair Batch & Desk Lamps",
      category: "Home & Kitchen",
      targetPesewas: 60000, // GH₵ 600.00
      minPerPersonPesewas: 10000,
      maxParticipants: 6,
      joinFeePesewas: 1500,
      platformCommissionBps: 1000,
      status: PoolStatus.delivered,
      fundedAt: past2d,
      shippedAt: past2d,
      deliveredAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      deadlineAt: past2d,
      trackingNumber: "TEMU_GH_4455667",
      shippingProofImageUrl:
        "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400",
      itemCostDeadlineHours: 24,
    },
  });

  const tx7_1 = await prisma.transaction.create({
    data: {
      userId: buyer1.id,
      amountPesewas: 1500,
      leaderSharePesewas: 1350,
      platformSharePesewas: 150,
      status: TransactionStatus.disbursed,
      idempotencyKey: "seed_tx_7_1",
    },
  });

  const join7_1 = await prisma.poolJoin.create({
    data: {
      poolId: pool7.id,
      buyerId: buyer1.id,
      transactionId: tx7_1.id,
      contributionPesewas: 60000, // GH₵ 600.00
      itemCostStatus: ItemCostStatus.funded,
      leaderMarkedDeliveredAt: past2d,
      buyerConfirmedDeliveredAt: new Date(),
      editableUntilPaid: false,
    },
  });

  // Add Verified Buyer Review for Pool 7
  await prisma.review.create({
    data: {
      poolId: pool7.id,
      authorId: buyer1.id,
      poolJoinId: join7_1.id,
      rating: 5,
      comment:
        "Akosua was super transparent! SpeedAF arrived in Accra right on time and item condition was 100% genuine Temu. Will join her pools again!",
    },
  });

  // --- Pool 8: Dead Pool (Failed Unfilled Pool) ---
  await prisma.pool.create({
    data: {
      leaderId: leader3.id,
      isPlatformPool: false,
      title: "Solar Power Bank 30,000mAh Batch",
      category: "Electronics",
      targetPesewas: 35000,
      minPerPersonPesewas: 4000,
      maxParticipants: 8,
      joinFeePesewas: 1000,
      platformCommissionBps: 1000,
      status: PoolStatus.dead,
      deadlineAt: past2d,
      itemCostDeadlineHours: 24,
    },
  });

  console.log("📦 Pools & PoolJoins created covering all lifecycle states.");

  // 4. Create In-App Notifications for testing the Bell Icon Dropdown
  await prisma.notification.create({
    data: {
      userId: buyer1.id,
      type: NotificationType.pool_joined,
      channel: NotificationChannel.in_app,
      title: "Joined Pool",
      body: `You joined "${pool1.title}" with Akosua Mensah. You'll be notified once the pool is funded.`,
      sentAt: new Date(now.getTime() - 30 * 60 * 1000), // 30 min ago
    },
  });

  await prisma.notification.create({
    data: {
      userId: buyer1.id,
      type: NotificationType.review_unlocked,
      channel: NotificationChannel.in_app,
      title: "Leave a Review",
      body: `You confirmed delivery for "${pool7.title}" — you can now leave Akosua Mensah a review.`,
      readAt: new Date(),
      sentAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2h ago
    },
  });

  await prisma.notification.create({
    data: {
      userId: leader1.id,
      type: NotificationType.proof_uploaded_needs_confirmation,
      channel: NotificationChannel.in_app,
      title: "Buyer Uploaded Proof",
      body: `Kofi Boateng uploaded proof of payment for "${pool5.title}". Confirm receipt to mark them funded.`,
      sentAt: new Date(now.getTime() - 15 * 60 * 1000), // 15 min ago
    },
  });

  // 5. Create Sample Dispute for Admin Panel Testing
  await prisma.dispute.create({
    data: {
      poolJoinId: join6_1.id,
      raisedById: buyer1.id,
      type: DisputeType.delivery_dispute,
      reason:
        "Package tracking shows arrived at Accra distribution hub 2 days ago, seeking pickup status update.",
      status: DisputeStatus.open,
    },
  });

  console.log("🔔 Notifications & Admin Disputes seeded.");
  console.log("🎉 FULL UI SEEDING COMPLETED SUCCESSFULLY!");
}

main()
  .catch((e) => {
    console.error("❌ Seed Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
