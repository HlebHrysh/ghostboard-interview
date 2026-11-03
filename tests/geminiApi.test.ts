import { describe, it, expect } from "vitest";
import { FLASH_MODELS, PRO_MODELS, getCleanGeminiKey } from "../src/lib/geminiApi";

describe("geminiApi helper", () => {
  it("defines cascade models with fallback sequence", () => {
    expect(FLASH_MODELS.length).toBeGreaterThanOrEqual(3);
    expect(FLASH_MODELS[0]).toBe("gemini-3.8-flash");
    expect(FLASH_MODELS[1]).toBe("gemini-3.6-flash");
    expect(FLASH_MODELS).toContain("gemini-flash-latest");

    expect(PRO_MODELS.length).toBeGreaterThanOrEqual(2);
    expect(PRO_MODELS[0]).toBe("gemini-3.8-flash");
    expect(PRO_MODELS[1]).toBe("gemini-3.6-flash");
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

  it("prioritizes models, remembers fastest winner, and demotes failing models for 3 minutes", async () => {
    const {
      getPrioritizedModels,
      recordModelSuccess,
      recordModelFailure,
      resetModelHealth,
      getPreferredFastModel,
      getFastStreamingGenerationConfig,
    } = await import("../src/lib/geminiApi");

    resetModelHealth();

    // Default prioritized models match FLASH_MODELS
    const initial = getPrioritizedModels();
    expect(initial[0]).toBe("gemini-3.8-flash");

    // If gemini-3.6-flash wins, it becomes preferredFastModel and tops the list
    recordModelSuccess("gemini-3.6-flash", 280);
    expect(getPreferredFastModel()).toBe("gemini-3.6-flash");
    expect(getPrioritizedModels()[0]).toBe("gemini-3.6-flash");

    // If gemini-3.8-flash fails (timeout / 503), it gets demoted to the end of the list
    recordModelFailure("gemini-3.8-flash");
    const afterFailure = getPrioritizedModels();
    expect(afterFailure[0]).toBe("gemini-3.6-flash");
    expect(afterFailure[afterFailure.length - 1]).toBe("gemini-3.8-flash");

    // Generation config sets maxOutputTokens to 850 and temperature to 0.3
    const cfg = getFastStreamingGenerationConfig("gemini-3.8-flash");
    expect(cfg.maxOutputTokens).toBe(850);
    expect(cfg.temperature).toBe(0.3);

    resetModelHealth();
  });
});
