import { describe, it, expect } from "vitest";
import { z } from "zod";

const CopilotPayloadSchema = z.object({
  question: z.string().trim().min(1, 'Question cannot be empty').max(3000, 'Question exceeds maximum length'),
  locale: z.string().optional().default('auto'),
  outputLanguage: z.enum(['uk', 'en', 'auto']).optional().default('uk'),
  candidateProfile: z.any().optional(),
  refinement: z.string().optional(),
  existingQA: z.any().optional(),
  isConcise: z.boolean().optional().default(false),
});

describe("CopilotPayloadSchema (Zod input validation)", () => {
  it("rejects empty or missing questions", () => {
    expect(CopilotPayloadSchema.safeParse({}).success).toBe(false);
    expect(CopilotPayloadSchema.safeParse({ question: "" }).success).toBe(false);
    expect(CopilotPayloadSchema.safeParse({ question: "   " }).success).toBe(false);
  });

  it("rejects invalid outputLanguage", () => {
    expect(CopilotPayloadSchema.safeParse({ question: "Valid", outputLanguage: "fr" }).success).toBe(false);
  });

  it("accepts valid payloads and sets defaults", () => {
    const res = CopilotPayloadSchema.safeParse({ question: "What is ASGI?" });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.outputLanguage).toBe("uk");
      expect(res.data.isConcise).toBe(false);
      expect(res.data.locale).toBe("auto");
    }
  });
});
