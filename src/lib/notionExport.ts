/**
 * Notion Export Utility
 *
 * Implements batch chunking for Notion API block append.
 * Notion strictly limits `PATCH /v1/blocks/{block_id}/children` to a maximum
 * of 100 blocks per request. This module automatically splits blocks into
 * chunks of 100 and sends them sequentially with `AbortSignal.timeout(8000)`
 * instead of silently truncating blocks.
 */

export interface NotionRichTextItem {
  type?: 'text';
  text: {
    content: string;
    link?: { url: string } | null;
  };
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
    color?: string;
  };
}

export interface NotionBlock {
  object?: 'block';
  type: string;
  [key: string]: unknown;
}

export interface NotionAppendOptions {
  apiKey: string;
  notionVersion?: string;
  timeoutMs?: number;
}

export const NOTION_MAX_BLOCKS_PER_REQUEST = 100;
export const DEFAULT_NOTION_VERSION = '2022-06-28';
export const DEFAULT_NOTION_TIMEOUT_MS = 8000;

export class NotionExportError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly responseBody?: unknown
  ) {
    super(message);
    this.name = 'NotionExportError';
  }
}

/**
 * Splits an array into chunks of a given maximum size.
 */
export function chunkArray<T>(items: T[], chunkSize: number = NOTION_MAX_BLOCKS_PER_REQUEST): T[][] {
  if (chunkSize <= 0) {
    throw new Error('chunkSize must be greater than 0');
  }
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Formats plain text into a Notion paragraph block.
 */
export function createParagraphBlock(text: string): NotionBlock {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [
        {
          type: 'text',
          text: { content: text },
        },
      ],
    },
  };
}

/**
 * Formats a heading 2 block.
 */
export function createHeading2Block(text: string): NotionBlock {
  return {
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [
        {
          type: 'text',
          text: { content: text },
        },
      ],
    },
  };
}

/**
 * Formats a bullet list item block.
 */
export function createBulletItemBlock(text: string): NotionBlock {
  return {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [
        {
          type: 'text',
          text: { content: text },
        },
      ],
    },
  };
}

/**
 * Appends blocks to a Notion page or container block in chunks of 100,
 * strictly abiding by Notion's API payload limit and applying 8000ms timeouts.
 *
 * @param blockId - Page ID or parent Block ID in Notion
 * @param blocks - Array of Notion block objects (can be any size)
 * @param options - API key and optional overrides
 * @returns Array of responses from each chunk append operation
 */
export async function appendNotionBlocksInChunks(
  blockId: string,
  blocks: NotionBlock[],
  options: NotionAppendOptions
): Promise<Array<{ results: unknown[] }>> {
  if (!blockId?.trim()) {
    throw new NotionExportError('blockId is required');
  }
  if (!options?.apiKey?.trim()) {
    throw new NotionExportError('Notion API key is required');
  }

  if (blocks.length === 0) {
    return [];
  }

  const chunks = chunkArray(blocks, NOTION_MAX_BLOCKS_PER_REQUEST);
  const responses: Array<{ results: unknown[] }> = [];
  const cleanBlockId = blockId.replace(/-/g, '');
  const url = `https://api.notion.com/v1/blocks/${cleanBlockId}/children`;
  const timeoutMs = options.timeoutMs ?? DEFAULT_NOTION_TIMEOUT_MS;
  const notionVersion = options.notionVersion ?? DEFAULT_NOTION_VERSION;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': notionVersion,
      },
      body: JSON.stringify({
        children: chunk,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      let errBody: unknown;
      try {
        errBody = await res.json();
      } catch {
        errBody = await res.text().catch(() => null);
      }
      throw new NotionExportError(
        `Failed to append Notion block chunk ${i + 1}/${chunks.length}: HTTP ${res.status}`,
        res.status,
        errBody
      );
    }

    const data = await res.json();
    responses.push(data);
  }

  return responses;
}

/**
 * High-level helper to export an interview transcript/notes into Notion,
 * automatically converting transcript lines into blocks and batching them in chunks of 100.
 */
export async function exportTranscriptToNotion(
  pageId: string,
  title: string,
  transcriptEntries: Array<{ speaker: string; text: string; timestamp?: string }>,
  options: NotionAppendOptions
): Promise<{ totalBlocks: number; chunksProcessed: number }> {
  const blocks: NotionBlock[] = [];

  // Add header
  blocks.push(createHeading2Block(title));

  // Add all transcript lines
  for (const entry of transcriptEntries) {
    const prefix = entry.timestamp ? `[${entry.timestamp}] ` : '';
    const content = `${prefix}${entry.speaker}: ${entry.text}`;
    blocks.push(createBulletItemBlock(content));
  }

  const results = await appendNotionBlocksInChunks(pageId, blocks, options);

  return {
    totalBlocks: blocks.length,
    chunksProcessed: results.length,
  };
}
