/**
 * Candidate Profile Store & Backend Sync for Ghostboard Desktop HUD
 * Manages:
 * - Secure local persistence in localStorage (ghostboard_candidate_profile)
 * - Bi-directional synchronization with /api/profile/context (GET & POST) with Bearer token
 * - Role & Tech Stack presets (Frontend, Backend, Go, Python, Full-Stack, DevOps, etc.)
 * - Validation and normalization of seniority levels (junior, middle, senior, lead, principal)
 * - Resume PDF upload & base64 parsing via /api/ai/parse-resume
 */

export type CandidateLevel = 'junior' | 'middle' | 'senior' | 'lead' | 'principal';

export interface PetProject {
  id: string;
  name: string;
  description: string;
  keyHighlight: string;
}

export interface CandidateProfile {
  role: string;
  primaryStack: string;
  techStack: string[];
  experienceLevel: CandidateLevel;
  customBio: string;
  targetCompany?: string;
  resumeKeywords?: string[];
  petProjects?: PetProject[];
  summary?: string;
  cvContext?: string;
  updatedAt?: number;
}

export const PROFILE_STORAGE_KEY = 'ghostboard_candidate_profile';
export const PROFILE_DRAFT_KEY = 'ghostboard_candidate_profile_draft';

export const EXPERIENCE_LEVELS: Array<{
  id: CandidateLevel;
  label: string;
  badge: string;
  colorClass: string;
  description: string;
}> = [
  {
    id: 'junior',
    label: 'Junior',
    badge: 'JUNIOR',
    colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description: '0-2 роки досвіду. Акцент на базі CS, алгоритмах та швидкому навчанні.',
  },
  {
    id: 'middle',
    label: 'Middle',
    badge: 'MIDDLE',
    colorClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    description: '2-4 роки досвіду. Самостійна реалізація фіч, рефакторинг, надійність.',
  },
  {
    id: 'senior',
    label: 'Senior',
    badge: 'SENIOR',
    colorClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    description: '5+ років досвіду. Архітектура, trade-offs, p99 latency, менторство.',
  },
  {
    id: 'lead',
    label: 'Lead',
    badge: 'LEAD',
    colorClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description: 'Team / Tech Lead. Доставка рішень, баланс бізнес-цілей, cross-team sync.',
  },
  {
    id: 'principal',
    label: 'Principal',
    badge: 'PRINCIPAL',
    colorClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    description: 'Staff / Principal / Architect. Стратегічні технічні рішення, distributed systems.',
  },
];

export const DEFAULT_CANDIDATE_PROFILE: CandidateProfile = {
  role: 'Full-Stack Developer (React / TypeScript / Node.js)',
  primaryStack: 'TypeScript, React, Node.js, PostgreSQL, Docker',
  techStack: [
    'TypeScript',
    'JavaScript',
    'React',
    'Next.js',
    'Node.js',
    'PostgreSQL',
    'Docker',
    'REST API',
    'Tailwind CSS',
    'Git',
  ],
  experienceLevel: 'senior',
  customBio: 'Senior Software Engineer with strong expertise in clean architecture, performance optimization, distributed microservices, and modern web application development.',
  petProjects: [
    {
      id: 'proj_default_1',
      name: 'High-Performance Web Platform',
      description: 'Production-ready full-stack application with real-time sync, caching, and clean modular architecture',
      keyHighlight: 'Optimized response times, automated testing, containerized CI/CD workflow',
    },
  ],
  updatedAt: Date.now(),
};

export interface RolePreset {
  key: string;
  label: string;
  role: string;
  level: CandidateLevel;
  primaryStack: string;
  techStack: string[];
  customBio: string;
  petProjects: PetProject[];
}

export const ROLE_PRESETS: Record<string, RolePreset> = {
  fullstack: {
    key: 'fullstack',
    label: 'Full-Stack (React / Node / TS)',
    role: 'Full-Stack Developer (React / TypeScript / Node.js)',
    level: 'senior',
    primaryStack: 'TypeScript, React 19, Next.js, Node.js, PostgreSQL, Docker',
    techStack: [
      'TypeScript',
      'JavaScript',
      'React',
      'Next.js',
      'Node.js',
      'PostgreSQL',
      'Docker',
      'REST API',
      'Tailwind CSS',
      'Git',
    ],
    customBio: 'Full-Stack Software Engineer bridging modern React/TypeScript frontends with robust backend APIs, relational databases, and containerized deployments.',
    petProjects: [
      {
        id: 'fs_p1',
        name: 'Collaborative Real-Time Workspace',
        description: 'Multi-tenant SaaS with Next.js frontend, Node.js API, and PostgreSQL',
        keyHighlight: 'WebSocket synchronization, optimistic UI updates, containerized CI/CD workflow',
      },
    ],
  },
  frontend: {
    key: 'frontend',
    label: 'Frontend (React / Next.js)',
    role: 'Senior Frontend Engineer (React / Next.js / TypeScript)',
    level: 'senior',
    primaryStack: 'TypeScript, React 19, Next.js, Tailwind CSS, Vite, Zustand',
    techStack: [
      'TypeScript',
      'JavaScript',
      'React',
      'Next.js',
      'Tailwind CSS',
      'React Query',
      'Zustand',
      'Vite',
      'HTML5',
      'CSS3',
      'REST API',
      'GraphQL',
      'Git',
    ],
    customBio: 'Frontend Engineer focused on modern React, component architecture, rendering performance, TypeScript type safety, and responsive UI design.',
    petProjects: [
      {
        id: 'fe_p1',
        name: 'High-Performance SaaS Dashboard',
        description: 'Next.js App Router web application with Server Components, Tailwind CSS and Zustand state management',
        keyHighlight: '99/100 Lighthouse performance, sub-50ms client navigation, optimistic mutations',
      },
    ],
  },
  python_backend: {
    key: 'python_backend',
    label: 'Python Backend (FastAPI / Django)',
    role: 'Senior Python Backend Developer (FastAPI / Asyncio)',
    level: 'senior',
    primaryStack: 'Python, FastAPI, Django, PostgreSQL, Redis, Celery, Docker',
    techStack: [
      'Python',
      'FastAPI',
      'Django',
      'PostgreSQL',
      'SQLAlchemy',
      'Redis',
      'Celery',
      'Docker',
      'Asyncio',
      'REST API',
      'Git',
    ],
    customBio: 'Python Backend Developer with deep expertise in Asyncio, FastAPI/Django, relational database design (PostgreSQL), background workers, and clean code.',
    petProjects: [
      {
        id: 'py_p1',
        name: 'Asynchronous API Microservices',
        description: 'FastAPI microservices with PostgreSQL, Redis caching, and Celery background task queue',
        keyHighlight: 'Sub-30ms response times, B-Tree index optimization, rate limiting with Redis',
      },
    ],
  },
  nodejs_backend: {
    key: 'nodejs_backend',
    label: 'Node.js / NestJS Backend',
    role: 'Senior Node.js / NestJS Backend Developer',
    level: 'senior',
    primaryStack: 'TypeScript, Node.js, NestJS, Prisma, PostgreSQL, Redis, Docker',
    techStack: [
      'TypeScript',
      'Node.js',
      'NestJS',
      'Express',
      'Prisma ORM',
      'PostgreSQL',
      'Redis',
      'Docker',
      'Microservices',
      'REST API',
      'Git',
    ],
    customBio: 'Node.js/TypeScript Backend Engineer experienced in NestJS, Express, microservices, REST/GraphQL APIs, and database performance.',
    petProjects: [
      {
        id: 'node_p1',
        name: 'Scalable NestJS Microservice Platform',
        description: 'Modular enterprise architecture with NestJS, Prisma ORM, PostgreSQL and Redis pub/sub',
        keyHighlight: 'Dependency injection, clean hexagonal architecture, automated integration tests',
      },
    ],
  },
  golang_backend: {
    key: 'golang_backend',
    label: 'Go (Golang) Backend',
    role: 'Senior Go (Golang) Backend Developer',
    level: 'senior',
    primaryStack: 'Go (Golang), Goroutines, Gin, gRPC, PostgreSQL, Redis, Docker',
    techStack: [
      'Go (Golang)',
      'Goroutines',
      'Channels',
      'Gin',
      'gRPC',
      'Protobuf',
      'PostgreSQL',
      'Redis',
      'Docker',
      'Kafka',
      'Microservices',
      'Git',
    ],
    customBio: 'Go Engineer with strong focus on high-performance concurrent systems, low-latency microservices, gRPC, and clean idiomatic Go.',
    petProjects: [
      {
        id: 'go_p1',
        name: 'Low-Latency Real-Time Telemetry Engine',
        description: 'High-throughput Go service using Goroutines, worker pools and gRPC streaming',
        keyHighlight: 'Processes 50k+ events/sec with minimal memory allocation and zero GC pauses',
      },
    ],
  },
  java_backend: {
    key: 'java_backend',
    label: 'Java / Spring Boot',
    role: 'Senior Java / Spring Boot Developer',
    level: 'senior',
    primaryStack: 'Java 21, Spring Boot 3, Hibernate, PostgreSQL, Kafka, Docker',
    techStack: [
      'Java',
      'Spring Boot',
      'Spring Security',
      'Hibernate / JPA',
      'PostgreSQL',
      'Apache Kafka',
      'Redis',
      'Docker',
      'Microservices',
      'Git',
    ],
    customBio: 'Java Backend Engineer specializing in Spring Boot, JVM internals, concurrency, Hibernate optimization, and distributed microservices.',
    petProjects: [
      {
        id: 'java_p1',
        name: 'High-Throughput Financial Event Processing',
        description: 'Spring Boot 3 microservice with Kafka event streaming, Hibernate JPA and PostgreSQL',
        keyHighlight: 'Idempotent Kafka consumers, distributed locking with Redis, high-throughput transactions',
      },
    ],
  },
  dotnet_backend: {
    key: 'dotnet_backend',
    label: '.NET / C# Backend',
    role: 'Senior .NET / C# Backend Developer',
    level: 'senior',
    primaryStack: 'C#, .NET 8/9, ASP.NET Core, EF Core, SQL Server, Docker',
    techStack: [
      'C#',
      '.NET',
      'ASP.NET Core',
      'Entity Framework Core',
      'LINQ',
      'SQL Server',
      'Docker',
      'Redis',
      'Clean Architecture',
      'Git',
    ],
    customBio: '.NET/C# Developer focused on ASP.NET Core, CQRS/Clean Architecture, Entity Framework optimization, and scalable enterprise services.',
    petProjects: [
      {
        id: 'net_p1',
        name: 'Enterprise Billing & Subscription Platform',
        description: 'ASP.NET Core Web API with Clean Architecture, EF Core, and MediatR CQRS pattern',
        keyHighlight: 'Asynchronous event handling, compiled EF queries, resilient cloud deployment',
      },
    ],
  },
  devops: {
    key: 'devops',
    label: 'DevOps / SRE',
    role: 'DevOps / Infrastructure Engineer',
    level: 'senior',
    primaryStack: 'Kubernetes, Docker, Terraform, AWS, CI/CD, Prometheus, Linux',
    techStack: [
      'Kubernetes',
      'Docker',
      'Terraform',
      'AWS',
      'CI/CD',
      'GitHub Actions',
      'Prometheus',
      'Grafana',
      'Linux',
      'Bash',
      'Git',
    ],
    customBio: 'DevOps Engineer focused on Kubernetes orchestration, immutable infrastructure-as-code, high-availability architecture, and observability.',
    petProjects: [
      {
        id: 'do_p1',
        name: 'GitOps Multi-Cluster Infrastructure',
        description: 'Declarative Kubernetes cluster deployment with Terraform, ArgoCD and automated monitoring',
        keyHighlight: 'Zero-downtime rolling updates, automated canary deployments, sub-1s alert resolution',
      },
    ],
  },
  system_architect: {
    key: 'system_architect',
    label: 'System / Solutions Architect',
    role: 'Principal System Architect / Distributed Systems',
    level: 'principal',
    primaryStack: 'Distributed Systems, System Architecture, Microservices, Kafka, PostgreSQL, Cloud',
    techStack: [
      'System Architecture',
      'Distributed Systems',
      'Microservices',
      'Event-Driven Architecture',
      'PostgreSQL',
      'Apache Kafka',
      'Redis',
      'Docker',
      'Kubernetes',
      'High-Load',
    ],
    customBio: 'System Architect designing resilient, distributed, high-throughput software architectures with strict SLA/SLO boundaries.',
    petProjects: [
      {
        id: 'sa_p1',
        name: 'High-Availability Banking Core',
        description: 'Event-driven architecture with CQRS, event sourcing, and distributed transactions',
        keyHighlight: '99.999% uptime SLA, sub-25ms global transactions, zero data loss guarantee',
      },
    ],
  },
};

export const POPULAR_TECH_SUGGESTIONS = [
  'TypeScript',
  'React',
  'Next.js',
  'Node.js',
  'Python',
  'FastAPI',
  'PostgreSQL',
  'Docker',
  'Kubernetes',
  'Redis',
  'Kafka',
  'AWS',
  'Go',
  'Java',
  'GraphQL',
  'Tailwind CSS',
  'Git',
  'CI/CD',
  'Linux',
];

/**
 * Normalizes input seniority string into safe CandidateLevel enum.
 */
export function normalizeCandidateLevel(level: unknown): CandidateLevel {
  if (!level || typeof level !== 'string') return 'senior';
  const clean = level.trim().toLowerCase();
  if (clean.includes('principal') || clean.includes('staff') || clean.includes('architect')) {
    return 'principal';
  }
  if (clean.includes('lead') || clean.includes('head')) {
    return 'lead';
  }
  if (clean.includes('senior') || clean.includes('sr')) {
    return 'senior';
  }
  if (clean.includes('junior') || clean.includes('jr') || clean.includes('trainee') || clean.includes('intern')) {
    return 'junior';
  }
  return 'middle';
}

/**
 * Validates candidate profile fields.
 */
export function validateCandidateProfile(profile: Partial<CandidateProfile>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!profile.role || !profile.role.trim()) {
    errors.push('Target role cannot be empty.');
  }

  const stack = profile.techStack || [];
  if (stack.length === 0 && (!profile.primaryStack || !profile.primaryStack.trim())) {
    errors.push('At least one technology or primary stack skill must be specified.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function buildCandidateSystemPrompt(profile: CandidateProfile): string {
  return `Candidate Role: ${profile.role} (${profile.experienceLevel.toUpperCase()})
Primary Stack: ${profile.primaryStack}
Technologies: ${profile.techStack.join(', ')}
Context & Bio: ${profile.customBio || profile.summary || ''}
${profile.petProjects && profile.petProjects.length > 0 ? `Key Projects: ${profile.petProjects.map((p) => `${p.name}: ${p.description}`).join('; ')}` : ''}`.trim();
}

export function getCachedSystemPrompt(): string {
  const profile = getStoredProfile();
  return buildCandidateSystemPrompt(profile);
}

/**
 * Retrieves the stored candidate profile with fallback to default.
 */
export function getStoredProfile(): CandidateProfile {
  if (typeof window === 'undefined') {
    return DEFAULT_CANDIDATE_PROFILE;
  }
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_CANDIDATE_PROFILE;
    }
    const parsed = JSON.parse(raw);
    const techStack = Array.isArray(parsed.techStack) && parsed.techStack.length > 0
      ? parsed.techStack
      : parsed.primaryStack
      ? parsed.primaryStack.split(',').map((s: string) => s.trim()).filter(Boolean)
      : DEFAULT_CANDIDATE_PROFILE.techStack;

    const primaryStack = parsed.primaryStack || techStack.join(', ');

    const profile: CandidateProfile = {
      role: parsed.role || DEFAULT_CANDIDATE_PROFILE.role,
      primaryStack,
      techStack,
      experienceLevel: normalizeCandidateLevel(parsed.experienceLevel || parsed.level),
      customBio: parsed.customBio || parsed.summary || parsed.customContext || DEFAULT_CANDIDATE_PROFILE.customBio,
      resumeKeywords: Array.isArray(parsed.resumeKeywords) ? parsed.resumeKeywords : techStack,
      petProjects: Array.isArray(parsed.petProjects) && parsed.petProjects.length > 0
        ? parsed.petProjects
        : DEFAULT_CANDIDATE_PROFILE.petProjects,
      summary: parsed.summary || '',
      cvContext: parsed.cvContext || '',
      updatedAt: parsed.updatedAt || Date.now(),
    };
    return profile;
  } catch (err) {
    console.warn('[profileStore] Error loading stored profile from localStorage:', err);
    return DEFAULT_CANDIDATE_PROFILE;
  }
}

/** Alias for getStoredProfile */
export const loadStoredProfile = getStoredProfile;

/**
 * Saves candidate profile to localStorage.
 */
export function saveStoredProfile(profile: CandidateProfile): void {
  const toSave: CandidateProfile = {
    ...profile,
    experienceLevel: normalizeCandidateLevel(profile.experienceLevel),
    primaryStack: profile.primaryStack || (profile.techStack || []).join(', '),
    updatedAt: Date.now(),
  };

  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(toSave));
    localStorage.removeItem(PROFILE_DRAFT_KEY);
  } catch (err) {
    console.warn('[profileStore] Error saving profile to localStorage:', err);
  }
}

/**
 * Merges partial updates into stored profile, saves, and returns the updated profile.
 */
export function updateStoredProfile(updates: Partial<CandidateProfile>): CandidateProfile {
  const current = getStoredProfile();
  const merged: CandidateProfile = {
    ...current,
    ...updates,
    techStack: updates.techStack || current.techStack,
    experienceLevel: normalizeCandidateLevel(updates.experienceLevel || current.experienceLevel),
    primaryStack: updates.primaryStack || current.primaryStack || (updates.techStack || current.techStack || []).join(', '),
    updatedAt: Date.now(),
  };
  saveStoredProfile(merged);
  return merged;
}

/**
 * Restores the profile to factory default and updates localStorage.
 */
export function resetStoredProfile(): CandidateProfile {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(DEFAULT_CANDIDATE_PROFILE));
      localStorage.removeItem(PROFILE_DRAFT_KEY);
    } catch {}
  }
  return DEFAULT_CANDIDATE_PROFILE;
}

/**
 * Resolves full API endpoint given optional base URL.
 */
export function resolveApiUrl(path: string, baseUrl?: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!baseUrl || baseUrl === '' || baseUrl === '/') {
    return cleanPath;
  }
  return `${baseUrl.replace(/\/+$/, '')}${cleanPath}`;
}

/**
 * Synchronizes the candidate profile with the backend /api/profile/context via POST.
 */
export async function syncProfileToBackend(
  profile: CandidateProfile,
  baseUrl?: string,
  token?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const endpoint = resolveApiUrl('/api/profile/context', baseUrl);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-ghostboard-client': 'desktop-app',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const payload = {
      candidateProfile: profile,
      resumeContext: profile.customBio || profile.role,
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errData.error || `HTTP ${res.status}: Failed to sync profile with server`,
      };
    }

    return { success: true };
  } catch (err: unknown) {
    console.warn('[profileStore] Network error syncing profile to backend:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error syncing profile',
    };
  }
}

/**
 * Fetches the candidate profile from the backend /api/profile/context via GET.
 */
export async function fetchBackendProfile(
  baseUrl?: string,
  token?: string | null
): Promise<CandidateProfile | null> {
  try {
    const endpoint = resolveApiUrl('/api/profile/context', baseUrl);
    const headers: Record<string, string> = {
      'x-ghostboard-client': 'desktop-app',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(endpoint, {
      method: 'GET',
      headers,
    });

    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data || !data.candidateProfile) return null;

    const raw = data.candidateProfile;
    const techStack = Array.isArray(raw.techStack) && raw.techStack.length > 0
      ? raw.techStack
      : raw.primaryStack
      ? raw.primaryStack.split(',').map((s: string) => s.trim()).filter(Boolean)
      : DEFAULT_CANDIDATE_PROFILE.techStack;

    return {
      role: raw.role || DEFAULT_CANDIDATE_PROFILE.role,
      primaryStack: raw.primaryStack || techStack.join(', '),
      techStack,
      experienceLevel: normalizeCandidateLevel(raw.experienceLevel || raw.level),
      customBio: raw.customBio || data.resumeContext || DEFAULT_CANDIDATE_PROFILE.customBio,
      petProjects: Array.isArray(raw.petProjects) ? raw.petProjects : DEFAULT_CANDIDATE_PROFILE.petProjects,
      resumeKeywords: Array.isArray(raw.resumeKeywords) ? raw.resumeKeywords : techStack,
      updatedAt: Date.now(),
    };
  } catch (err) {
    console.warn('[profileStore] Error fetching profile from backend:', err);
    return null;
  }
}

/**
 * Converts a browser File or Blob into base64 data URL string.
 */
export async function convertFileToBase64(file: File | Blob): Promise<string> {
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }
  // Node / test environment fallback
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return `data:application/pdf;base64,${buffer.toString('base64')}`;
}

/**
 * Sends a PDF file or base64 string to /api/ai/parse-resume to extract structured candidate details.
 */
export async function parseResumePdf(
  fileOrBase64: File | string,
  fileName?: string,
  baseUrl?: string,
  token?: string | null
): Promise<{
  success: boolean;
  profile?: Partial<CandidateProfile>;
  error?: string;
  modelUsed?: string;
}> {
  try {
    let base64String = '';
    let name = fileName || 'resume.pdf';

    if (typeof fileOrBase64 === 'string') {
      base64String = fileOrBase64;
    } else {
      name = fileOrBase64.name || name;
      base64String = await convertFileToBase64(fileOrBase64);
    }

    const endpoint = resolveApiUrl('/api/ai/parse-resume', baseUrl);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-ghostboard-client': 'desktop-app',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fileBase64: base64String,
        fileName: name,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      // Fallback: try canonical route /api/resume/parse directly if /api/ai/parse-resume failed
      if (res.status === 404) {
        const fallbackEndpoint = resolveApiUrl('/api/resume/parse', baseUrl);
        const fbRes = await fetch(fallbackEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            fileBase64: base64String,
            fileName: name,
          }),
        });
        const fbData = await fbRes.json().catch(() => ({}));
        if (fbRes.ok && fbData.success) {
          return mapParsedApiResponseToProfile(fbData);
        }
      }

      return {
        success: false,
        error: data.error || `Failed to parse resume (HTTP ${res.status})`,
      };
    }

    return mapParsedApiResponseToProfile(data);
  } catch (err: unknown) {
    console.warn('[profileStore] Error calling resume parser API:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error processing resume PDF',
    };
  }
}

function mapParsedApiResponseToProfile(data: Record<string, unknown>): {
  success: boolean;
  profile: Partial<CandidateProfile>;
  modelUsed?: string;
} {
  const p = (data.profile || {}) as Record<string, unknown>;
  const techStack: string[] = Array.isArray(p.techStack) ? (p.techStack as string[]) : [];
  const level = normalizeCandidateLevel(p.level);

  const petProjects: PetProject[] = Array.isArray(p.petProjects)
    ? (p.petProjects as Array<Record<string, unknown>>).map((item, idx: number) => ({
        id: `parsed_proj_${Date.now()}_${idx}`,
        name: (item.name as string) || (item.title as string) || `Project #${idx + 1}`,
        description: (item.description as string) || '',
        keyHighlight: (item.keyHighlight as string) || (item.keyAchievement as string) || '',
      }))
    : [];

  return {
    success: true,
    modelUsed: typeof data.modelUsed === 'string' ? data.modelUsed : undefined,
    profile: {
      role: (typeof p.role === 'string' && p.role) || DEFAULT_CANDIDATE_PROFILE.role,
      experienceLevel: level,
      techStack: techStack.length > 0 ? techStack : DEFAULT_CANDIDATE_PROFILE.techStack,
      primaryStack: techStack.length > 0 ? techStack.join(', ') : DEFAULT_CANDIDATE_PROFILE.primaryStack,
      customBio: (typeof p.cvContext === 'string' && p.cvContext) || (typeof p.summary === 'string' && p.summary) || '',
      petProjects,
      summary: typeof p.summary === 'string' ? p.summary : '',
      cvContext: typeof p.cvContext === 'string' ? p.cvContext : '',
    },
  };
}
