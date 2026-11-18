import { PgBoss } from "pg-boss";
import {
  sweepExpiredJoinDeadlines,
  sweepExpiredItemCostDeadlines,
  sweepMissedShippingDeadlines,
  reconcilePendingTransactions,
} from "./deadline-sweeps";

let bossInstance: PgBoss | null = null;

export async function initPgBoss(): Promise<PgBoss | null> {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.warn("⚠️ DATABASE_URL not found. Skipping PgBoss initialization.");
      return null;
    }

    const boss = new PgBoss({
      connectionString: databaseUrl,
    });

    boss.on("error", (err: unknown) => console.error("❌ PgBoss error:", err));

    await boss.start();
    console.log("🚀 PgBoss Background Job Queue Worker started successfully");

    // Create queues prior to scheduling to avoid FK constraint errors
    await boss.createQueue("join-deadline-sweep");
    await boss.createQueue("item-cost-deadline-sweep");
    await boss.createQueue("shipping-deadline-sweep");
    await boss.createQueue("reconcile-pending-tx");
    await boss.createQueue("send-notification");

    // Register job schedules
    await boss.schedule("join-deadline-sweep", "* * * * *");
    await boss.schedule("item-cost-deadline-sweep", "*/5 * * * *");
    await boss.schedule("shipping-deadline-sweep", "*/10 * * * *");
    await boss.schedule("reconcile-pending-tx", "*/15 * * * *");

    // Register workers
    await boss.work("join-deadline-sweep", async () => {
      await sweepExpiredJoinDeadlines();
    });

    await boss.work("item-cost-deadline-sweep", async () => {
      await sweepExpiredItemCostDeadlines();
    });

    await boss.work("shipping-deadline-sweep", async () => {
      await sweepMissedShippingDeadlines();
    });

    await boss.work("reconcile-pending-tx", async () => {
      await reconcilePendingTransactions();
    });

    await boss.work("send-notification", async (job: any) => {
      const { dispatchNotification } = await import("../services/notification.service");
      await dispatchNotification(job.data as any);
    });

    bossInstance = boss;
    return boss;
  } catch (error) {
    console.error("❌ Failed to initialize PgBoss:", error);
    return null;
  }
}

export function getPgBoss(): PgBoss | null {
  return bossInstance;
}
