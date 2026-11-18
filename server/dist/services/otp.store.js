"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpStore = exports.OtpStore = void 0;
const crypto_1 = __importDefault(require("crypto"));
class OtpStore {
    store = new Map();
    expiryMs;
    cooldownMs = 60 * 1000; // 60s resend cooldown
    maxAttempts = 5;
    cleanupInterval = null;
    constructor() {
        const minutes = parseInt(process.env.OTP_EXPIRY_MINUTES || "5", 10);
        this.expiryMs = minutes * 60 * 1000;
        // Periodically sweep expired OTPs every 5 minutes to prevent memory leaks
        this.cleanupInterval = setInterval(() => {
            this.purgeExpired();
        }, 5 * 60 * 1000);
        // Unref cleanup timer so it does not block process exit
        if (this.cleanupInterval &&
            typeof this.cleanupInterval.unref === "function") {
            this.cleanupInterval.unref();
        }
    }
    purgeExpired() {
        const now = Date.now();
        for (const [key, record] of this.store.entries()) {
            if (now > record.expiresAt) {
                this.store.delete(key);
            }
        }
    }
    normalizePhone(phone) {
        // Remove spaces, hyphens, parentheses
        const cleaned = phone.replace(/[\s\-\(\)]/g, "");
        if (cleaned.startsWith("0") && cleaned.length === 10) {
            // Convert Ghana local 024... to +23324...
            return `+233${cleaned.slice(1)}`;
        }
        if (!cleaned.startsWith("+") && cleaned.length >= 9) {
            return `+${cleaned}`;
        }
        return cleaned;
    }
    canRequestOtp(phone) {
        const key = this.normalizePhone(phone);
        const existing = this.store.get(key);
        if (!existing)
            return { allowed: true };
        const now = Date.now();
        const elapsed = now - existing.lastSentAt;
        if (elapsed < this.cooldownMs) {
            const waitSeconds = Math.ceil((this.cooldownMs - elapsed) / 1000);
            return { allowed: false, waitSeconds };
        }
        return { allowed: true };
    }
    generateOtp(phone) {
        const key = this.normalizePhone(phone);
        // Cryptographically secure 6-digit OTP code [100000, 999999]
        const code = crypto_1.default.randomInt(100000, 1000000).toString();
        const now = Date.now();
        this.store.set(key, {
            code,
            expiresAt: now + this.expiryMs,
            lastSentAt: now,
            attempts: 0,
        });
        return code;
    }
    verifyOtp(phone, inputCode) {
        const key = this.normalizePhone(phone);
        const record = this.store.get(key);
        if (!record) {
            return {
                valid: false,
                reason: "No OTP was requested for this phone number.",
            };
        }
        if (Date.now() > record.expiresAt) {
            this.store.delete(key);
            return {
                valid: false,
                reason: "OTP code has expired. Please request a new code.",
            };
        }
        record.attempts += 1;
        const trimmedInput = inputCode.trim();
        const isDev = process.env.NODE_ENV === "development";
        const allowTestOtp = process.env.ALLOW_TEST_OTP === "true";
        // In local dev/test only with explicit env flag, allow sandbox code
        if ((isDev || allowTestOtp) && trimmedInput === "123456") {
            this.store.delete(key);
            return { valid: true };
        }
        // Constant-time comparison to prevent timing side-channel attacks
        const codeBuf = Buffer.from(record.code, "utf8");
        const inputBuf = Buffer.from(trimmedInput, "utf8");
        if (codeBuf.length === inputBuf.length &&
            crypto_1.default.timingSafeEqual(codeBuf, inputBuf)) {
            this.store.delete(key);
            return { valid: true };
        }
        // If max attempts reached, lock out immediately and delete record
        if (record.attempts >= this.maxAttempts) {
            this.store.delete(key);
            return {
                valid: false,
                reason: "Maximum verification attempts exceeded. Please request a new OTP.",
            };
        }
        return {
            valid: false,
            reason: `Invalid OTP code. ${this.maxAttempts - record.attempts} attempt(s) remaining.`,
        };
    }
    clear() {
        this.store.clear();
    }
}
exports.OtpStore = OtpStore;
exports.otpStore = new OtpStore();
