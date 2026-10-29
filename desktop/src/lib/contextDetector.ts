/**
 * Zero-Config Autonomous Context & Language Detector
 * Automatically determines language (EN vs UA/RU) and engineering subject area
 * (System Design, Backend, Frontend, DevOps, Algorithms, Behavioral/HR)
 * directly from speech transcripts and live questions.
 */

export type DetectedLanguage = 'EN' | 'UA';

export interface DetectedContext {
  language: DetectedLanguage;
  domain: string;
  badgeText: string;
}

const DOMAIN_PATTERNS: Array<{
  domain: string;
  regex: RegExp;
}> = [
  {
    domain: 'Algorithms',
    regex: /\b(algorithm|complexity|big o|o\(n\)|binary search|tree|graph|dynamic programming|dfs|bfs|hashmap|array|leetcode|recursion|sorting|linked list|two pointers|sliding window|bit manipulation|алгоритм|складність|дерево|граф|структур[а-я]|масив)\b/i,
  },
  {
    domain: 'System Design',
    regex: /\b(system design|architecture|scalability|scale|sharding|replication|load balancer|cdn|high availability|cap theorem|distributed|microservice|kafka|rabbitmq|message queue|event-driven|cqrs|архітектур|масштабуван|кластер|реплікац|шардинг|мікросервіс|брокер)\b/i,
  },
  {
    domain: 'DevOps & Cloud',
    regex: /\b(docker|kubernetes|k8s|helm|terraform|ansible|ci\/cd|pipeline|aws|gcp|azure|prometheus|grafana|nginx|linux|bash|container|девопс|хмар|контейнер|пайплайн)\b/i,
  },
  {
    domain: 'Frontend',
    regex: /\b(frontend|react|vue|angular|svelte|next\.js|typescript|javascript|tailwind|css|dom|virtual dom|bundle|webpack|vite|hydration|ssr|csr|hook|redux|zustand|фронтенд|компонент|браузер)\b/i,
  },
  {
    domain: 'Behavioral / HR',
    regex: /\b(behavioral|tell me about|conflict|teamwork|leadership|challenge|failure|weakness|strength|experience with a colleague|why should we hire|розкажіть про себе|конфлікт|команд|провал|досвід роботи|сильні сторони)\b/i,
  },
  {
    domain: 'Backend & DB',
    regex: /\b(backend|api|rest|graphql|grpc|postgres|postgresql|mysql|mongodb|redis|sql|orm|sqlalchemy|prisma|asyncio|eventloop|concurrency|goroutine|python|golang|rust|java|spring|node|django|fastapi|бэкенд|баз[а-я] дан|запит|транзакц|індекс)\b/i,
  },
];

/**
 * Detects whether the speech is English or Ukrainian/Cyrillic.
 */
export function detectLanguage(text: string): DetectedLanguage {
  if (!text || !text.trim()) return 'EN';
  // Check for presence of Cyrillic characters (Ukrainian / Russian)
  const cyrillicMatch = text.match(/[\u0400-\u04FF]/g);
  if (cyrillicMatch && cyrillicMatch.length >= 3) {
    return 'UA';
  }
  return 'EN';
}

/**
 * Detects the technical domain from the text, falling back to candidate role.
 */
export function detectDomain(text: string, candidateRole?: string): string {
  if (text && text.trim()) {
    for (const { domain, regex } of DOMAIN_PATTERNS) {
      if (regex.test(text)) {
        return domain;
      }
    }
  }

  // Fallback to candidate profile role if provided
  if (candidateRole) {
    const roleLower = candidateRole.toLowerCase();
    if (roleLower.includes('frontend') || roleLower.includes('react')) return 'Frontend';
    if (roleLower.includes('system') || roleLower.includes('architect') || roleLower.includes('lead')) return 'System Design';
    if (roleLower.includes('devops') || roleLower.includes('cloud') || roleLower.includes('sre')) return 'DevOps & Cloud';
    if (roleLower.includes('fullstack')) return 'Fullstack';
    if (roleLower.includes('data') || roleLower.includes('ml')) return 'Data / ML';
    return 'Backend';
  }

  return 'General Technical';
}

/**
 * Computes the unified dynamic badge text: e.g. "Auto: EN • System Design"
 */
export function detectContext(text: string, candidateRole?: string): DetectedContext {
  const language = detectLanguage(text);
  const domain = detectDomain(text, candidateRole);
  return {
    language,
    domain,
    badgeText: `Auto: ${language} • ${domain}`,
  };
}
