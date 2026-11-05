import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  chunkArray,
  appendNotionBlocksInChunks,
  exportTranscriptToNotion,
  NotionExportError,
  createParagraphBlock,
} from '../src/lib/notionExport';

describe('notionExport', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('chunkArray', () => {
    it('splits an array into chunks of specified size', () => {
      const items = Array.from({ length: 250 }, (_, i) => i);
      const chunks = chunkArray(items, 100);
      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toHaveLength(100);
      expect(chunks[1]).toHaveLength(100);
      expect(chunks[2]).toHaveLength(50);
    });

    it('returns empty array when input is empty', () => {
      expect(chunkArray([], 100)).toEqual([]);
    });

    it('throws when chunkSize is <= 0', () => {
      expect(() => chunkArray([1, 2], 0)).toThrow('chunkSize must be greater than 0');
    });
  });

  describe('appendNotionBlocksInChunks', () => {
    it('returns empty array when blocks array is empty', async () => {
      const result = await appendNotionBlocksInChunks('page-123', [], { apiKey: 'secret_test' });
      expect(result).toEqual([]);
    });

    it('sends blocks in chunks of 100 to Notion API', async () => {
      const blocks = Array.from({ length: 205 }, (_, i) => createParagraphBlock(`Line ${i}`));
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ results: [{ id: 'block-1' }] }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const results = await appendNotionBlocksInChunks('12345678-1234-1234-1234-123456789abc', blocks, {
        apiKey: 'secret_test_key',
      });

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(results).toHaveLength(3);

      // Verify request payload of the 3 calls: 100, 100, 5
      const firstCallBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(firstCallBody.children).toHaveLength(100);

      const secondCallBody = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(secondCallBody.children).toHaveLength(100);

      const thirdCallBody = JSON.parse(fetchMock.mock.calls[2][1].body);
      expect(thirdCallBody.children).toHaveLength(5);

      // Verify Notion version & auth headers
      expect(fetchMock.mock.calls[0][1].headers['Authorization']).toBe('Bearer secret_test_key');
      expect(fetchMock.mock.calls[0][1].headers['Notion-Version']).toBe('2022-06-28');
    });

    it('throws NotionExportError when fetch fails', async () => {
      const blocks = [createParagraphBlock('Hello')];
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          json: async () => ({ message: 'API token is invalid.' }),
        })
      );

      await expect(
        appendNotionBlocksInChunks('page-id', blocks, { apiKey: 'invalid_key' })
      ).rejects.toThrow(NotionExportError);
    });
  });

  describe('exportTranscriptToNotion', () => {
    it('formats entries and calls appendNotionBlocksInChunks', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ results: [] }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const res = await exportTranscriptToNotion(
        'page-123',
        'Interview Transcript - Senior Frontend',
        [
          { speaker: 'Interviewer', text: 'Tell me about event loops.' },
          { speaker: 'Candidate', text: 'In JavaScript the event loop manages the execution stack...' },
        ],
        { apiKey: 'secret_key' }
      );

      expect(res.totalBlocks).toBe(3); // 1 heading + 2 bullet items
      expect(res.chunksProcessed).toBe(1);
    });
  });
});
