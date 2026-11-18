import { describe, it, expect } from "vitest";

describe("Financial Ledger Calculations & Integrity", () => {
  describe("Commission Split Logic", () => {
    it("correctly calculates platform and leader shares from basis points", () => {
      const joinFeePesewas = 1000; // GH₵ 10.00
      const platformCommissionBps = 1000; // 10% (1000 / 10000)

      const platformSharePesewas = Math.round(
        (joinFeePesewas * platformCommissionBps) / 10000
      );
      const leaderSharePesewas = joinFeePesewas - platformSharePesewas;

      expect(platformSharePesewas).toBe(100); // GH₵ 1.00
      expect(leaderSharePesewas).toBe(900); // GH₵ 9.00
      expect(platformSharePesewas + leaderSharePesewas).toBe(joinFeePesewas);
    });

    it("handles zero commission properly", () => {
      const joinFeePesewas = 1500;
      const platformCommissionBps = 0;

      const platformSharePesewas = Math.round(
        (joinFeePesewas * platformCommissionBps) / 10000
      );
      const leaderSharePesewas = joinFeePesewas - platformSharePesewas;

      expect(platformSharePesewas).toBe(0);
      expect(leaderSharePesewas).toBe(1500);
    });
  });

  describe("Buyer Credit Spending Calculation", () => {
    it("covers 100% of join fee when credit exceeds fee", () => {
      const availableCredit = 2500; // GH₵ 25.00
      const joinFee = 1000; // GH₵ 10.00

      const creditApplied = Math.min(availableCredit, joinFee);
      const moolrePaid = joinFee - creditApplied;

      expect(creditApplied).toBe(1000);
      expect(moolrePaid).toBe(0);
    });

    it("applies partial credit and calculates remaining Mobile Money charge", () => {
      const availableCredit = 400; // GH₵ 4.00
      const joinFee = 1000; // GH₵ 10.00

      const creditApplied = Math.min(availableCredit, joinFee);
      const moolrePaid = joinFee - creditApplied;

      expect(creditApplied).toBe(400);
      expect(moolrePaid).toBe(600); // GH₵ 6.00 to charge on MoMo
    });

    it("charges full fee when buyer has zero credit", () => {
      const availableCredit = 0;
      const joinFee = 1000;

      const creditApplied = Math.min(availableCredit, joinFee);
      const moolrePaid = joinFee - creditApplied;

      expect(creditApplied).toBe(0);
      expect(moolrePaid).toBe(1000);
    });
  });

  describe("Cart Floor Reached Calculation", () => {
    const CART_FLOOR_PESEWAS = 35000; // GH₵ 350.00

    it("detects when pool reaches or crosses cart floor", () => {
      const contributions = [15000, 10000, 10000]; // Total 35,000
      const total = contributions.reduce((a, b) => a + b, 0);

      expect(total >= CART_FLOOR_PESEWAS).toBe(true);
    });

    it("detects when pool is below cart floor", () => {
      const contributions = [15000, 10000]; // Total 25,000
      const total = contributions.reduce((a, b) => a + b, 0);

      expect(total >= CART_FLOOR_PESEWAS).toBe(false);
    });
  });
});
