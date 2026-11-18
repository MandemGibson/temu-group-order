"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
exports.validateEnv = validateEnv;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function validateEnv() {
    const isDev = process.env.NODE_ENV !== "production";
    if (!process.env.DATABASE_URL) {
        throw new Error("FATAL: DATABASE_URL environment variable is missing.");
    }
    const jwtSecret = process.env.JWT_SECRET || "super-secret-temu-group-order-key-dev";
    if (!isDev && jwtSecret.includes("dev")) {
        console.warn("WARNING: Weak or default JWT_SECRET used in production environment!");
    }
    const port = Number(process.env.PORT || 4000);
    const minGhs = Number(process.env.TEMU_MIN_ORDER_GHS || 350);
    const clientOrigins = process.env.CLIENT_ORIGIN
        ? process.env.CLIENT_ORIGIN.split(",").map((o) => o.trim())
        : [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
        ];
    return {
        PORT: port,
        NODE_ENV: process.env.NODE_ENV || "development",
        DATABASE_URL: process.env.DATABASE_URL,
        JWT_SECRET: jwtSecret,
        CLIENT_ORIGIN: clientOrigins,
        OTP_EXPIRY_MINUTES: Number(process.env.OTP_EXPIRY_MINUTES || 5),
        MOOLRE_API_KEY: process.env.MOOLRE_API_KEY || "dev_moolre_key",
        MOOLRE_API_USER: process.env.MOOLRE_API_USER || "fides_dev_user",
        MOOLRE_API_PUBKEY: process.env.MOOLRE_API_PUBKEY || "fides_dev_pubkey",
        MOOLRE_VAS_KEY: process.env.MOOLRE_VAS_KEY || "fides_dev_vaskey",
        MOOLRE_ACCOUNT_NUMBER: process.env.MOOLRE_ACCOUNT_NUMBER || "100000000001",
        MOOLRE_WEBHOOK_SECRET: process.env.MOOLRE_WEBHOOK_SECRET || "dev_moolre_secret",
        TEMU_MIN_ORDER_GHS: minGhs,
        TEMU_MIN_ORDER_PESEWAS: minGhs * 100,
        SMS_PROVIDER: process.env.SMS_PROVIDER || (isDev ? "console" : "moolre"),
        SMS_API_KEY: process.env.SMS_API_KEY,
        SMS_SENDER_ID: process.env.SMS_SENDER_ID || "Fides",
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "",
    };
}
exports.env = validateEnv();
