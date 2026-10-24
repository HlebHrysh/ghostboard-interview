import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callGeminiWithFallback } from '@/lib/geminiApi';
import { checkRateLimit } from '@/lib/rateLimit';

// Local heuristic fallback tech stack scanner if AI is offline
const KNOWN_TECH_KEYWORDS: { pattern: RegExp; name: string }[] = [
  { pattern: /\b(react|react\.js|reactjs)\b/i, name: 'React' },
  { pattern: /\b(next\.js|nextjs)\b/i, name: 'Next.js' },
  { pattern: /\b(vue|vue\.js|vuejs|nuxt)\b/i, name: 'Vue.js' },
  { pattern: /\b(angular)\b/i, name: 'Angular' },
  { pattern: /\b(typescript|ts)\b/i, name: 'TypeScript' },
  { pattern: /\b(javascript|js|es6)\b/i, name: 'JavaScript' },
  { pattern: /\b(node|node\.js|nodejs)\b/i, name: 'Node.js' },
  { pattern: /\b(nest|nestjs)\b/i, name: 'NestJS' },
  { pattern: /\b(express|expressjs)\b/i, name: 'Express' },
  { pattern: /\b(python|python3)\b/i, name: 'Python' },
  { pattern: /\b(fastapi)\b/i, name: 'FastAPI' },
  { pattern: /\b(django)\b/i, name: 'Django' },
  { pattern: /\b(flask)\b/i, name: 'Flask' },
  { pattern: /\b(go|golang)\b/i, name: 'Go' },
  { pattern: /\b(java)\b/i, name: 'Java' },
  { pattern: /\b(spring|spring boot)\b/i, name: 'Spring Boot' },
  { pattern: /\b(c#|\.net|dotnet|asp\.net)\b/i, name: '.NET / C#' },
  { pattern: /\b(rust)\b/i, name: 'Rust' },
  { pattern: /\b(c\+\+)\b/i, name: 'C++' },
  { pattern: /\b(swift|ios)\b/i, name: 'Swift' },
  { pattern: /\b(kotlin|android)\b/i, name: 'Kotlin' },
  { pattern: /\b(flutter|dart)\b/i, name: 'Flutter' },
  { pattern: /\b(postgres|postgresql)\b/i, name: 'PostgreSQL' },
  { pattern: /\b(mysql)\b/i, name: 'MySQL' },
  { pattern: /\b(mongodb|mongo)\b/i, name: 'MongoDB' },
  { pattern: /\b(redis)\b/i, name: 'Redis' },
  { pattern: /\b(kafka|apache kafka)\b/i, name: 'Kafka' },
  { pattern: /\b(rabbitmq)\b/i, name: 'RabbitMQ' },
  { pattern: /\b(graphql)\b/i, name: 'GraphQL' },
  { pattern: /\b(grpc)\b/i, name: 'gRPC' },
  { pattern: /\b(docker)\b/i, name: 'Docker' },
  { pattern: /\b(kubernetes|k8s)\b/i, name: 'Kubernetes' },
  { pattern: /\b(aws|amazon web services)\b/i, name: 'AWS' },
  { pattern: /\b(gcp|google cloud)\b/i, name: 'GCP' },
  { pattern: /\b(azure)\b/i, name: 'Azure' },
  { pattern: /\b(terraform)\b/i, name: 'Terraform' },
  { pattern: /\b(ci\/cd|github actions|gitlab ci)\b/i, name: 'CI/CD' },
  { pattern: /\b(linux)\b/i, name: 'Linux' },
  { pattern: /\b(tailwind|tailwindcss)\b/i, name: 'Tailwind CSS' },
];

function fallbackHeuristicExtract(text: string) {
  const matchedStack: string[] = [];
  for (const item of KNOWN_TECH_KEYWORDS) {
    if (item.pattern.test(text)) {
      matchedStack.push(item.name);
    }
  }

  let level: 'junior' | 'middle' | 'senior' | 'lead' = 'middle';
  const lower = text.toLowerCase();
  if (lower.includes('lead') || lower.includes('architect') || lower.includes('principal') || lower.includes('head of')) {
    level = 'lead';
  } else if (lower.includes('senior') || lower.includes('sr.') || lower.includes('staff')) {
    level = 'senior';
  } else if (lower.includes('junior') || lower.includes('jr.') || lower.includes('trainee') || lower.includes('intern')) {
    level = 'junior';
  }

  let role = 'Software Engineer';
  if (lower.includes('frontend') || lower.includes('front-end')) role = 'Frontend Engineer';
  else if (lower.includes('backend') || lower.includes('back-end')) role = 'Backend Engineer';
  else if (lower.includes('fullstack') || lower.includes('full-stack')) role = 'Full-Stack Developer';
  else if (lower.includes('devops') || lower.includes('sre')) role = 'DevOps / SRE Engineer';
  else if (lower.includes('data engineer')) role = 'Data Engineer';
  else if (lower.includes('mobile') || lower.includes('ios') || lower.includes('android')) role = 'Mobile Engineer';

  if (matchedStack.length > 0) {
    const top3 = matchedStack.slice(0, 3).join(' / ');
    role = `${level === 'lead' ? 'Lead' : level === 'senior' ? 'Senior' : 'Middle'} ${role} (${top3})`;
  }

  return {
    role,
    level,
    techStack: matchedStack.length > 0 ? matchedStack.slice(0, 14) : ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker'],
    summary: 'Automatically extracted based on keywords in resume text.',
    petProjects: [
      {
        name: 'High-Performance Production System',
        description: `Full-stack architectural implementation with ${matchedStack.slice(0, 3).join(', ') || 'modern stack'}`,
        keyHighlight: 'Sub-50ms latency, high availability, containerized deployment',
      }
    ],
    cvContext: text.slice(0, 2000),
  };
}

async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  try {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    await parser.destroy();
    return result.text || '';
  } catch (err) {
    console.warn('[PDFParse] Local buffer extraction warning:', err);
    return '';
  }
}

const ParsedResumeSchema = z.object({
  role: z.string().default('Software Engineer'),
  level: z.enum(['junior', 'middle', 'senior', 'lead']).default('middle'),
  techStack: z.array(z.string()).default([]),
  summary: z.string().default(''),
  petProjects: z.array(
    z.object({
      name: z.string().default('Core Project'),
      description: z.string().default(''),
      keyHighlight: z.string().default(''),
    })
  ).default([]),
  cvContext: z.string().default(''),
});

export async function POST(req: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(req, 20, 60000, 'parse_resume');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a moment.' },
        { status: 429 }
      );
    }

    let buffer: Buffer | null = null;
    let base64Pdf: string | null = null;
    let rawTextContent = '';
    let fileName = 'resume.pdf';

    const contentType = req.headers.get('content-type') || '';

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = (formData.get('file') || formData.get('resume')) as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No PDF file uploaded.' }, { status: 400 });
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'File size exceeds maximum limit of 10MB.' }, { status: 413 });
      }
      fileName = file.name.slice(0, 100).replace(/[^a-zA-Z0-9._-]/g, '_');
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      base64Pdf = buffer.toString('base64');
    } else {
      const body = await req.json().catch(() => ({}));
      if (body.fileBase64) {
        const clean = body.fileBase64.includes(',') ? body.fileBase64.split(',')[1] : body.fileBase64;
        if (clean.length > MAX_FILE_SIZE * 1.37) {
          return NextResponse.json({ error: 'File size exceeds maximum limit of 10MB.' }, { status: 413 });
        }
        buffer = Buffer.from(clean, 'base64');
        base64Pdf = clean;
      }
      if (body.rawText) {
        rawTextContent = String(body.rawText).slice(0, 100000).trim();
      }
      if (body.fileName) {
        fileName = String(body.fileName).slice(0, 100).replace(/[^a-zA-Z0-9._-]/g, '_');
      }
    }

    if (!buffer && !rawTextContent) {
      return NextResponse.json({ error: 'No resume file or text content provided.' }, { status: 400 });
    }

    // Verify PDF Magic Bytes (%PDF-)
    if (buffer) {
      const pdfMagic = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D]);
      if (buffer.length < 5 || !buffer.subarray(0, 5).equals(pdfMagic)) {
        return NextResponse.json(
          { error: 'Invalid file format: Document does not contain valid PDF header magic bytes (%PDF-).' },
          { status: 400 }
        );
      }
      if (!rawTextContent) {
        rawTextContent = await extractTextFromPdfBuffer(buffer);
      }
    }

    const systemPrompt = `You are an elite CTO and technical recruiter AI analyzing a candidate's resume/CV for interview copilot context.
Read the provided resume and return structured data strictly matching this JSON schema:
{
  "role": "Accurate, industry-standard target role (e.g. Senior Python Backend Developer, Staff Frontend Engineer (React / TypeScript), Go HighLoad Architect)",
  "level": "junior" | "middle" | "senior" | "lead",
  "techStack": ["Exhaustive prioritized list of 8-16 primary technologies, frameworks, and tools"],
  "summary": "1-2 sentence high-impact technical career summary",
  "petProjects": [
    {
      "name": "Project or Core System Title",
      "description": "What problem it solved and technology architecture",
      "keyHighlight": "Measurable technical achievement, metric, or scale bottleneck resolved"
    }
  ],
  "cvContext": "Dense 150-250 word technical summary of candidate career milestones, past architectures, and pet projects for interview teleprompter grounding"
}`;

    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

    if (rawTextContent.trim()) {
      parts.push({
        text: `RESUME DOCUMENT CONTENT (${fileName}):\n${rawTextContent.slice(0, 45000)}`,
      });
    } else if (base64Pdf) {
      // Multimodal OCR fallback for scanned PDFs
      parts.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: base64Pdf,
        },
      });
    }

    parts.push({ text: systemPrompt });

    const preferredModels = [
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'gemini-flash-latest',
    ];

    const result = await callGeminiWithFallback({
      models: preferredModels,
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.15,
      },
    });

    if (result.ok && result.text) {
      try {
        let cleaned = result.text.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        }
        const rawJson = JSON.parse(cleaned);

        // Normalize petProjects field (handling keyProjects or petProjects)
        if (!rawJson.petProjects && Array.isArray(rawJson.keyProjects)) {
          rawJson.petProjects = rawJson.keyProjects.map((p: Record<string, unknown> | string, idx: number) => {
            if (typeof p === 'string') {
              return {
                name: `System Project #${idx + 1}`,
                description: p,
                keyHighlight: 'Production implementation',
              };
            }
            return {
              name: p.title || p.name || `Project #${idx + 1}`,
              description: p.description || '',
              keyHighlight: p.keyAchievement || p.keyHighlight || '',
            };
          });
        }

        const parsed = ParsedResumeSchema.parse(rawJson);

        return NextResponse.json({
          success: true,
          profile: parsed,
          modelUsed: result.modelUsed,
        });
      } catch (parseErr) {
        console.warn('[API resume/parse] JSON validation error:', parseErr);
      }
    }

    // Heuristic fallback
    if (rawTextContent.trim()) {
      const fallback = fallbackHeuristicExtract(rawTextContent);
      return NextResponse.json({
        success: true,
        profile: fallback,
        modelUsed: 'heuristic-local',
      });
    }

    return NextResponse.json(
      { error: result.error || 'Failed to parse resume document.' },
      { status: 500 }
    );
  } catch (error: unknown) {
    console.error('[API resume/parse] Unexpected error:', error);
    return NextResponse.json(
      { error: (error as { message?: string })?.message || 'Internal server error processing resume.' },
      { status: 500 }
    );
  }
}
