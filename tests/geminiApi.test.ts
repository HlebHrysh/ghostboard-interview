import { describe, it, expect, vi } from "vitest";
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

  describe("callGeminiWithFallback", () => {
    it("trips circuit breaker on 429 / 503 / 404 and excludes failing model from cascade", async () => {
      const {
        callGeminiWithFallback,
        resetModelCircuitBreaker,
        isModelCircuitBroken,
        resetModelHealth,
      } = await import("../src/lib/geminiApi");

      resetModelHealth();
      resetModelCircuitBreaker();

      // Mock fetch: first model returns 429, second model succeeds
      let callCount = 0;
      const fetchMock = vi.fn().mockImplementation(async (url: string) => {
        callCount++;
        if (url.includes("gemini-3.8-flash")) {
          return {
            ok: false,
            status: 429,
            statusText: "Too Many Requests",
            text: async () => JSON.stringify({ error: { message: "RESOURCE_EXHAUSTED" } }),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: "Successful response from fallback model" }],
                },
              },
            ],
          }),
        };
      });

      vi.stubGlobal("fetch", fetchMock);

      const result = await callGeminiWithFallback({
        apiKey: "test-fake-key",
        contents: [{ role: "user", parts: [{ text: "Hello" }] }],
        timeoutMs: 2000,
      });

      expect(result.ok).toBe(true);
      expect(result.modelUsed).toBe("gemini-3.6-flash");
      expect(result.text).toBe("Successful response from fallback model");
      expect(isModelCircuitBroken("gemini-3.8-flash")).toBe(true);

      resetModelHealth();
      resetModelCircuitBreaker();
      vi.unstubAllGlobals();
    });

    it("falls back to next model when model returns empty text", async () => {
      const {
        callGeminiWithFallback,
        resetModelCircuitBreaker,
        resetModelHealth,
      } = await import("../src/lib/geminiApi");

      resetModelHealth();
      resetModelCircuitBreaker();

      const fetchMock = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("gemini-3.8-flash")) {
          // Model returns ok status but empty text
          return {
            ok: true,
            status: 200,
            json: async () => ({
              candidates: [
                {
                  content: {
                    parts: [{ text: "   " }],
                  },
                },
              ],
            }),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: "Valid answer from gemini-3.6-flash" }],
                },
              },
            ],
          }),
        };
      });

      vi.stubGlobal("fetch", fetchMock);

      const result = await callGeminiWithFallback({
        apiKey: "test-fake-key",
        contents: [{ role: "user", parts: [{ text: "What is React?" }] }],
        timeoutMs: 2000,
      });

      expect(result.ok).toBe(true);
      expect(result.modelUsed).toBe("gemini-3.6-flash");
      expect(result.text).toBe("Valid answer from gemini-3.6-flash");

      resetModelHealth();
      resetModelCircuitBreaker();
      vi.unstubAllGlobals();
    });

    it("times out when response body reading stalls", async () => {
      const {
        callGeminiWithFallback,
        resetModelCircuitBreaker,
        resetModelHealth,
      } = await import("../src/lib/geminiApi");

      resetModelHealth();
      resetModelCircuitBreaker();

      // Mock fetch: headers arrive, but res.json() stalls and aborts via signal
      const fetchMock = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
        return {
          ok: true,
          status: 200,
          json: async () => {
            return new Promise((resolve, reject) => {
              if (init.signal) {
                init.signal.addEventListener("abort", () => {
                  reject(new DOMException("The operation was aborted.", "AbortError"));
                });
              }
            });
          },
        };
      });

      vi.stubGlobal("fetch", fetchMock);

      const result = await callGeminiWithFallback({
        apiKey: "test-fake-key",
        models: ["gemini-3.8-flash"],
        contents: [{ role: "user", parts: [{ text: "Stall test" }] }],
        timeoutMs: 200, // Short timeout
      });

      // Since only 1 model was in the cascade and it stalled, callGeminiWithFallback returns ok: false
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/abort/i);

      resetModelHealth();
      resetModelCircuitBreaker();
      vi.unstubAllGlobals();
    });
  });
});
