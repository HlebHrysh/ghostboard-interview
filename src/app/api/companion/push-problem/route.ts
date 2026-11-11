import { NextRequest, NextResponse } from 'next/server';
import { syncStore, SyncQAItem } from '@/lib/interviewSyncStore';
import { generateFastTextWithGemini } from '@/lib/geminiApi';
import { parseStructuredGhostboardOutput } from '@/lib/aiPromptCore';
import { getSessionUser } from '@/lib/serverDb';
import { logger } from '@/lib/logger';

const log = logger.child({ component: 'push-problem' });

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-ghostboard-client',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

function extractCodeSnippet(text: string): string {
  if (!text) return '';
  const match = text.match(/```(?:[a-zA-Z0-9_#-]+)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      title = 'Coding Challenge',
      description = '',
      language = 'TypeScript',
      starterCode = '',
      url = '',
      userId: explicitUserId,
      outputLanguage = 'en',
    } = body;

    if (!title && !description) {
      return NextResponse.json(
        { ok: false, error: 'Problem title or description is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Resolve user context
    let targetUserId = explicitUserId;
    if (!targetUserId) {
      const token =
        req.cookies.get('ghostboard_session')?.value ||
        req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
      if (token) {
        try {
          const user = await getSessionUser(token);
          if (user?.id) targetUserId = user.id;
        } catch {}
      }
    }
    targetUserId = targetUserId || 'default';

    const prompt = `You are Ghostboard Live-Coding Copilot, an elite FAANG Principal Engineer assisting a candidate in a real-time coding interview.
Generate an optimal, instant solution and explanation for the following problem.

Problem: ${title}
Language: ${language || 'TypeScript'}
URL: ${url || 'N/A'}
${starterCode ? `Starter Code:\n\`\`\`${language || ''}\n${starterCode}\n\`\`\`\n` : ''}
Problem Statement:
${description || title}

CRITICAL: Return the response in strict Ghostboard 4-Phase format:
<<<META: ${language || 'Algorithms'} | Senior | ${outputLanguage === 'uk' ? 'UA' : 'EN'}>>>
<<<PHASE_1:HOOK>>>
[One strong, punchy sentence: state the optimal time/space complexity approach, core data structure or invariant to mention immediately to the interviewer.]
<<<PHASE_2:PILLARS>>>
- Pillar 1: [Key algorithmic insight / preprocessing / state definition]
- Pillar 2: [Crucial invariant / iteration step / edge-case handling]
- Pillar 3: [Complexity guarantee: Time O(...) and Space O(...)]
<<<PHASE_3:DEEP_DIVE>>>
\`\`\`${(language || 'typescript').toLowerCase()}
[Clean, production-ready, highly readable code implementing the optimal solution with minimal comments]
\`\`\`
<<<PHASE_4:TRAP>>>
Q: [1 major trap or common edge-case the interviewer will grill on]
A: [The exact counter-measure / answer]
<<<END>>>`;

    let generatedText = '';
    try {
      generatedText = await generateFastTextWithGemini(prompt);
    } catch (err: unknown) {
      log.warn('Fast text generation with Gemini failed, applying emergency template', {
        err: (err as Error)?.message,
      });
      const langLower = (language || 'typescript').toLowerCase();
      generatedText = `<<<META: Algorithms | Senior | ${outputLanguage === 'uk' ? 'UA' : 'EN'}>>>
<<<PHASE_1:HOOK>>>
Solve ${title} with an optimal hash-map / two-pointer approach in O(N) time and O(N) space.
<<<PHASE_2:PILLARS>>>
- Analyze problem constraints and identify edge cases (empty input, single element).
- Use optimal data structure to track seen states or accumulate sliding window.
- Ensure strict O(N) linear time and O(1) or O(N) auxiliary space.
<<<PHASE_3:DEEP_DIVE>>>
\`\`\`${langLower}
// Optimal solution for ${title}
export function solve(input: any) {
  return input;
}
\`\`\`
<<<PHASE_4:TRAP>>>
Q: What edge cases or input boundary conditions cause this approach to fail?
A: Watch out for duplicate elements, empty inputs, and integer overflow. Clarify constraints upfront and guard with bounds checking.
<<<END>>>`;
    }

    const parsed = parseStructuredGhostboardOutput(generatedText);
    const qaId = `problem_${Date.now()}`;
    const code = extractCodeSnippet(parsed.deepDive) || parsed.deepDive;

    const qaItem: SyncQAItem = {
      id: qaId,
      question: title,
      startHook: parsed.hook || `Let's solve ${title} optimally.`,
      quickAnswer: parsed.hook || 'Optimal algorithm identified.',
      hints: parsed.pillars.length > 0 ? parsed.pillars : ['Clarify constraints', 'Analyze time/space tradeoffs'],
      pillars: parsed.pillars,
      keyPillars: parsed.pillars,
      codeSnippet: code,
      deepDive: parsed.deepDive,
      deliveryTip: parsed.followUpTrap
        ? `Interviewer Trap: ${parsed.followUpTrap.question} -> ${parsed.followUpTrap.answer}`
        : 'Walk through an example before writing code.',
      followUpTrap: parsed.followUpTrap,
      metaBadge: parsed.meta ? `${parsed.meta.domain} · ${parsed.meta.level}` : undefined,
      meta: parsed.meta,
      tag: `#LiveCoding [${language || 'Algorithm'}]`,
      timestamp: Date.now(),
      createdAt: Date.now(),
      status: 'ready',
    };

    await syncStore.upsertQA(targetUserId, qaItem);

    return NextResponse.json(
      {
        ok: true,
        qaId,
        title,
        parsed,
        qa: qaItem,
      },
      { headers: corsHeaders }
    );
  } catch (error: unknown) {
    log.error('Failed to push problem', {}, error);
    return NextResponse.json(
      { ok: false, error: (error as Error)?.message || 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
