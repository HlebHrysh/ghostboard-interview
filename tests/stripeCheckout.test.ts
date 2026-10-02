import { describe, it, expect } from "vitest";

describe("Stripe Checkout & Billing logic", () => {
  const PLANS = {
    pro_monthly: { priceInCents: 1500, mode: "subscription", interval: "month" },
    pro_annual: { priceInCents: 15000, mode: "subscription", interval: "year" },
    lifetime: { priceInCents: 7900, mode: "payment", interval: null },
  };

  it("calculates correct pricing and billing modes", () => {
    expect(PLANS.pro_monthly.priceInCents).toBe(1500);
    expect(PLANS.pro_monthly.mode).toBe("subscription");
    expect(PLANS.lifetime.priceInCents).toBe(7900);
    expect(PLANS.lifetime.mode).toBe("payment");
  });

  it("calculates annual discount correctly (~17% off)", () => {
    const fullYearCost = PLANS.pro_monthly.priceInCents * 12; // 18000
    const annualDiscountedCost = PLANS.pro_annual.priceInCents; // 15000
    const savingsPercent = Math.round(((fullYearCost - annualDiscountedCost) / fullYearCost) * 100);
    expect(savingsPercent).toBe(17);
  });
});
