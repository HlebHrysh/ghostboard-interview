import { describe, it, expect } from "vitest";
import { interviewSyncStore, getItemTimestamp } from "../src/lib/interviewSyncStore";

describe("interviewSyncStore", () => {
  it("computes item timestamp from explicit property or ID", () => {
    const itemWithTs = {
      id: "qa_test",
      question: "Q",
      startHook: "H",
      quickAnswer: "A",
      hints: [],
      timestamp: 1700000000000,
    };
    expect(getItemTimestamp(itemWithTs)).toBe(1700000000000);

    const itemWithIdTs = {
      id: "qa_1700000055000",
      question: "Q2",
      startHook: "H2",
      quickAnswer: "A2",
      hints: [],
    };
    expect(getItemTimestamp(itemWithIdTs)).toBe(1700000055000);
  });

  it("adds and updates QA items and sets active ID", () => {
    interviewSyncStore.clear();

    const qa1 = {
      id: "qa_test_1",
      question: "Test Question 1",
      startHook: "Hook 1",
      quickAnswer: "Answer 1",
      hints: ["Hint 1"],
      timestamp: Date.now() - 1000,
    };

    interviewSyncStore.addOrUpdateQA(qa1);
    const state = interviewSyncStore.getState();
    expect(state.qas.length).toBe(1);
    expect(state.qas[0].id).toBe("qa_test_1");
    expect(state.activeId).toBe("qa_test_1");

    // Add newer QA
    const qa2 = {
      id: "qa_test_2",
      question: "Test Question 2",
      startHook: "Hook 2",
      quickAnswer: "Answer 2",
      hints: ["Hint 2"],
      timestamp: Date.now(),
    };
    interviewSyncStore.addOrUpdateQA(qa2);
    const state2 = interviewSyncStore.getState();
    expect(state2.qas.length).toBe(2);
    expect(state2.qas[0].id).toBe("qa_test_2"); // newest first
  });

  it("supports language preference updates", () => {
    interviewSyncStore.setOutputLanguage("en");
    expect(interviewSyncStore.getState().outputLanguage).toBe("en");

    interviewSyncStore.setSpeechLanguage("uk");
    expect(interviewSyncStore.getState().speechLanguage).toBe("uk");
  });

  it("isolates state between different user accounts and syncs freeze/device state", () => {
    const userA = "usr_alice_123";
    const userB = "usr_bob_456";

    interviewSyncStore.clear(userA);
    interviewSyncStore.clear(userB);

    // User A adds a QA item with native translation
    interviewSyncStore.addOrUpdateQA(
      {
        id: "qa_alice_1",
        question: "How does epoll work?",
        startHook: "Epoll is an I/O event notification mechanism...",
        quickAnswer: "O(1) event polling using an RB-tree and ready list.",
        nativeTranslation: "Epoll — це механізм сповіщення про події вводу-виводу з O(1)...",
        hints: ["RB-tree", "wait queue"],
      },
      undefined,
      userA
    );

    // User A freezes
    interviewSyncStore.setFrozen(true, userA);
    interviewSyncStore.registerDevice("phone", true, userA);

    // User B should NOT see User A's data
    const stateB = interviewSyncStore.getState(userB);
    expect(stateB.qas.length).toBe(0);
    expect(stateB.isFrozen).toBe(false);

    // User A should see their data
    const stateA = interviewSyncStore.getState(userA);
    expect(stateA.qas.length).toBe(1);
    expect(stateA.qas[0].id).toBe("qa_alice_1");
    expect(stateA.qas[0].nativeTranslation).toContain("Epoll");
    expect(stateA.isFrozen).toBe(true);
    expect(stateA.connectedDevices?.phone).toBe(true);
  });
});
