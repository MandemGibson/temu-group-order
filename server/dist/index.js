"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const env_1 = require("./env");
const db_1 = require("./db");
const logger_1 = require("./utils/logger");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const pool_routes_1 = __importDefault(require("./routes/pool.routes"));
const leader_routes_1 = __importDefault(require("./routes/leader.routes"));
const join_routes_1 = __importDefault(require("./routes/join.routes"));
const webhook_routes_1 = __importDefault(require("./routes/webhook.routes"));
const buyer_routes_1 = __importDefault(require("./routes/buyer.routes"));
const item_cost_routes_1 = __importDefault(require("./routes/item-cost.routes"));
const fulfillment_routes_1 = __importDefault(require("./routes/fulfillment.routes"));
const review_routes_1 = __importDefault(require("./routes/review.routes"));
const dispute_routes_1 = __importDefault(require("./routes/dispute.routes"));
const leader_dashboard_routes_1 = __importDefault(require("./routes/leader-dashboard.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const boss_scheduler_1 = require("./jobs/boss.scheduler");
const rate_limit_1 = require("./middleware/rate-limit");
const app = (0, express_1.default)();
// 1. Security & Protection Middlewares
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin ||
            env_1.env.NODE_ENV !== "production" ||
            env_1.env.CLIENT_ORIGIN.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("CORS Policy: Origin not allowed."));
        }
    },
    credentials: true,
}));
app.use(express_1.default.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
        req.rawBody = buf;
    },
}));
// 2. Request Logging Middleware using Winston
app.use((req, _res, next) => {
    logger_1.logger.info(`HTTP ${req.method} ${req.path}`);
    next();
});
// 3. API Rate Limiter
app.use("/api", rate_limit_1.apiRateLimiter);
// 4. API Routes
app.use("/api/auth", auth_routes_1.default);
app.use("/api/pools", pool_routes_1.default);
app.use("/api/leaders", leader_routes_1.default);
app.use("/api/webhooks", webhook_routes_1.default);
app.use("/api/me", buyer_routes_1.default);
app.use("/api/leader", leader_dashboard_routes_1.default);
app.use("/api/admin", admin_routes_1.default);
app.use("/api/notifications", notification_routes_1.default);
app.use("/api", upload_routes_1.default);
app.use("/api", join_routes_1.default);
app.use("/api", item_cost_routes_1.default);
app.use("/api", fulfillment_routes_1.default);
app.use("/api", review_routes_1.default);
app.use("/api", dispute_routes_1.default);
// 5. Deep Health Check Endpoint
app.get("/api/health", async (_req, res) => {
    try {
        await db_1.prisma.$queryRaw `SELECT 1`;
        const boss = (0, boss_scheduler_1.getPgBoss)();
        res.status(200).json({
            status: "ok",
            service: "fides-backend",
            platform: "Fides Group Buying",
            timestamp: new Date().toISOString(),
            env: env_1.env.NODE_ENV,
            database: "connected",
            queueWorker: boss ? "running" : "stopped",
            minOrderGhs: env_1.env.TEMU_MIN_ORDER_GHS,
        });
    }
    catch (error) {
        logger_1.logger.error("Health check database ping failed:", error);
        res.status(500).json({
            status: "degraded",
            error: "Database connection ping failed",
            message: error.message,
        });
    }
});
// Root route
app.get("/", (_req, res) => {
    res.status(200).json({
        platform: "Fides Group Buying API Server",
        health: "/api/health",
    });
});
// 404 Handler
app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
});
// Global Error Handler via Winston
app.use((err, _req, res, _next) => {
    logger_1.logger.error("Unhandled Server Error:", err);
    res.status(500).json({
        error: "Internal Server Error",
        message: env_1.env.NODE_ENV === "development" ? err.message : undefined,
    });
});
// 6. Server Initialization & Graceful Shutdown
const server = app.listen(env_1.env.PORT, async () => {
    logger_1.logger.info(`🚀 Fides Server running in ${env_1.env.NODE_ENV} mode on port ${env_1.env.PORT}`);
    logger_1.logger.info(`🏥 Deep Health check available at http://localhost:${env_1.env.PORT}/api/health`);
    await (0, boss_scheduler_1.initPgBoss)();
});
const gracefulShutdown = async (signal) => {
    logger_1.logger.warn(`🛑 ${signal} received. Initiating graceful shutdown...`);
    server.close(async () => {
        logger_1.logger.info("🔌 HTTP Server closed.");
        try {
            const boss = (0, boss_scheduler_1.getPgBoss)();
            if (boss) {
                await boss.stop();
                logger_1.logger.info("📦 PgBoss Worker stopped.");
            }
            await db_1.prisma.$disconnect();
            logger_1.logger.info("🗄️ Database disconnected.");
            process.exit(0);
        }
        catch (err) {
            logger_1.logger.error("❌ Error during graceful shutdown:", err);
            process.exit(1);
        }
    });
};
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
