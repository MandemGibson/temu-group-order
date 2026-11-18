"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpStore = void 0;
class OtpStore {
    store = new Map();
    expiryMs;
    cooldownMs = 60 * 1000; // 60s resend cooldown
    maxAttempts = 5;
    constructor() {
        const minutes = parseInt(process.env.OTP_EXPIRY_MINUTES || "5", 10);
        this.expiryMs = minutes * 60 * 1000;
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
        // Generate a 6-digit OTP code (in dev mode, '123456' could be used or random 6-digit)
        const code = Math.floor(100000 + Math.random() * 900000).toString();
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
        if (record.attempts >= this.maxAttempts) {
            this.store.delete(key);
            return {
                valid: false,
                reason: "Maximum verification attempts exceeded. Please request a new OTP.",
            };
        }
        record.attempts += 1;
        // Check code match (or fallback dev backdoor '123456' in development)
        const isDev = process.env.NODE_ENV === "development";
        if (record.code === inputCode.trim() ||
            (isDev && inputCode.trim() === "123456")) {
            this.store.delete(key);
            return { valid: true };
        }
        return {
            valid: false,
            reason: `Invalid OTP code. ${this.maxAttempts - record.attempts} attempt(s) remaining.`,
        };
    }
}
exports.otpStore = new OtpStore();
