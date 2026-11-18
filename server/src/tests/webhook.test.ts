import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { moolreService } from "../services/moolre.service";

describe("Webhook HMAC Verification & Resilience", () => {
  const secret = process.env.MOOLRE_WEBHOOK_SECRET || "dev_moolre_secret";

  it("successfully verifies a valid HMAC SHA256 signature from raw string", () => {
    const payload = JSON.stringify({
      status: "success",
      externalref: "test-ref-123",
      amount: 1000,
    });

    const validSignature = crypto
      .createHmac("sha256", secret)
      .update(Buffer.from(payload, "utf8"))
      .digest("hex");

    const isValid = moolreService.verifyWebhookSignature(payload, validSignature);
    expect(isValid).toBe(true);
  });

  it("successfully verifies a valid HMAC SHA256 signature from a Buffer", () => {
    const payloadBuffer = Buffer.from("raw-webhook-payload-body");

    const validSignature = crypto
      .createHmac("sha256", secret)
      .update(payloadBuffer)
      .digest("hex");

    const isValid = moolreService.verifyWebhookSignature(payloadBuffer, validSignature);
    expect(isValid).toBe(true);
  });

  it("rejects an invalid signature with same byte length without errors", () => {
    const payload = "sample-payload";
    const invalidSignature = "a".repeat(64); // 64 hex characters like sha256

    const isValid = moolreService.verifyWebhookSignature(payload, invalidSignature);
    expect(isValid).toBe(false);
  });

  it("safely handles signatures of DIFFERENT lengths without throwing RangeError (timingSafeEqual guard)", () => {
    const payload = "sample-payload";

    // Shorter signature (e.g. 10 chars instead of 64)
    expect(() => {
      const isValid = moolreService.verifyWebhookSignature(payload, "short-sig");
      expect(isValid).toBe(false);
    }).not.toThrow();

    // Longer signature
    expect(() => {
      const isValid = moolreService.verifyWebhookSignature(payload, "x".repeat(128));
      expect(isValid).toBe(false);
    }).not.toThrow();
  });

  it("rejects when signature header is missing or empty", () => {
    const payload = "sample-payload";
    expect(moolreService.verifyWebhookSignature(payload, undefined)).toBe(false);
    expect(moolreService.verifyWebhookSignature(payload, "")).toBe(false);
  });
});
