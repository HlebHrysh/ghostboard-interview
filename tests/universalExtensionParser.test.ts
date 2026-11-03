import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Universal Coding Copilot Chrome Extension v2.0.0', () => {
  const extensionDir = path.join(process.cwd(), 'extension');
  const manifestPath = path.join(extensionDir, 'manifest.json');
  const contentJsPath = path.join(extensionDir, 'content.js');
  const backgroundJsPath = path.join(extensionDir, 'background.js');
  const popupHtmlPath = path.join(extensionDir, 'popup.html');
  const popupJsPath = path.join(extensionDir, 'popup.js');

  it('validates Manifest V3 multi-platform permissions and commands', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.version).toBe('2.0.0');
    expect(manifest.permissions).toContain('storage');
    expect(manifest.permissions).toContain('activeTab');

    // Host permissions for 4 platforms + local + cloud + all_urls
    expect(manifest.host_permissions).toContain('*://leetcode.com/*');
    expect(manifest.host_permissions).toContain('*://hackerrank.com/*');
    expect(manifest.host_permissions).toContain('*://codeforces.com/*');
    expect(manifest.host_permissions).toContain('*://app.codesignal.com/*');
    expect(manifest.host_permissions).toContain('<all_urls>');

    // Keyboard command Alt+Shift+G
    expect(manifest.commands?.send_to_ghostboard).toBeDefined();
    expect(manifest.commands?.send_to_ghostboard?.suggested_key?.default).toBe('Alt+Shift+G');

    // Content scripts matching
    expect(manifest.content_scripts?.length).toBeGreaterThan(0);
    const matches = manifest.content_scripts[0].matches;
    expect(matches).toContain('*://leetcode.com/problems/*');
    expect(matches).toContain('*://hackerrank.com/*');
    expect(matches).toContain('*://codeforces.com/*');
    expect(matches).toContain('*://app.codesignal.com/*');
  });

  it('validates popup.html and popup.js assets exist and contain Ghostboard branding', () => {
    expect(fs.existsSync(popupHtmlPath)).toBe(true);
    expect(fs.existsSync(popupJsPath)).toBe(true);

    const html = fs.readFileSync(popupHtmlPath, 'utf-8');
    expect(html).toContain('GHOSTBOARD');
    expect(html).toContain('outputLang');
    expect(html).toContain('apiUrl');
    expect(html).toContain('btnSolve');
    expect(html).toContain('Alt + Shift + G');

    const js = fs.readFileSync(popupJsPath, 'utf-8');
    expect(js).toContain('checkConnectivity');
    expect(js).toContain('EXTRACT_AND_SOLVE');
  });

  it('exports universal parsers for all 4 platforms and selection', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const content = require(contentJsPath);

    expect(typeof content.detectAndExtract).toBe('function');
    expect(typeof content.extractLeetCodeProblem).toBe('function');
    expect(typeof content.extractHackerRankProblem).toBe('function');
    expect(typeof content.extractCodeforcesProblem).toBe('function');
    expect(typeof content.extractCodeSignalProblem).toBe('function');
    expect(typeof content.extractSelectedText).toBe('function');
    expect(typeof content.extractEditorCode).toBe('function');
  });

  describe('Multi-Platform DOM Extraction Logic', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('extracts LeetCode problem details with constraints and starter code', () => {
      // Mock DOM for LeetCode
      global.document = {
        title: '146. LRU Cache - LeetCode',
        querySelector: (sel: string) => {
          if (sel.includes('text-title-large') || sel.includes('question-title')) {
            return { innerText: '146. LRU Cache' };
          }
          if (sel.includes('text-difficulty-') || sel.includes('difficulty')) {
            return { innerText: 'Medium' };
          }
          if (sel.includes('description_content') || sel.includes('elfjS')) {
            return { innerText: 'Design a data structure that follows the constraints of a Least Recently Used (Cache). Constraints: 1 <= capacity <= 3000' };
          }
          if (sel.includes('headlessui-listbox-button')) {
            return { innerText: 'Python3' };
          }
          return null;
        },
        querySelectorAll: (sel: string) => {
          if (sel.includes('.view-line')) {
            return [{ innerText: 'class LRUCache:' }, { innerText: '    def __init__(self, capacity: int):' }];
          }
          return [];
        },
      } as unknown as Document;

      global.window = {
        location: { href: 'https://leetcode.com/problems/lru-cache/', hostname: 'leetcode.com' },
        getSelection: () => ({ toString: () => '' }),
      } as unknown as Window & typeof globalThis;

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { extractLeetCodeProblem } = require(contentJsPath);
      const problem = extractLeetCodeProblem();

      expect(problem).not.toBeNull();
      expect(problem.platform).toBe('LeetCode');
      expect(problem.title).toBe('146. LRU Cache');
      expect(problem.difficulty).toBe('Medium');
      expect(problem.language).toBe('Python3');
      expect(problem.starterCode).toContain('class LRUCache');
      expect(problem.fullPrompt).toContain('146. LRU Cache');
      expect(problem.fullPrompt).toContain('Constraints: 1 <= capacity <= 3000');
    });

    it('extracts HackerRank problem details and description', () => {
      global.document = {
        title: 'Climbing the Leaderboard | HackerRank',
        querySelector: (sel: string) => {
          if (sel.includes('challenge-page-label') || sel.includes('challenge-title') || sel.includes('ui-icon-label')) {
            return { innerText: 'Climbing the Leaderboard' };
          }
          if (sel.includes('difficulty-badge') || sel.includes('difficulty')) {
            return { innerText: 'Hard' };
          }
          if (sel.includes('challenge-body-html') || sel.includes('challenge_problem_statement')) {
            return { innerText: 'An arcade game player wants to climb to the top of the leaderboard and track their ranking.' };
          }
          if (sel.includes('select-language')) {
            return { innerText: 'Java 15' };
          }
          return null;
        },
        querySelectorAll: () => [],
      } as unknown as Document;

      global.window = {
        location: { href: 'https://hackerrank.com/challenges/climbing-the-leaderboard', hostname: 'hackerrank.com' },
        getSelection: () => ({ toString: () => '' }),
      } as unknown as Window & typeof globalThis;

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { extractHackerRankProblem } = require(contentJsPath);
      const problem = extractHackerRankProblem();

      expect(problem).not.toBeNull();
      expect(problem.platform).toBe('HackerRank');
      expect(problem.title).toBe('Climbing the Leaderboard');
      expect(problem.difficulty).toBe('Hard');
      expect(problem.language).toBe('Java 15');
      expect(problem.tag).toBe('#HackerRank [Hard]');
    });

    it('extracts Codeforces problem with limits and statement', () => {
      global.document = {
        title: 'Codeforces - Problem 1800C',
        querySelector: (sel: string) => {
          if (sel.includes('problem-statement')) {
            return {
              innerText: '1800C. Remove the Bracket\nTime Limit: 1.0s\nMemory Limit: 256MB\nGiven an array a of length n...',
              querySelector: (subSel: string) => {
                if (subSel.includes('title')) return { innerText: '1800C. Remove the Bracket' };
                if (subSel.includes('time-limit')) return { innerText: '1.0s' };
                if (subSel.includes('memory-limit')) return { innerText: '256MB' };
                return null;
              },
            };
          }
          return null;
        },
        querySelectorAll: () => [],
      } as unknown as Document;

      global.window = {
        location: { href: 'https://codeforces.com/problemset/problem/1800/C', hostname: 'codeforces.com' },
        getSelection: () => ({ toString: () => '' }),
      } as unknown as Window & typeof globalThis;

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { extractCodeforcesProblem } = require(contentJsPath);
      const problem = extractCodeforcesProblem();

      expect(problem).not.toBeNull();
      expect(problem.platform).toBe('Codeforces');
      expect(problem.title).toContain('1800C. Remove the Bracket');
      expect(problem.fullPrompt).toContain('Time Limit: 1.0s');
      expect(problem.fullPrompt).toContain('Memory Limit: 256MB');
    });

    it('extracts CodeSignal task details', () => {
      global.document = {
        title: 'CodeSignal Assessment',
        querySelector: (sel: string) => {
          if (sel.includes('task-title')) {
            return { innerText: 'firstDuplicate' };
          }
          if (sel.includes('task-description')) {
            return { innerText: 'Given an array a that contains only numbers in the range from 1 to a.length...' };
          }
          return null;
        },
        querySelectorAll: () => [],
      } as unknown as Document;

      global.window = {
        location: { href: 'https://app.codesignal.com/arcade/intro/level-2', hostname: 'app.codesignal.com' },
        getSelection: () => ({ toString: () => '' }),
      } as unknown as Window & typeof globalThis;

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { extractCodeSignalProblem } = require(contentJsPath);
      const problem = extractCodeSignalProblem();

      expect(problem).not.toBeNull();
      expect(problem.platform).toBe('CodeSignal');
      expect(problem.title).toBe('firstDuplicate');
      expect(problem.tag).toBe('#CodeSignal');
    });

    it('extracts highlighted text from any arbitrary webpage via Alt+Shift+G', () => {
      global.document = { title: 'Arbitrary Web Page' } as unknown as Document;
      global.window = {
        location: { href: 'https://docs.google.com/document/d/123', hostname: 'docs.google.com' },
        getSelection: () => ({
          toString: () => 'Implement an in-memory TTL cache with O(1) eviction and concurrent access.',
        }),
      } as unknown as Window & typeof globalThis;

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { extractSelectedText } = require(contentJsPath);
      const selection = extractSelectedText();

      expect(selection).not.toBeNull();
      expect(selection.platform).toBe('WebSelection');
      expect(selection.fullPrompt).toContain('Implement an in-memory TTL cache');
    });
  });

  describe('Background Service Worker Resilience', () => {
    it('implements fetchWithRetry and handles transient network errors', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { fetchWithRetry } = require(backgroundJsPath);

      let attempts = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error('Network timeout');
        }
        return { ok: true, status: 200, json: async () => ({ status: 'ok' }) };
      });
      global.fetch = mockFetch;

      const res = await fetchWithRetry('http://localhost:3000/api/ai/interview-copilot', { method: 'POST' }, 1, 1000);
      expect(res.ok).toBe(true);
      expect(attempts).toBe(2);
    });
  });
});

