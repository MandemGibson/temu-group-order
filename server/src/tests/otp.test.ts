import { describe, it, expect, beforeEach } from "vitest";
import { OtpStore } from "../services/otp.store";

describe("OtpStore Security & Functionality", () => {
  let store: OtpStore;

  beforeEach(() => {
    store = new OtpStore();
  });

  describe("Phone Normalization", () => {
    it("normalizes Ghana local 10-digit format (024XXXXXXX) to +23324XXXXXXX", () => {
      expect(store.normalizePhone("0241234567")).toBe("+233241234567");
      expect(store.normalizePhone("0509876543")).toBe("+233509876543");
    });

    it("strips whitespace, dashes, and parentheses", () => {
      expect(store.normalizePhone(" (024) 123-4567 ")).toBe("+233241234567");
    });

    it("preserves international numbers starting with +", () => {
      expect(store.normalizePhone("+233241234567")).toBe("+233241234567");
      expect(store.normalizePhone("+14155552671")).toBe("+14155552671");
    });
  });

  describe("OTP Generation & Cryptography", () => {
    it("generates a cryptographically strong 6-digit numeric string", () => {
      const code = store.generateOtp("+233241000001");
      expect(code).toMatch(/^\d{6}$/);
      expect(Number(code)).toBeGreaterThanOrEqual(100000);
      expect(Number(code)).toBeLessThanOrEqual(999999);
    });

    it("enforces a 60-second cooldown period between requests", () => {
      const phone = "+233241000002";
      store.generateOtp(phone);

      const check = store.canRequestOtp(phone);
      expect(check.allowed).toBe(false);
      expect(check.waitSeconds).toBeGreaterThan(0);
      expect(check.waitSeconds).toBeLessThanOrEqual(60);
    });
  });

  describe("Verification & Rate-Limiting Attempts", () => {
    it("verifies the correct OTP code and removes it from store", () => {
      const phone = "+233241000003";
      const code = store.generateOtp(phone);

      const result = store.verifyOtp(phone, code);
      expect(result.valid).toBe(true);

      // Re-verifying should fail because it was consumed
      const secondAttempt = store.verifyOtp(phone, code);
      expect(secondAttempt.valid).toBe(false);
    });

    it("tracks failed attempts and locks out after 5 failures", () => {
      const phone = "+233241000004";
      store.generateOtp(phone);

      for (let i = 0; i < 4; i++) {
        const attempt = store.verifyOtp(phone, "000000");
        expect(attempt.valid).toBe(false);
        expect(attempt.reason).toContain("attempt(s) remaining");
      }

      // 5th attempt locks out
      const fifthAttempt = store.verifyOtp(phone, "000000");
      expect(fifthAttempt.valid).toBe(false);
      expect(fifthAttempt.reason).toContain("Maximum verification attempts exceeded");

      // Further attempts report no OTP requested (record deleted)
      const sixth = store.verifyOtp(phone, "000000");
      expect(sixth.valid).toBe(false);
      expect(sixth.reason).toContain("No OTP was requested");
    });

    it("rejects non-existent phone verification", () => {
      const result = store.verifyOtp("+233249999999", "123456");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("No OTP was requested");
    });
  });
});
