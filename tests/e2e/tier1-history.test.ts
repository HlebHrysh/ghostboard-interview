import { describe, it, expect, beforeEach } from 'vitest';
import { MockElectronBridge } from './fixtures/mockElectronBridge';

interface SessionQA {
  id: string;
  timestamp: number;
  question: string;
  startHook: string;
  quickAnswer: string;
  keyPoints: string[];
  codeSnippet?: string;
  tag: string;
}

class SessionHistoryManager {
  private history: SessionQA[] = [];

  addQA(qa: SessionQA) {
    this.history.unshift(qa); // Newest first
  }

  getHistory(): SessionQA[] {
    return [...this.history];
  }

  filter(query: string): SessionQA[] {
    if (!query || !query.trim()) return this.history;
    const q = query.trim().toLowerCase();
    return this.history.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.startHook.toLowerCase().includes(q) ||
        item.quickAnswer.toLowerCase().includes(q) ||
        item.tag.toLowerCase().includes(q) ||
        item.keyPoints.some((p) => p.toLowerCase().includes(q))
    );
  }

  exportToMarkdown(candidateName = 'Candidate'): string {
    const dateStr = new Date().toISOString().slice(0, 10);
    let md = `# Ghostboard Interview Debrief\n\n`;
    md += `**Date:** ${dateStr}  \n`;
    md += `**Candidate:** ${candidateName}  \n`;
    md += `**Total Questions Discussed:** ${this.history.length}  \n\n`;
    md += `---\n\n## Questions & Answers\n\n`;

    this.history.forEach((qa, idx) => {
      md += `### ${idx + 1}. ${qa.question} [${qa.tag}]\n\n`;
      md += `**Start Hook:** ${qa.startHook}\n\n`;
      md += `**Core Answer:** ${qa.quickAnswer}\n\n`;
      if (qa.keyPoints.length > 0) {
        md += `**Key Talking Points:**\n`;
        qa.keyPoints.forEach((point) => {
          md += `- ${point}\n`;
        });
        md += `\n`;
      }
      if (qa.codeSnippet) {
        md += `\`\`\`\n${qa.codeSnippet}\n\`\`\`\n\n`;
      }
    });

    md += `---\n\n## Tailored Follow-Up Thank-You Email\n\n`;
    md += `**Subject:** Thank you for our conversation today - ${candidateName}\n\n`;
    md += `Hi [Interviewer Name],\n\n`;
    md += `Thank you for the insightful conversation today. I especially enjoyed our discussion on ${
      this.history[0]?.tag || 'system architecture'
    } and how your team approaches scalability.\n\n`;
    md += `Looking forward to the next steps.\n\nBest regards,\n${candidateName}\n`;

    return md;
  }
}

describe('Tier 1: Feature Coverage — Session History & Markdown Export (R4.2)', () => {
  let manager: SessionHistoryManager;
  let bridge: MockElectronBridge;

  beforeEach(() => {
    manager = new SessionHistoryManager();
    bridge = new MockElectronBridge();

    // Populate with representative interview questions
    manager.addQA({
      id: 'qa-1',
      timestamp: 1700000001000,
      question: 'How does PostgreSQL handle B-Tree indexing on composite keys?',
      startHook: 'B-Tree indexes sort tuples based on leading columns first.',
      quickAnswer: 'Composite indexes require queries to filter on leading columns to utilize index range scans.',
      keyPoints: [
        'Prefix matching rule governs index lookup.',
        'Index-only scans eliminate heap fetches.',
        'High cardinality columns should generally be placed first.',
      ],
      tag: 'PostgreSQL',
    });

    manager.addQA({
      id: 'qa-2',
      timestamp: 1700000002000,
      question: 'Explain the difference between Celery and Kafka for background tasks.',
      startHook: 'Celery is an RPC task queue; Kafka is a distributed event log.',
      quickAnswer: 'Kafka provides event replayability and high-throughput streaming, whereas Celery manages job execution state.',
      keyPoints: [
        'Celery worker pool manages task timeouts and retries.',
        'Kafka partition key guarantees ordering per key.',
      ],
      codeSnippet: '@celery.task\ndef process_order(order_id):\n    pass',
      tag: 'Architecture',
    });
  });

  it('AC 4.2: Session questions are persisted during the run in chronological order', () => {
    const list = manager.getHistory();
    expect(list).toHaveLength(2);
    // Newest at index 0
    expect(list[0].id).toBe('qa-2');
    expect(list[1].id).toBe('qa-1');
  });

  it('AC 4.2: Real-time search filters questions across questions, answers, and tags', () => {
    // Search by question keyword
    const pgResults = manager.filter('B-Tree');
    expect(pgResults).toHaveLength(1);
    expect(pgResults[0].id).toBe('qa-1');

    // Search by answer text
    const kafkaResults = manager.filter('event log');
    expect(kafkaResults).toHaveLength(1);
    expect(kafkaResults[0].id).toBe('qa-2');

    // Search by tag
    const archResults = manager.filter('Architecture');
    expect(archResults).toHaveLength(1);
    expect(archResults[0].id).toBe('qa-2');
  });

  it('AC 4.2: Search filter correctly handles empty queries and non-matching terms', () => {
    // Empty query returns all items
    expect(manager.filter('')).toHaveLength(2);
    expect(manager.filter('   ')).toHaveLength(2);

    // Non-existent search query returns empty array
    expect(manager.filter('non_existent_topic_xyz')).toHaveLength(0);
  });

  it('AC 4.2: 1-Click Markdown export formats structured debrief with full Q&A details', async () => {
    const markdown = manager.exportToMarkdown('Alex Dev');

    expect(markdown).toContain('# Ghostboard Interview Debrief');
    expect(markdown).toContain('**Candidate:** Alex Dev');
    expect(markdown).toContain('**Total Questions Discussed:** 2');
    expect(markdown).toContain('PostgreSQL');
    expect(markdown).toContain('Composite indexes require queries');
    expect(markdown).toContain('@celery.task');

    // Verify Electron IPC export call
    const result = await bridge.exportMarkdown(markdown, 'debrief-test.md');
    expect(result.success).toBe(true);
    expect(bridge.exportedFiles).toHaveLength(1);
    expect(bridge.exportedFiles[0].filename).toBe('debrief-test.md');
    expect(bridge.exportedFiles[0].content).toBe(markdown);
  });

  it('AC 4.2: Exported Markdown debrief includes tailored follow-up Thank-You email template', () => {
    const markdown = manager.exportToMarkdown('Alex Dev');

    expect(markdown).toContain('## Tailored Follow-Up Thank-You Email');
    expect(markdown).toContain('**Subject:** Thank you for our conversation today - Alex Dev');
    expect(markdown).toContain('Best regards,\nAlex Dev');
  });
});
