import crypto from "crypto";

interface OtpRecord {
  code: string;
  expiresAt: number;
  lastSentAt: number;
  attempts: number;
}

export class OtpStore {
  private store: Map<string, OtpRecord> = new Map();
  private readonly expiryMs: number;
  private readonly cooldownMs: number = 60 * 1000; // 60s resend cooldown
  private readonly maxAttempts: number = 5;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    const minutes = parseInt(process.env.OTP_EXPIRY_MINUTES || "5", 10);
    this.expiryMs = minutes * 60 * 1000;

    // Periodically sweep expired OTPs every 5 minutes to prevent memory leaks
    this.cleanupInterval = setInterval(
      () => {
        this.purgeExpired();
      },
      5 * 60 * 1000,
    );

    // Unref cleanup timer so it does not block process exit
    if (
      this.cleanupInterval &&
      typeof this.cleanupInterval.unref === "function"
    ) {
      this.cleanupInterval.unref();
    }
  }

  public purgeExpired(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  public normalizePhone(phone: string): string {
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

  public canRequestOtp(phone: string): {
    allowed: boolean;
    waitSeconds?: number;
  } {
    const key = this.normalizePhone(phone);
    const existing = this.store.get(key);
    if (!existing) return { allowed: true };

    const now = Date.now();
    const elapsed = now - existing.lastSentAt;
    if (elapsed < this.cooldownMs) {
      const waitSeconds = Math.ceil((this.cooldownMs - elapsed) / 1000);
      return { allowed: false, waitSeconds };
    }

    return { allowed: true };
  }

  public generateOtp(phone: string): string {
    const key = this.normalizePhone(phone);
    // Cryptographically secure 6-digit OTP code [100000, 999999]
    const code = crypto.randomInt(100000, 1000000).toString();
    const now = Date.now();

    this.store.set(key, {
      code,
      expiresAt: now + this.expiryMs,
      lastSentAt: now,
      attempts: 0,
    });

    return code;
  }

  public verifyOtp(
    phone: string,
    inputCode: string,
  ): { valid: boolean; reason?: string } {
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

    if (
      codeBuf.length === inputBuf.length &&
      crypto.timingSafeEqual(codeBuf, inputBuf)
    ) {
      this.store.delete(key);
      return { valid: true };
    }

    // If max attempts reached, lock out immediately and delete record
    if (record.attempts >= this.maxAttempts) {
      this.store.delete(key);
      return {
        valid: false,
        reason:
          "Maximum verification attempts exceeded. Please request a new OTP.",
      };
    }

    return {
      valid: false,
      reason: `Invalid OTP code. ${this.maxAttempts - record.attempts} attempt(s) remaining.`,
    };
  }

  public clear(): void {
    this.store.clear();
  }
}

export const otpStore = new OtpStore();
