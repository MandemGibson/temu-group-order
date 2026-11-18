import { describe, it, expect } from "vitest";
import {
  ghanaPhoneRegex,
  requestOtpSchema,
  verifyOtpSchema,
  createPoolSchema,
  joinPoolSchema,
  raiseDisputeSchema,
} from "../validators/schemas";

describe("Zod Validation Schemas", () => {
  describe("Ghana Phone Number Validation", () => {
    it("accepts valid Ghana mobile numbers (MTN, Telecel, AT)", () => {
      const validNumbers = [
        "0241234567",
        "0541234567",
        "0501234567",
        "0201234567",
        "0271234567",
        "+233241234567",
        "+233501234567",
      ];

      for (const num of validNumbers) {
        expect(ghanaPhoneRegex.test(num)).toBe(true);
      }
    });

    it("rejects invalid phone numbers", () => {
      const invalidNumbers = [
        "12345",
        "0123456789", // 01 is not a Ghana mobile network
        "024123456",  // 9 digits instead of 10
        "+14155552671", // US number
        "phone-number",
      ];

      for (const num of invalidNumbers) {
        expect(ghanaPhoneRegex.test(num)).toBe(false);
      }
    });
  });

  describe("createPoolSchema", () => {
    it("validates compliant pool parameters", () => {
      const result = createPoolSchema.safeParse({
        title: "Temu Electronics Pool Accra",
        targetPesewas: 35000,
        minPerPersonPesewas: 2000,
        maxParticipants: 10,
        joinFeePesewas: 1000,
        deadlineHours: 48,
        itemCostDeadlineHours: 24,
      });

      expect(result.success).toBe(true);
    });

    it("fails when target is below 350 GHS (35,000 pesewas)", () => {
      const result = createPoolSchema.safeParse({
        title: "Test Low Target Pool",
        targetPesewas: 10000, // 100 GHS (below 350 minimum)
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("at least 350 GHS");
      }
    });

    it("fails when deadline hours are outside [24, 72]", () => {
      const tooShort = createPoolSchema.safeParse({
        title: "Test Pool",
        targetPesewas: 35000,
        deadlineHours: 12, // too short
      });
      expect(tooShort.success).toBe(false);

      const tooLong = createPoolSchema.safeParse({
        title: "Test Pool",
        targetPesewas: 35000,
        deadlineHours: 96, // too long
      });
      expect(tooLong.success).toBe(false);
    });
  });

  describe("joinPoolSchema", () => {
    it("validates multi-item cart submissions", () => {
      const result = joinPoolSchema.safeParse({
        items: [
          {
            itemDescription: "Wireless Bluetooth Earbuds",
            temuItemUrl: "https://www.temu.com/goods-12345.html",
            quantity: 2,
            estimatedCostGhs: 60,
          },
        ],
        momoPhone: "0241234567",
      });

      expect(result.success).toBe(true);
    });

    it("rejects non-positive quantities", () => {
      const result = joinPoolSchema.safeParse({
        items: [
          {
            itemDescription: "Earbuds",
            quantity: 0,
          },
        ],
      });

      expect(result.success).toBe(false);
    });
  });

  describe("raiseDisputeSchema", () => {
    it("accepts valid dispute types and reasons", () => {
      const result = raiseDisputeSchema.safeParse({
        type: "funded_dispute",
        reason: "I paid the item cost to the leader MoMo yesterday but order was never marked funded.",
      });

      expect(result.success).toBe(true);
    });

    it("rejects invalid dispute types", () => {
      const result = raiseDisputeSchema.safeParse({
        type: "fake_dispute_type",
        reason: "Valid reason text here.",
      });

      expect(result.success).toBe(false);
    });
  });
});
