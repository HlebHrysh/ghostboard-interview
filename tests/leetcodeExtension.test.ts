import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { interviewSyncStore } from "../src/lib/interviewSyncStore";

describe("LeetCode Chrome Extension Integrity", () => {
  const extensionDir = path.join(process.cwd(), "extension");
  const manifestPath = path.join(extensionDir, "manifest.json");

  it("has a valid Manifest V3 file", () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe("Ghostboard LeetCode Copilot");
    expect(manifest.version).toBeDefined();
    expect(manifest.background?.service_worker).toBe("background.js");
    expect(manifest.content_scripts?.length).toBeGreaterThan(0);
    expect(manifest.content_scripts[0].matches).toContain("*://leetcode.com/problems/*");
  });

  it("has valid, non-empty icon files referenced in manifest", () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const icons = manifest.icons;
    expect(icons).toBeDefined();

    for (const [size, relPath] of Object.entries(icons)) {
      const fullPath = path.join(extensionDir, relPath as string);
      expect(fs.existsSync(fullPath), `Icon ${size} at ${relPath} missing`).toBe(true);
      const stat = fs.statSync(fullPath);
      expect(stat.size).toBeGreaterThan(50);
    }
  });

  it("contains content.js and background.js files", () => {
    expect(fs.existsSync(path.join(extensionDir, "content.js"))).toBe(true);
    expect(fs.existsSync(path.join(extensionDir, "background.js"))).toBe(true);
    expect(fs.existsSync(path.join(extensionDir, "popup.html"))).toBe(true);
    expect(fs.existsSync(path.join(extensionDir, "popup.js"))).toBe(true);
    expect(fs.existsSync(path.join(extensionDir, "README.md"))).toBe(true);
  });

  it("successfully ingests LeetCode problem payloads into interviewSyncStore", () => {
    interviewSyncStore.clear();

    const leetCodeQA = {
      id: "leetcode_1720000000000",
      question: "1. Two Sum",
      quickAnswer: "Use a hash map to store complements in O(N) time and O(N) space.",
      startHook: "To solve Two Sum optimally, we iterate with a hash table tracking target - num.",
      hints: ["Check if complement exists in map", "Store current value with its index"],
      codeSnippet: "def twoSum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target - n], i]\n        seen[n] = i",
      deliveryTip: "State the brute force O(N^2) first, then transition to O(N) hash map.",
      tag: "#LeetCode [Easy]",
      timestamp: Date.now(),
    };

    interviewSyncStore.addOrUpdateQA(leetCodeQA);
    const state = interviewSyncStore.getState();

    expect(state.qas.length).toBe(1);
    expect(state.activeId).toBe("leetcode_1720000000000");
    expect(state.qas[0].question).toBe("1. Two Sum");
    expect(state.qas[0].tag).toBe("#LeetCode [Easy]");
    expect(state.qas[0].codeSnippet).toContain("twoSum");
  });
});
