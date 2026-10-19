import { describe, it, expect } from "vitest";
import { FLASH_MODELS, PRO_MODELS, getCleanGeminiKey } from "../src/lib/geminiApi";

describe("geminiApi helper", () => {
  it("defines cascade models with fallback sequence", () => {
    expect(FLASH_MODELS.length).toBeGreaterThanOrEqual(3);
    expect(FLASH_MODELS[0]).toBe("gemini-3.8-flash");
    expect(FLASH_MODELS[1]).toBe("gemini-3.6-flash");
    expect(FLASH_MODELS).not.toContain("gemini-3.7-flash");
    expect(FLASH_MODELS).not.toContain("gemini-3.5-flash");

    expect(PRO_MODELS.length).toBeGreaterThanOrEqual(2);
    expect(PRO_MODELS[0]).toBe("gemini-3.8-flash");
    expect(PRO_MODELS[1]).toBe("gemini-3.6-flash");
    expect(PRO_MODELS).not.toContain("gemini-3.7-flash");
    expect(PRO_MODELS).not.toContain("gemini-3.5-flash");
  });

  it("handles empty or missing key gracefully", () => {
    const originalEnv = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    expect(getCleanGeminiKey()).toBeNull();
    process.env.GEMINI_API_KEY = originalEnv;
  });

  it("cleans quotes and prefixes from environment keys", () => {
    const originalEnv = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = ' "AIzaSyTestKey_12345" ';
    expect(getCleanGeminiKey()).toBe("AIzaSyTestKey_12345");

    process.env.GEMINI_API_KEY = 'GEMINI_API_KEY = AIzaSyTestKey_Clean';
    expect(getCleanGeminiKey()).toBe("AIzaSyTestKey_Clean");

    process.env.GEMINI_API_KEY = originalEnv;
  });
});
