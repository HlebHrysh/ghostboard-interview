import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as cheatSheetPOST, GET as cheatSheetGET } from '../src/app/api/profile/cheat-sheet/route';
import { POST as scorecardCheatSheetPOST } from '../src/app/api/scorecard/cheat-sheet/route';
import { NextRequest } from 'next/server';

describe('Battle Cheat-Sheet & Scorecard Remediation Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Pre-Interview Battle Cheat-Sheet Generator (/api/profile/cheat-sheet)', () => {
    it('generates an exhaustive, tailored cheat-sheet for React & Next.js FullStack role', async () => {
      const payload = {
        role: 'Senior Full-Stack React / Next.js Engineer',
        level: 'senior',
        techStack: ['React', 'Next.js', 'TypeScript', 'PostgreSQL', 'Redis', 'Docker'],
        resumeContext: '5 years building high-load web applications. Migrated monolithic frontend to Next.js App Router.',
        locale: 'ua',
      };

      const req = new NextRequest('http://localhost:3000/api/profile/cheat-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await cheatSheetPOST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.cheatSheet).toBeDefined();

      const cs = data.cheatSheet;
      expect(cs.role).toBe('Senior Full-Stack React / Next.js Engineer');
      expect(cs.level).toBe('senior');
      expect(cs.readinessScore).toBeGreaterThanOrEqual(85);

      // Top 10 tricky questions
      expect(cs.trickyQuestions.length).toBe(10);
      const firstQ = cs.trickyQuestions[0];
      expect(firstQ.question).toBeDefined();
      expect(firstQ.leadHook).toBeDefined();
      expect(firstQ.keyPillars.length).toBeGreaterThan(0);
      expect(firstQ.pitfall).toBeDefined();

      // System design & architecture blueprints
      expect(cs.systemDesign.length).toBeGreaterThanOrEqual(3);
      expect(cs.systemDesign[0].pattern).toBeDefined();

      // STAR elevator pitch tailored to resume
      expect(cs.elevatorPitch).toBeDefined();
      expect(cs.elevatorPitch.hook).toContain('Senior Full-Stack');
      expect(cs.elevatorPitch.body).toContain('Next.js');
      expect(cs.elevatorPitch.metricsHighlighted.length).toBe(3);

      // Red flags
      expect(cs.redFlags.length).toBeGreaterThanOrEqual(5);
      expect(cs.redFlags[0].mistake).toBeDefined();
      expect(cs.redFlags[0].fix).toBeDefined();

      // Reverse interview questions
      expect(cs.reverseQuestions.length).toBe(5);
    });

    it('adapts questions for Go & HighLoad backend developers', async () => {
      const payload = {
        role: 'Senior Go Backend Engineer',
        level: 'lead',
        techStack: ['Go', 'PostgreSQL', 'Kafka', 'Docker'],
        resumeContext: 'Developed microservices processing 40k RPS with low latency requirements.',
        locale: 'en',
      };

      const req = new NextRequest('http://localhost:3000/api/profile/cheat-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await cheatSheetPOST(req);
      const data = await res.json();

      expect(data.success).toBe(true);
      const hasGoQuestion = data.cheatSheet.trickyQuestions.some(
        (q: { question: string; category: string }) =>
          q.question.toLowerCase().includes('go') || q.category.toLowerCase().includes('go')
      );
      expect(hasGoQuestion).toBe(true);
    });

    it('retrieves cached cheat sheet via GET', async () => {
      const getReq = new NextRequest('http://localhost:3000/api/profile/cheat-sheet', {
        method: 'GET',
      });
      const res = await cheatSheetGET(getReq);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.cheatSheet).toBeDefined();
    });
  });

  describe('Post-Interview Scorecard Remediation (/api/scorecard/cheat-sheet)', () => {
    it('generates post-interview debrief and remediation checklist', async () => {
      const payload = {
        slug: 'mock_session_12345',
        overallScore: 82,
        items: [
          {
            question: 'How do you prevent SQL injection when using raw queries in ORMs?',
            tag: '#Security',
            quickAnswer: 'Use parameterized queries ($1, $2) instead of string concatenation.',
          },
          {
            question: 'What is the difference between optimistic and pessimistic locking?',
            tag: '#Databases',
            quickAnswer: 'Optimistic uses version column; pessimistic uses SELECT FOR UPDATE.',
          },
        ],
        locale: 'ua',
      };

      const req = new NextRequest('http://localhost:3000/api/scorecard/cheat-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await scorecardCheatSheetPOST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.cheatSheet).toBeDefined();

      const sheet = data.cheatSheet;
      expect(sheet.slug).toBe('mock_session_12345');
      expect(sheet.overallScore).toBe(82);
      expect(sheet.remediations.length).toBe(2);
      expect(sheet.remediations[0].seniorHook).toBeDefined();
      expect(sheet.remediations[0].interviewerFollowupTrap).toBeDefined();
      expect(sheet.actionPlan.length).toBeGreaterThanOrEqual(3);
    });
  });
});
