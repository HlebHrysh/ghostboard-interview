import { describe, it, expect } from "vitest";
import {
  isFillerOrNoise,
  hasTechnicalKeyword,
  normalizeTechnicalSpeech,
  detectQuestionLanguage,
} from "../src/lib/techSpeechNormalizer";

describe("techSpeechNormalizer", () => {
  describe("isFillerOrNoise", () => {
    it("identifies short conversational fillers and coughs as noise", () => {
      expect(isFillerOrNoise("")).toBe(true);
      expect(isFillerOrNoise("   ")).toBe(true);
      expect(isFillerOrNoise("ага")).toBe(true);
      expect(isFillerOrNoise("ну")).toBe(true);
      expect(isFillerOrNoise("ок")).toBe(true);
      expect(isFillerOrNoise("добре")).toBe(true);
      expect(isFillerOrNoise("так")).toBe(true);
      expect(isFillerOrNoise("алло")).toBe(true);
      expect(isFillerOrNoise("чути мене?")).toBe(true);
      expect(isFillerOrNoise("угу")).toBe(true);
      expect(isFillerOrNoise("ясна річ")).toBe(true);
      expect(isFillerOrNoise("hmm")).toBe(true);
      expect(isFillerOrNoise("yeah")).toBe(true);
    });

    it("does not flag actual technical interview questions as noise", () => {
      expect(isFillerOrNoise("Як влаштований Event Loop у Node.js?")).toBe(false);
      expect(isFillerOrNoise("Що таке MVCC у PostgreSQL?")).toBe(false);
      expect(isFillerOrNoise("Розкажіть про відмінність Celery від RQ")).toBe(false);
      expect(isFillerOrNoise("How does React reconciliation work under the hood?")).toBe(false);
      expect(isFillerOrNoise("Поясніть різницю між TCP та UDP")).toBe(false);
    });
  });

  describe("hasTechnicalKeyword", () => {
    it("detects technical terms correctly", () => {
      expect(hasTechnicalKeyword("ми використовуємо docker")).toBe(true);
      expect(hasTechnicalKeyword("як підключити redis")).toBe(true);
      expect(hasTechnicalKeyword("база даних postgresql")).toBe(true);
      expect(hasTechnicalKeyword("що таке rest api")).toBe(true);
      expect(hasTechnicalKeyword("сьогодні гарна погода надворі")).toBe(false);
    });
  });

  describe("normalizeTechnicalSpeech", () => {
    it("normalizes common phonetic tech slang into proper technical spelling", () => {
      expect(normalizeTechnicalSpeech("постгрес")).toContain("PostgreSQL");
      expect(normalizeTechnicalSpeech("селері")).toContain("Celery");
      expect(normalizeTechnicalSpeech("редіс")).toContain("Redis");
      expect(normalizeTechnicalSpeech("докер")).toContain("Docker");
      expect(normalizeTechnicalSpeech("фастапі")).toContain("FastAPI");
      expect(normalizeTechnicalSpeech("джанго")).toContain("Django");
    });

    it("handles standalone 'дандер' and case inflections without requiring 'методи'", () => {
      expect(normalizeTechnicalSpeech("Що таке дандер?")).toContain("Dunder methods");
      expect(normalizeTechnicalSpeech("розкажи про дандери")).toContain("Dunder methods");
      expect(normalizeTechnicalSpeech("дандер init")).toContain("Dunder methods");
    });

    it("handles common Slavic noun declensions and inflections", () => {
      expect(normalizeTechnicalSpeech("ми підключаємо кафку")).toContain("Kafka");
      expect(normalizeTechnicalSpeech("з постгресом працюємо через orm")).toContain("PostgreSQL");
      expect(normalizeTechnicalSpeech("наскільки швидка асінка в python")).toContain("Asyncio");
      expect(normalizeTechnicalSpeech("розгорнуто в кубері")).toContain("Kubernetes");
    });

    it("normalizes previously missing developer terms: MVCC, LRU Cache, OrderedDict, Python", () => {
      expect(normalizeTechnicalSpeech("розкажи про мвцц")).toContain("MVCC");
      expect(normalizeTechnicalSpeech("реалізуй лру кеш")).toContain("LRU Cache");
      expect(normalizeTechnicalSpeech("використовуй ордерд дікт")).toContain("OrderedDict");
      expect(normalizeTechnicalSpeech("написано на пайтон")).toContain("Python");
    });
  });

  describe("detectQuestionLanguage", () => {
    it("correctly identifies Ukrainian vs English", () => {
      expect(detectQuestionLanguage("Як працює кешування у вашому сервісі?")).toBe("uk");
      expect(detectQuestionLanguage("How do you handle race conditions in distributed systems?")).toBe("en");
    });
  });

  describe("Web and Desktop normalizer synchronization", () => {
    it("guarantees web and desktop normalizer modules produce identical results", async () => {
      const desktopNormalizer = await import("../desktop/src/lib/techSpeechNormalizer");
      const testInputs = [
        "постгрес",
        "селері",
        "редіс",
        "докер",
        "фастапі",
        "джанго",
        "Що таке дандер?",
        "розкажи про дандери",
        "ми підключаємо кафку",
        "з постгресом працюємо через orm",
        "наскільки швидка асінка в python",
        "розгорнуто в кубері",
        "розкажи про мвцц",
        "реалізуй лру кеш",
        "використовуй ордерд дікт",
        "написано на пайтон",
        "Як влаштований Event Loop у Node.js?",
        "How does React reconciliation work under the hood?",
        "ага",
        "ну",
        "добре",
      ];

      for (const input of testInputs) {
        expect(desktopNormalizer.normalizeTechnicalSpeech(input)).toBe(
          normalizeTechnicalSpeech(input)
        );
        expect(desktopNormalizer.isFillerOrNoise(input)).toBe(
          isFillerOrNoise(input)
        );
        expect(desktopNormalizer.hasTechnicalKeyword(input)).toBe(
          hasTechnicalKeyword(input)
        );
        expect(desktopNormalizer.detectQuestionLanguage(input)).toBe(
          detectQuestionLanguage(input)
        );
      }
    });

    it("verifies Web and Desktop source files share the identical ruleset", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const webPath = path.resolve(__dirname, "../src/lib/techSpeechNormalizer.ts");
      const desktopPath = path.resolve(__dirname, "../desktop/src/lib/techSpeechNormalizer.ts");
      const webContent = fs.readFileSync(webPath, "utf-8").trim();
      const desktopContent = fs.readFileSync(desktopPath, "utf-8").trim();
      expect(desktopContent).toBe(webContent);
    });
  });
});

