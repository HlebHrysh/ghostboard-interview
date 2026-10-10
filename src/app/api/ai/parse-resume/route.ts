import { NextRequest, NextResponse } from 'next/server';
import { callGeminiWithFallback } from '@/lib/geminiApi';
import { checkRateLimit } from '@/lib/rateLimit';

// Local heuristic fallback tech stack scanner if AI is unavailable or offline
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

  // Detect level
  let level: 'junior' | 'middle' | 'senior' | 'lead' = 'middle';
  const lower = text.toLowerCase();
  if (lower.includes('lead') || lower.includes('architect') || lower.includes('principal') || lower.includes('head of')) {
    level = 'lead';
  } else if (lower.includes('senior') || lower.includes('sr.') || lower.includes('staff')) {
    level = 'senior';
  } else if (lower.includes('junior') || lower.includes('jr.') || lower.includes('trainee') || lower.includes('intern')) {
    level = 'junior';
  }

  // Detect role
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
    summary: 'Автоматично витягнуто на основі ключових технологій вашого резюме.',
    keyProjects: [],
    cvContext: text.slice(0, 2000),
  };
}

export async function POST(req: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(req, 20, 60000, 'parse_resume');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Забагато запитів. Зачекайте хвилинку.' }, { status: 429 });
    }

    const body = await req.json();
    const { fileBase64, mimeType, rawText, fileName } = body;

    if (!fileBase64 && (!rawText || !rawText.trim())) {
      return NextResponse.json({ error: 'Файл резюме або текст не надано.' }, { status: 400 });
    }

    // Direct text fallback if plain text was supplied
    const cleanText = (rawText || '').trim();

    // Prepare Gemini Prompt
    const systemPrompt = `You are an elite technical recruiter and CTO AI analyzing a candidate's resume/CV for real-time interview preparation and teleprompter setup.

YOUR GOAL:
Carefully read the provided resume/CV and extract the candidate's exact technical profile into structured data.

DIRECTIVES:
1. "role": Identify the most accurate, industry-standard target role/title (e.g. "Senior Python & Cloud Architect", "Full-Stack Engineer (React / Node)", "Go / HighLoad Backend Developer", "DevOps & Infrastructure Engineer").
2. "level": Accurately classify the seniority level based on years of experience, scope of responsibilities, and architecture ownership. Must be strictly one of: "junior" | "middle" | "senior" | "lead".
3. "techStack": Extract an exhaustive, prioritized array of 8 to 16 primary technologies, languages, frameworks, databases, and DevOps tools explicitly mentioned or demonstrated (e.g. ["Python", "FastAPI", "PostgreSQL", "Docker", "Kubernetes", "AWS", "Kafka", "Redis", "CI/CD", "TypeScript"]). Format them with clean standard industry names.
4. "summary": A concise 1-2 sentence high-impact technical summary of the candidate's background.
5. "keyProjects": 2-3 key accomplishments, systems built, or company responsibilities highlighted in the resume.
6. "cvContext": A condensed, rich 150-250 word technical summary of the candidate's background, past architectural decisions, pet projects, and core competencies, formatted for real-time injection into an interview copilot.

OUTPUT FORMAT:
Respond ONLY with a valid JSON object matching this schema without markdown fences:
{
  "role": "string",
  "level": "junior" | "middle" | "senior" | "lead",
  "techStack": ["Tech1", "Tech2", "Tech3"],
  "summary": "string",
  "keyProjects": ["Project 1", "Project 2"],
  "cvContext": "string"
}`;

    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

    if (fileBase64 && mimeType) {
      let cleanBase64 = String(fileBase64);
      if (cleanBase64.includes(',')) {
        cleanBase64 = cleanBase64.split(',')[1];
      }
      parts.push({
        inlineData: {
          mimeType: String(mimeType),
          data: cleanBase64,
        },
      });
    }

    if (cleanText) {
      parts.push({
        text: `RESUME / CV CONTENT (${fileName || 'document'}):\n${cleanText.slice(0, 45000)}`,
      });
    }

    parts.push({ text: systemPrompt });

    const preferredModels = [
      'gemini-3.5-flash-lite',
      'gemini-flash-latest',
      'gemini-3.8-flash',
      'gemini-3.6-flash',
    ];

    const result = await callGeminiWithFallback({
      models: preferredModels,
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    if (result.ok && result.text) {
      try {
        let cleanedJson = result.text.trim();
        if (cleanedJson.startsWith('```')) {
          cleanedJson = cleanedJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        }
        const parsed = JSON.parse(cleanedJson) as Record<string, unknown>;

        // Sanitize extracted structure
        const rawStack = Array.isArray(parsed.techStack) ? parsed.techStack : [];
        const rawProjects = Array.isArray(parsed.keyProjects) ? parsed.keyProjects : [];
        const validLevel = ['junior', 'middle', 'senior', 'lead'].includes(String(parsed.level))
          ? (parsed.level as 'junior' | 'middle' | 'senior' | 'lead')
          : 'middle';

        const profile = {
          role: String(parsed.role || 'Software Engineer').trim(),
          level: validLevel,
          techStack: rawStack.length > 0
            ? rawStack.map((s) => String(s).trim()).filter(Boolean).slice(0, 16)
            : ['TypeScript', 'React', 'Node.js'],
          summary: String(parsed.summary || '').trim(),
          keyProjects: rawProjects.map((p) => String(p).trim()),
          cvContext: String(parsed.cvContext || cleanText.slice(0, 2000)).trim(),
        };

        return NextResponse.json({
          success: true,
          profile,
          modelUsed: result.modelUsed,
        });
      } catch (parseErr) {
        console.warn('[ParseResume] JSON parse failed, using heuristic fallback:', parseErr);
      }
    }

    // Heuristic fallback if Gemini fails or is unconfigured
    if (cleanText) {
      const fallback = fallbackHeuristicExtract(cleanText);
      return NextResponse.json({
        success: true,
        profile: fallback,
        modelUsed: 'heuristic-local',
      });
    }

    return NextResponse.json({
      error: result.error || 'Не вдалося розпізнати резюме. Будь ласка, спробуйте вставити текст або вибрати інший файл.',
    }, { status: 500 });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Внутрішня помилка сервера при обробці резюме.';
    console.error('[ParseResume] Unexpected error:', error);
    return NextResponse.json({
      error: errMsg,
    }, { status: 500 });
  }
}
