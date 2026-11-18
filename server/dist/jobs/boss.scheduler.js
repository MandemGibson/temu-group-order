"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initPgBoss = initPgBoss;
exports.getPgBoss = getPgBoss;
const pg_boss_1 = require("pg-boss");
const deadline_sweeps_1 = require("./deadline-sweeps");
let bossInstance = null;
async function initPgBoss() {
    try {
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            console.warn("⚠️ DATABASE_URL not found. Skipping PgBoss initialization.");
            return null;
        }
        const boss = new pg_boss_1.PgBoss({
            connectionString: databaseUrl,
        });
        boss.on("error", (err) => console.error("❌ PgBoss error:", err));
        await boss.start();
        console.log("🚀 PgBoss Background Job Queue Worker started successfully");
        // Register job queues and schedules
        await boss.schedule("join-deadline-sweep", "* * * * *");
        await boss.schedule("item-cost-deadline-sweep", "*/5 * * * *");
        await boss.schedule("shipping-deadline-sweep", "*/10 * * * *");
        await boss.schedule("reconcile-pending-tx", "*/15 * * * *");
        // Register workers
        await boss.work("join-deadline-sweep", async () => {
            await (0, deadline_sweeps_1.sweepExpiredJoinDeadlines)();
        });
        await boss.work("item-cost-deadline-sweep", async () => {
            await (0, deadline_sweeps_1.sweepExpiredItemCostDeadlines)();
        });
        await boss.work("shipping-deadline-sweep", async () => {
            await (0, deadline_sweeps_1.sweepMissedShippingDeadlines)();
        });
        await boss.work("reconcile-pending-tx", async () => {
            await (0, deadline_sweeps_1.reconcilePendingTransactions)();
        });
        await boss.work("send-notification", async (job) => {
            const { dispatchNotification } = await Promise.resolve().then(() => __importStar(require("../services/notification.service")));
            await dispatchNotification(job.data);
        });
        bossInstance = boss;
        return boss;
    }
    catch (error) {
        console.error("❌ Failed to initialize PgBoss:", error);
        return null;
    }
}
function getPgBoss() {
    return bossInstance;
}
