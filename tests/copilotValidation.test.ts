import { describe, it, expect } from "vitest";
import { CopilotPayloadSchema } from "../src/app/api/ai/interview-copilot/route";

describe("CopilotPayloadSchema (Zod input validation)", () => {
  it("rejects empty or missing questions", () => {
    expect(CopilotPayloadSchema.safeParse({}).success).toBe(false);
    expect(CopilotPayloadSchema.safeParse({ question: "" }).success).toBe(false);
    expect(CopilotPayloadSchema.safeParse({ question: "   " }).success).toBe(false);
  });

  it("rejects invalid outputLanguage", () => {
    expect(CopilotPayloadSchema.safeParse({ question: "Valid", outputLanguage: "invalid-lang" as any }).success).toBe(false);
  });

  it("accepts valid payloads and sets defaults including empty history", () => {
    const res = CopilotPayloadSchema.safeParse({ question: "What is ASGI?" });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.outputLanguage).toBe("uk");
      expect(res.data.isConcise).toBe(false);
      expect(res.data.locale).toBe("auto");
      expect(res.data.history).toEqual([]);
    }
  });

  it("accepts conversation history for follow-up questions", () => {
    const res = CopilotPayloadSchema.safeParse({
      question: "Why chose this approach over RabbitMQ?",
      history: [
        {
          question: "How do you handle background jobs?",
          answer: "We use Celery with Redis for high-throughput task queuing."
        }
      ]
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.history).toHaveLength(1);
      expect(res.data.history[0].question).toBe("How do you handle background jobs?");
    }
  });
});
