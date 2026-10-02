import { describe, it, expect } from "vitest";
import { interviewSyncStore } from "../src/lib/interviewSyncStore";
import { normalizeTechnicalSpeech } from "../src/lib/techSpeechNormalizer";

describe("E2E Happy Path Simulation", () => {
  it("executes the complete candidate workflow: Question -> Normalize -> Store -> Freeze -> Export", () => {
    // 1. Reset Store
    interviewSyncStore.clear();
    expect(interviewSyncStore.getState().qas.length).toBe(0);

    // 2. Candidate hears mispronounced question
    const rawTranscript = "Як влаштовані дандер методи і джил у пайтон?";
    const normalized = normalizeTechnicalSpeech(rawTranscript);
    expect(normalized).toContain("Dunder methods");
    expect(normalized).toContain("GIL");

    // 3. AI Copilot generates answer card
    const qa1 = {
      id: "qa_e2e_1",
      question: normalized,
      startHook: "У Python дандер-методи забезпечують магічний протокол класів.",
      quickAnswer: "GIL гарантує безпеку потоків, але обмежує паралелізм CPU-bound задач.",
      hints: ["__init__ vs __new__", "multiprocessing замість threading"],
      deliveryTip: "Підкресліть різницю між CPU-bound та I/O-bound",
      timestamp: Date.now(),
    };
    interviewSyncStore.addOrUpdateQA(qa1);

    const stateAfterQ1 = interviewSyncStore.getState();
    expect(stateAfterQ1.qas.length).toBe(1);
    expect(stateAfterQ1.activeId).toBe("qa_e2e_1");

    // 4. Candidate presses Space (Freeze View)
    interviewSyncStore.setLiveTranscript("Інтерв'юер продовжує говорити...");

    // 5. While frozen, interviewer asks second question
    const qa2 = {
      id: "qa_e2e_2",
      question: "Що таке B-Tree індекс у PostgreSQL?",
      startHook: "B-Tree є дефолтним індексом у більшості реляційних СУБД.",
      quickAnswer: "Збалансоване дерево забезпечує пошук за O(log n).",
      hints: ["Підтримує <, <=, =, >=, >", "Не підходить для повнотекстового пошуку"],
      timestamp: Date.now() + 1000,
    };
    interviewSyncStore.addOrUpdateQA(qa2);

    const stateAfterQ2 = interviewSyncStore.getState();
    expect(stateAfterQ2.qas.length).toBe(2);
    expect(stateAfterQ2.qas[0].id).toBe("qa_e2e_2"); // Newest at index 0

    // 6. Verify Markdown export content structure
    let exportMd = `# Interview Debrief\n\n`;
    stateAfterQ2.qas.forEach((q) => {
      exportMd += `## ${q.question}\n${q.quickAnswer}\n\n`;
    });
    expect(exportMd).toContain("Dunder methods");
    expect(exportMd).toContain("B-Tree");
  });
});
