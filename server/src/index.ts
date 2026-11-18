import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./env";
import { prisma } from "./db";
import { logger } from "./utils/logger";
import authRoutes from "./routes/auth.routes";
import poolRoutes from "./routes/pool.routes";
import leaderRoutes from "./routes/leader.routes";
import joinRoutes from "./routes/join.routes";
import webhookRoutes from "./routes/webhook.routes";
import buyerRoutes from "./routes/buyer.routes";
import itemCostRoutes from "./routes/item-cost.routes";
import fulfillmentRoutes from "./routes/fulfillment.routes";
import reviewRoutes from "./routes/review.routes";
import disputeRoutes from "./routes/dispute.routes";
import leaderDashboardRoutes from "./routes/leader-dashboard.routes";
import adminRoutes from "./routes/admin.routes";
import notificationRoutes from "./routes/notification.routes";
import uploadRoutes from "./routes/upload.routes";
import { initPgBoss, getPgBoss } from "./jobs/boss.scheduler";
import { apiRateLimiter } from "./middleware/rate-limit";

const app = express();

// 1. Security & Protection Middlewares
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        env.NODE_ENV !== "production" ||
        env.CLIENT_ORIGIN.includes(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error("CORS Policy: Origin not allowed."));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));

// 2. Request Logging Middleware using Winston
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`HTTP ${req.method} ${req.path}`);
  next();
});

// 3. API Rate Limiter
app.use("/api", apiRateLimiter);

// 4. API Routes
app.use("/api/auth", authRoutes);
app.use("/api/pools", poolRoutes);
app.use("/api/leaders", leaderRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/me", buyerRoutes);
app.use("/api/leader", leaderDashboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api", uploadRoutes);
app.use("/api", joinRoutes);
app.use("/api", itemCostRoutes);
app.use("/api", fulfillmentRoutes);
app.use("/api", reviewRoutes);
app.use("/api", disputeRoutes);

// 5. Deep Health Check Endpoint
app.get("/api/health", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const boss = getPgBoss();

    res.status(200).json({
      status: "ok",
      service: "fides-backend",
      platform: "Fides Group Buying",
      timestamp: new Date().toISOString(),
      env: env.NODE_ENV,
      database: "connected",
      queueWorker: boss ? "running" : "stopped",
      minOrderGhs: env.TEMU_MIN_ORDER_GHS,
    });
  } catch (error: any) {
    logger.error("Health check database ping failed:", error);
    res.status(500).json({
      status: "degraded",
      error: "Database connection ping failed",
      message: error.message,
    });
  }
});

// Root route
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    platform: "Fides Group Buying API Server",
    health: "/api/health",
  });
});

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

// Global Error Handler via Winston
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error("Unhandled Server Error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// 6. Server Initialization & Graceful Shutdown
const server = app.listen(env.PORT, async () => {
  logger.info(`🚀 Fides Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  logger.info(`🏥 Deep Health check available at http://localhost:${env.PORT}/api/health`);
  await initPgBoss();
});

const gracefulShutdown = async (signal: string) => {
  logger.warn(`🛑 ${signal} received. Initiating graceful shutdown...`);

  server.close(async () => {
    logger.info("🔌 HTTP Server closed.");
    try {
      const boss = getPgBoss();
      if (boss) {
        await boss.stop();
        logger.info("📦 PgBoss Worker stopped.");
      }
      await prisma.$disconnect();
      logger.info("🗄️ Database disconnected.");
      process.exit(0);
    } catch (err) {
      logger.error("❌ Error during graceful shutdown:", err);
      process.exit(1);
    }
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
