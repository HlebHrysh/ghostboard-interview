'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import {
  X,
  User,
  Plus,
  Trash2,
  Check,
  Code2,
  FolderGit2,
  RotateCcw,
  FileText,
  Briefcase,
  Sparkles,
  UploadCloud,
  ChevronDown,
  ChevronUp,
  Sliders,
  Copy,
  Terminal,
  FileCheck2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useLocale } from '@/contexts/LocaleContext';
import { getModalsTranslations } from '@/lib/modalsI18n';
import type { SupportedLocale } from '@/lib/geoLang';

export type CandidateLevel = 'junior' | 'middle' | 'senior' | 'lead';

export interface PetProject {
  id: string;
  name: string;
  description: string;
  keyHighlight: string;
}

export interface AiDirectives {
  responseLength: 'ultra-concise' | 'structured' | 'bullets';
  toneOfVoice: 'authoritative' | 'pragmatic' | 'star';
  engineeringFocus: 'architecture' | 'clean_code' | 'business_impact';
  guardrails: string[];
  customNuances: string;
}

export interface CandidateProfile {
  name?: string;
  age?: number;
  level?: CandidateLevel;
  role: string;
  targetCompany?: string;
  techStack: string[];
  petProjects: PetProject[];
  customContext: string;
  cvContext?: string;
  jobDescription?: string;
  aiDirectives?: AiDirectives;
  customNuances?: string;
  speakingStyle?: string;
  speakingStyleBrief?: string;
}

export const DEFAULT_AI_DIRECTIVES: AiDirectives = {
  responseLength: 'ultra-concise',
  toneOfVoice: 'authoritative',
  engineeringFocus: 'architecture',
  guardrails: ['no_fluff', 'show_tradeoffs'],
  customNuances: '',
};

export const DEFAULT_CANDIDATE_PROFILE: CandidateProfile = {
  name: 'Candidate',
  age: 26,
  level: 'middle',
  role: 'Full-Stack Developer (React / TypeScript / Node.js)',
  targetCompany: '',
  techStack: [
    'TypeScript', 'JavaScript', 'React', 'Next.js', 'Node.js',
    'PostgreSQL', 'Docker', 'REST API', 'Tailwind CSS', 'Git'
  ],
  petProjects: [
    {
      id: 'proj_default_1',
      name: 'High-Performance Web Platform',
      description: 'Production-ready full-stack application with real-time sync, caching, and clean modular architecture',
      keyHighlight: 'Optimized response times, automated testing, containerized CI/CD workflow',
    },
  ],
  customContext: 'Software Engineer with strong fundamentals in clean architecture, performance optimization, and scalable modern software development.',
  cvContext: '',
  jobDescription: '',
  customNuances: 'Від першого лиця, з реальними кейсами, впевнено і по-простому',
  speakingStyle: '',
  speakingStyleBrief: '',
  aiDirectives: DEFAULT_AI_DIRECTIVES,
};

export interface RolePresetItem extends Partial<CandidateProfile> {
  category: 'frontend' | 'backend' | 'fullstack' | 'mobile' | 'cloud' | 'qa_data' | 'management';
  label: string;
}

export const ROLE_PRESETS: Record<string, RolePresetItem> = {
  frontend: {
    category: 'frontend',
    label: 'Frontend (React / TS)',
    role: 'Frontend Developer (React / Next.js / TypeScript)',
    techStack: [
      'TypeScript', 'JavaScript', 'React 19', 'Next.js (App Router)',
      'Tailwind CSS', 'React Query', 'Zustand', 'Vite',
      'HTML5', 'CSS3', 'REST API', 'GraphQL', 'Webpack', 'Git'
    ],
    petProjects: [
      {
        id: 'fe_p1',
        name: 'High-Performance SaaS Dashboard',
        description: 'Next.js 16 App Router web application with Server Components, Tailwind CSS and Zustand state management',
        keyHighlight: '99/100 Lighthouse performance, sub-50ms client navigation, optimistic mutations'
      }
    ],
    customContext: 'Frontend Engineer focused on modern React, component architecture, rendering performance, TypeScript type safety, and responsive UI design.'
  },
  python_backend: {
    category: 'backend',
    label: 'Python Backend',
    role: 'Python Backend Developer (FastAPI / Django)',
    techStack: [
      'Python', 'FastAPI', 'Django', 'Django REST Framework (DRF)',
      'PostgreSQL', 'SQLAlchemy 2.0', 'Alembic', 'Pydantic v2',
      'Celery', 'Redis', 'Docker', 'Linux', 'Asyncio', 'Git'
    ],
    petProjects: [
      {
        id: 'py_p1',
        name: 'Asynchronous API Microservices',
        description: 'FastAPI microservices with PostgreSQL, Redis caching, and Celery background task queue',
        keyHighlight: 'Sub-30ms response times, B-Tree index optimization, rate limiting with Redis'
      }
    ],
    customContext: 'Python Backend Developer with deep expertise in Asyncio, FastAPI/Django, relational database design (PostgreSQL), background workers, and clean code.'
  },
  nodejs_backend: {
    category: 'backend',
    label: 'Node.js / NestJS',
    role: 'Node.js / NestJS Backend Developer',
    techStack: [
      'TypeScript', 'Node.js', 'NestJS', 'Express', 'Prisma ORM',
      'TypeORM', 'PostgreSQL', 'Redis', 'Docker', 'Microservices',
      'Fastify', 'Jest', 'REST API', 'Git'
    ],
    petProjects: [
      {
        id: 'node_p1',
        name: 'Scalable NestJS Microservice Platform',
        description: 'Modular enterprise architecture with NestJS, Prisma ORM, PostgreSQL and Redis pub/sub',
        keyHighlight: 'Dependency injection, clean hexagonal architecture, automated integration tests'
      }
    ],
    customContext: 'Node.js/TypeScript Backend Engineer experienced in NestJS, Express, microservices, REST/GraphQL APIs, and database performance.'
  },
  java_backend: {
    category: 'backend',
    label: 'Java / Spring Boot',
    role: 'Java / Spring Boot Backend Developer',
    techStack: [
      'Java 21', 'Spring Boot 3', 'Spring Security', 'Hibernate / JPA',
      'PostgreSQL', 'Apache Kafka', 'Redis', 'Docker',
      'Maven', 'Gradle', 'JUnit 5', 'Microservices', 'Git'
    ],
    petProjects: [
      {
        id: 'java_p1',
        name: 'High-Throughput Financial Event Processing',
        description: 'Spring Boot 3 microservice with Kafka event streaming, Hibernate JPA and PostgreSQL',
        keyHighlight: 'Idempotent Kafka consumers, distributed locking with Redis, high-throughput ACID transactions'
      }
    ],
    customContext: 'Java Backend Engineer specializing in Spring Boot, JVM internals, concurrency, Hibernate optimization, and distributed microservices.'
  },
  golang_backend: {
    category: 'backend',
    label: 'Go (Golang)',
    role: 'Go (Golang) Backend Developer',
    techStack: [
      'Go (Golang)', 'Goroutines', 'Channels', 'Gin', 'Fiber',
      'gRPC', 'Protobuf', 'PostgreSQL', 'Redis', 'Docker',
      'Kafka', 'Microservices', 'Linux', 'Git'
    ],
    petProjects: [
      {
        id: 'go_p1',
        name: 'Low-Latency Real-Time Telemetry Engine',
        description: 'High-throughput Go service using Goroutines, worker pools and gRPC streaming',
        keyHighlight: 'Processes 50k+ events/sec with minimal memory allocation and zero GC pauses'
      }
    ],
    customContext: 'Go Engineer with strong focus on high-performance concurrent systems, low-latency microservices, gRPC, and clean idiomatic Go.'
  },
  dotnet_backend: {
    category: 'backend',
    label: '.NET / C# Backend',
    role: '.NET / C# Backend Developer',
    techStack: [
      'C#', '.NET 8/9', 'ASP.NET Core', 'Entity Framework Core',
      'LINQ', 'SQL Server', 'Azure', 'Docker', 'Redis',
      'MediatR', 'Clean Architecture', 'Git'
    ],
    petProjects: [
      {
        id: 'net_p1',
        name: 'Enterprise Billing & Subscription Platform',
        description: 'ASP.NET Core Web API with Clean Architecture, EF Core, and MediatR CQRS pattern',
        keyHighlight: 'Asynchronous event handling, compiled EF queries, resilient Azure cloud deployment'
      }
    ],
    customContext: '.NET/C# Developer focused on ASP.NET Core, CQRS/Clean Architecture, Entity Framework optimization, and scalable enterprise cloud services.'
  },
  fullstack: {
    category: 'fullstack',
    label: 'Full-Stack Developer',
    role: 'Full-Stack Developer (React / Node / Python)',
    techStack: [
      'TypeScript', 'JavaScript', 'React', 'Next.js', 'Node.js',
      'Python', 'PostgreSQL', 'Docker', 'Tailwind CSS',
      'REST API', 'GraphQL', 'Git'
    ],
    petProjects: [
      {
        id: 'fs_p1',
        name: 'Collaborative Workspace Platform',
        description: 'Real-time multi-tenant SaaS with Next.js frontend, Node/Python API, and PostgreSQL',
        keyHighlight: 'WebSocket synchronization, optimistic UI updates, containerized CI/CD workflow'
      }
    ],
    customContext: 'Full-Stack Software Engineer bridging modern React/TypeScript frontends with robust backend APIs, databases, and containerized deployments.'
  },
  ios_mobile: {
    category: 'mobile',
    label: 'iOS (Swift / SwiftUI)',
    role: 'iOS Developer (Swift / SwiftUI)',
    techStack: [
      'Swift', 'SwiftUI', 'UIKit', 'Combine', 'CoreData',
      'Swift Concurrency', 'Xcode', 'MVVM', 'TestFlight', 'Git'
    ],
    petProjects: [
      {
        id: 'ios_p1',
        name: 'Offline-First iOS Productivity App',
        description: 'Modern SwiftUI application with Swift Concurrency, CoreData persistence and Combine reactive bindings',
        keyHighlight: '60fps smooth scrolling, background sync, dynamic Island and widget integration'
      }
    ],
    customContext: 'iOS Developer creating polished, native mobile applications with SwiftUI, Swift Concurrency, clean MVVM architecture, and Apple HIG guidelines.'
  },
  android_mobile: {
    category: 'mobile',
    label: 'Android (Kotlin)',
    role: 'Android Developer (Kotlin / Jetpack Compose)',
    techStack: [
      'Kotlin', 'Jetpack Compose', 'Coroutines', 'Flow', 'Retrofit',
      'Room', 'Hilt / Dagger', 'Clean Architecture', 'MVI / MVVM', 'Git'
    ],
    petProjects: [
      {
        id: 'and_p1',
        name: 'Social Fitness Android App',
        description: 'Jetpack Compose app with Kotlin Coroutines/Flow, Room database and Hilt dependency injection',
        keyHighlight: 'Unidirectional data flow (MVI), offline cache-first architecture, smooth declarative UI'
      }
    ],
    customContext: 'Android Engineer specializing in modern native Android development with Jetpack Compose, Kotlin Coroutines, and clean architectural patterns.'
  },
  flutter_mobile: {
    category: 'mobile',
    label: 'Flutter / Cross-Platform',
    role: 'Cross-Platform Mobile Developer (Flutter / React Native)',
    techStack: [
      'Flutter', 'Dart', 'React Native', 'TypeScript', 'BLoC',
      'Provider', 'Riverpod', 'REST API', 'SQLite', 'Firebase', 'Git'
    ],
    petProjects: [
      {
        id: 'fl_p1',
        name: 'Cross-Platform FinTech Wallet',
        description: 'Flutter application with BLoC state management, biometric auth, and local SQLite caching',
        keyHighlight: 'Unified 100% shared code for iOS and Android, 60fps animations'
      }
    ],
    customContext: 'Mobile Developer specializing in cross-platform mobile apps with Flutter and React Native.'
  },
  devops: {
    category: 'cloud',
    label: 'DevOps / SRE',
    role: 'DevOps / Infrastructure Engineer',
    techStack: [
      'Kubernetes', 'Docker', 'Terraform', 'AWS', 'GCP',
      'CI/CD', 'GitHub Actions', 'Prometheus', 'Grafana', 'Linux', 'Bash', 'Git'
    ],
    petProjects: [
      {
        id: 'do_p1',
        name: 'GitOps Multi-Cluster Infrastructure',
        description: 'Declarative Kubernetes cluster deployment with Terraform, ArgoCD and automated monitoring',
        keyHighlight: 'Zero-downtime rolling updates, automated canary deployments, sub-1s alert resolution'
      }
    ],
    customContext: 'DevOps Engineer focused on Kubernetes orchestration, immutable infrastructure-as-code, high-availability architecture, and observability.'
  },
  qa_automation: {
    category: 'cloud',
    label: 'QA Automation Engineer',
    role: 'QA Automation Engineer (Python / TS)',
    techStack: [
      'Playwright', 'Cypress', 'Selenium', 'TypeScript', 'Python',
      'Pytest', 'Jest', 'Allure', 'Docker', 'CI/CD', 'Git'
    ],
    petProjects: [
      {
        id: 'qa_p1',
        name: 'Enterprise End-to-End Test Framework',
        description: 'Parallelized Playwright test automation suite integrated with GitHub Actions and Allure reports',
        keyHighlight: 'Reduced test run from 45m to 4m with parallel sharding, 99.8% test stability'
      }
    ],
    customContext: 'QA Automation Engineer designing robust test automation frameworks for Web and API.'
  },
  data_engineer: {
    category: 'qa_data',
    label: 'Data Engineer',
    role: 'Data Engineer (Python / Spark / SQL)',
    techStack: [
      'Python', 'Apache Spark', 'Airflow', 'SQL', 'PostgreSQL',
      'ClickHouse', 'Kafka', 'dbt', 'Docker', 'AWS S3', 'Git'
    ],
    petProjects: [
      {
        id: 'de_p1',
        name: 'Real-Time Event Streaming ETL Pipeline',
        description: 'Kafka event ingestion to ClickHouse and PostgreSQL with dbt transformation models',
        keyHighlight: 'Processes 250M daily events with sub-second analytical query response'
      }
    ],
    customContext: 'Data Engineer building scalable data pipelines, streaming architectures, and analytics infrastructure.'
  },
  data_science: {
    category: 'qa_data',
    label: 'Data Scientist / ML Engineer',
    role: 'Data Scientist / Machine Learning Engineer',
    techStack: [
      'Python', 'PyTorch', 'TensorFlow', 'Scikit-Learn', 'Pandas',
      'NumPy', 'FastAPI', 'MLflow', 'Docker', 'SQL', 'Git'
    ],
    petProjects: [
      {
        id: 'ds_p1',
        name: 'Production LLM Embedding & Retrieval System',
        description: 'Semantic vector search pipeline with FAISS, Sentence Transformers and FastAPI inference server',
        keyHighlight: 'Sub-20ms retrieval over 1M documents, automated MLflow model evaluation'
      }
    ],
    customContext: 'ML Engineer specializing in practical machine learning, deep learning models, embeddings, and MLOps.'
  },
  system_architect: {
    category: 'management',
    label: 'Solutions / System Architect',
    role: 'System Architect / Enterprise Solutions Architect',
    techStack: [
      'System Architecture', 'Microservices', 'Event-Driven Architecture', 'Cloud Architecture (AWS/GCP)',
      'High-Load', 'Distributed Systems', 'PostgreSQL', 'Kafka', 'Docker', 'Kubernetes', 'Security'
    ],
    petProjects: [
      {
        id: 'sa_p1',
        name: 'High-Availability Distributed Banking Core',
        description: 'Event-driven architecture with CQRS, event sourcing, distributed transactions, and active-active DR',
        keyHighlight: '99.999% uptime SLA, sub-25ms global transactions, zero data loss guarantee'
      }
    ],
    customContext: 'System Architect designing resilient, distributed, high-throughput software architectures.'
  },
  product_manager: {
    category: 'management',
    label: 'Technical Product Manager',
    role: 'Technical Product Manager (TPM)',
    techStack: [
      'Product Strategy', 'Agile / Scrum', 'Roadmapping', 'User Research',
      'SQL', 'Data Analytics', 'A/B Testing', 'System Architecture Fundamentals', 'Jira'
    ],
    petProjects: [
      {
        id: 'pm_p1',
        name: 'Self-Serve B2B Onboarding Engine',
        description: 'End-to-end redesign of enterprise customer onboarding flow with data-driven funnel optimization',
        keyHighlight: 'Increased activation rate by 34% and reduced time-to-first-value from 14 days to 2 hours'
      }
    ],
    customContext: 'Technical Product Manager aligning product discovery, engineering delivery, metrics, and business ROI.'
  },
  uiux_designer: {
    category: 'management',
    label: 'UI/UX Product Designer',
    role: 'Lead UI/UX & Product Designer',
    techStack: [
      'Figma', 'Design Systems', 'User Research', 'Prototyping',
      'Design Tokens', 'HTML/CSS Basics', 'Usability Testing', 'Interaction Design'
    ],
    petProjects: [
      {
        id: 'ux_p1',
        name: 'Enterprise Design System & Dashboard Redesign',
        description: 'Comprehensive design system in Figma with 50+ reusable components, tokens, and WCAG AA accessibility',
        keyHighlight: 'Boosted design-to-development velocity by 40% and improved usability task success to 95%'
      }
    ],
    customContext: 'Product Designer bridging user empathy, data-driven UX research, design systems, and pixel-perfect UI execution.'
  },
  cybersecurity: {
    category: 'management',
    label: 'Cybersecurity Engineer',
    role: 'Cybersecurity / AppSec Engineer',
    techStack: [
      'OWASP Top 10', 'AppSec', 'Penetration Testing', 'Network Security',
      'Cryptography', 'IAM', 'SOC2 / ISO 27001', 'SIEM / Splunk', 'Burp Suite', 'Linux', 'Docker', 'Git'
    ],
    petProjects: [
      {
        id: 'sec_p1',
        name: 'Automated CI/CD Vulnerability & SAST/DAST Pipeline',
        description: 'Security scanning integration into CI/CD using Semgrep, Trivy, and OWASP ZAP automation',
        keyHighlight: 'Automated remediation of CVEs before deployment, zero critical vulnerabilities in production'
      }
    ],
    customContext: 'Security Engineer with strong foundation in application security (AppSec), threat modeling, secure code review, and cloud infrastructure hardening.'
  },
};

const STORAGE_KEY = 'ghostboard_candidate_profile';

export function getStoredCandidateProfile(): CandidateProfile {
  if (typeof window === 'undefined') return DEFAULT_CANDIDATE_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CANDIDATE_PROFILE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CANDIDATE_PROFILE,
      ...parsed,
      level: (parsed.level as CandidateLevel) || 'middle',
      customNuances: parsed.customNuances || parsed.aiDirectives?.customNuances || DEFAULT_CANDIDATE_PROFILE.customNuances,
      speakingStyle: parsed.speakingStyle || '',
      speakingStyleBrief: parsed.speakingStyleBrief || '',
      petProjects: Array.isArray(parsed.petProjects) ? parsed.petProjects : DEFAULT_CANDIDATE_PROFILE.petProjects,
      techStack: Array.isArray(parsed.techStack) ? parsed.techStack : DEFAULT_CANDIDATE_PROFILE.techStack,
      aiDirectives: {
        ...DEFAULT_AI_DIRECTIVES,
        ...(parsed.aiDirectives || {}),
      },
    };
  } catch {
    return DEFAULT_CANDIDATE_PROFILE;
  }
}

/**
 * Compiles user's behavioral chips and custom wishes into the final system prompt directive.
 */
export function compileAiDirectivesToPrompt(directives: AiDirectives, role: string, level: CandidateLevel): string {
  const parts: string[] = [];

  // Length directive
  if (directives.responseLength === 'ultra-concise') {
    parts.push('• LENGTH: ULTRA-CONCISE (1-2 punchy sentences, zero filler, immediate spoken punchline).');
  } else if (directives.responseLength === 'bullets') {
    parts.push('• STRUCTURE: BULLET POINTS ONLY (3 structured bullets with bold technical keywords).');
  } else {
    parts.push('• STRUCTURE: STRUCTURED & IN-DEPTH (Clear opening summary + technical architecture breakdown).');
  }

  // Tone directive
  if (directives.toneOfVoice === 'authoritative') {
    parts.push(`• TONE: AUTHORITATIVE ${level.toUpperCase()} ARCHITECT (Deep confidence, reference trade-offs and runtime internals).`);
  } else if (directives.toneOfVoice === 'pragmatic') {
    parts.push('• TONE: PRAGMATIC & DIRECT (No textbook definitions, focus strictly on practical production experience).');
  } else {
    parts.push('• TONE: STAR METHOD STORYTELLER (Situation, Task, Action taken, measurable Result).');
  }

  // Engineering focus
  if (directives.engineeringFocus === 'architecture') {
    parts.push('• FOCUS: SYSTEM ARCHITECTURE & BOTTLENECK MITIGATION (Latency, caching, concurrency, scalability).');
  } else if (directives.engineeringFocus === 'clean_code') {
    parts.push('• FOCUS: CLEAN CODE & ALGORITHMIC RIGOR (Type safety, SOLID principles, complexity, modular design).');
  } else {
    parts.push('• FOCUS: BUSINESS IMPACT & VELOCITY (Product delivery, ROI, failure recovery, maintainability).');
  }

  // Guardrails
  if (directives.guardrails?.includes('no_fluff')) {
    parts.push('• GUARDRAIL: STRICTLY FORBIDDEN: "Sure!", "Great question!", "Under the hood", "Basically", "In essence".');
  }
  if (directives.guardrails?.includes('challenge_weak')) {
    parts.push('• GUARDRAIL: CHALLENGE WEAK ASSUMPTIONS: Politely clarify edge cases or suboptimal problem framings.');
  }
  if (directives.guardrails?.includes('show_tradeoffs')) {
    parts.push('• GUARDRAIL: ALWAYS STATE TRADE-OFFS: Mention pros vs. cons of chosen data structures or libraries.');
  }

  // Custom nuances
  if (directives.customNuances?.trim()) {
    parts.push(`• CUSTOM CANDIDATE DIRECTIVES: ${directives.customNuances.trim()}`);
  }

  return parts.join('\n');
}

interface CandidateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (profile: CandidateProfile) => void;
  locale?: SupportedLocale;
}

export default function CandidateProfileModal({
  isOpen,
  onClose,
  onSave,
  locale: propLocale,
}: CandidateProfileModalProps) {
  const { locale: contextLocale } = useLocale();
  const activeLocale = propLocale || contextLocale;
  const pr = getModalsTranslations(activeLocale).profile;

  const [profile, setProfile] = useState<CandidateProfile>(DEFAULT_CANDIDATE_PROFILE);
  const [activeTab, setActiveTab] = useState<'role' | 'projects' | 'context' | 'persona'>('role');
  const [selectedPresetKey, setSelectedPresetKey] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  // Resume Ingestion & Scanner state
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [uploadScanStep, setUploadScanStep] = useState<string>('');
  const [parseBannerInfo, setParseBannerInfo] = useState<{
    role: string;
    skillsCount: number;
    projectsCount: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredCandidateProfile();
      setProfile(stored);
      if (stored.petProjects.length > 0) {
        setExpandedProjectId(stored.petProjects[0].id);
      }
    }
  }, [isOpen]);

  // Auto-save draft changes to localStorage so closing never loses progress
  useEffect(() => {
    if (!isOpen) return;
    try {
      localStorage.setItem(`${STORAGE_KEY}_draft`, JSON.stringify(profile));
    } catch {}
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    try {
      const compiled = compileAiDirectivesToPrompt(
        profile.aiDirectives || DEFAULT_AI_DIRECTIVES,
        profile.role,
        profile.level || 'middle'
      );
      const profileToSave: CandidateProfile = {
        ...profile,
        customContext: `${profile.customContext || ''}\n\n[COMPILED AI DIRECTIVES]\n${compiled}`.trim(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profileToSave));
      localStorage.removeItem(`${STORAGE_KEY}_draft`);
      onSave?.(profileToSave);
      toast.success(pr.toastSaved || 'Profile context saved & synced to Copilot');
      onClose();
    } catch {
      toast.error('Error saving profile');
    }
  };

  const handleReset = () => {
    setProfile(DEFAULT_CANDIDATE_PROFILE);
    setSelectedPresetKey(null);
    setParseBannerInfo(null);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CANDIDATE_PROFILE));
    toast.info(pr.toastReset || 'Profile restored to defaults');
  };

  const applyPreset = (key: string, p: RolePresetItem) => {
    setSelectedPresetKey(key);
    setProfile((prev) => ({
      ...prev,
      role: p.role || prev.role,
      techStack: p.techStack ? [...p.techStack] : prev.techStack,
      petProjects: p.petProjects ? [...p.petProjects] : prev.petProjects,
      customContext: p.customContext || prev.customContext,
    }));
    toast.success(`Applied template: ${p.label}`);
  };

  const handleAddTag = () => {
    const clean = newTagInput.trim().replace(/^,+|,+$/g, '');
    if (!clean) return;
    if (!profile.techStack.includes(clean)) {
      setProfile((prev) => ({
        ...prev,
        techStack: [...prev.techStack, clean],
      }));
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setProfile((prev) => ({
      ...prev,
      techStack: prev.techStack.filter((t) => t !== tag),
    }));
  };

  const handleAddProject = () => {
    const newId = `proj_${Date.now()}`;
    const newProj: PetProject = {
      id: newId,
      name: 'New Technical Project',
      description: 'Distributed microservices architecture with automated pipeline and caching',
      keyHighlight: 'Sub-40ms response latency under 10k RPS load',
    };
    setProfile((prev) => ({
      ...prev,
      petProjects: [newProj, ...prev.petProjects],
    }));
    setExpandedProjectId(newId);
  };

  const handleCloneProject = (proj: PetProject) => {
    const clonedId = `proj_${Date.now()}`;
    const cloned: PetProject = {
      ...proj,
      id: clonedId,
      name: `${proj.name} (Copy)`,
    };
    setProfile((prev) => ({
      ...prev,
      petProjects: [cloned, ...prev.petProjects],
    }));
    setExpandedProjectId(clonedId);
    toast.info('Project duplicated');
  };

  const handleUpdateProject = (id: string, field: keyof PetProject, value: string) => {
    setProfile((prev) => ({
      ...prev,
      petProjects: prev.petProjects.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    }));
  };

  const handleDeleteProject = (id: string) => {
    setProfile((prev) => ({
      ...prev,
      petProjects: prev.petProjects.filter((p) => p.id !== id),
    }));
  };

  // PDF Upload & Extraction Handler
  const processPdfFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files are supported (up to 15MB)');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('File exceeds 15MB limit');
      return;
    }

    setIsUploadingPdf(true);
    setUploadScanStep('Reading document binary stream...');

    try {
      const stepTimer1 = setTimeout(() => setUploadScanStep('Extracting experience & candidate background...'), 700);
      const stepTimer2 = setTimeout(() => setUploadScanStep('Detecting tech stack & competencies...'), 1600);
      const stepTimer3 = setTimeout(() => setUploadScanStep('Structuring pet projects & CV summary...'), 2400);

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/resume/parse', {
        method: 'POST',
        body: formData,
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to extract resume');
      }

      const p = data.profile;
      startTransition(() => {
        setProfile((prev) => ({
          ...prev,
          role: p.role || prev.role,
          level: p.level || prev.level,
          techStack: Array.isArray(p.techStack) && p.techStack.length > 0 ? p.techStack : prev.techStack,
          cvContext: p.cvContext || prev.cvContext,
          petProjects: Array.isArray(p.petProjects) && p.petProjects.length > 0
            ? p.petProjects.map((item: any, idx: number) => ({
                id: `parsed_proj_${Date.now()}_${idx}`,
                name: item.name || item.title || `Project #${idx + 1}`,
                description: item.description || '',
                keyHighlight: item.keyHighlight || item.keyAchievement || '',
              }))
            : prev.petProjects,
        }));

        setParseBannerInfo({
          role: p.role,
          skillsCount: p.techStack?.length || 0,
          projectsCount: p.petProjects?.length || 0,
        });
      });

      toast.success('Resume parsed & profile populated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Could not parse resume. Try pasting text directly into CV tab.');
    } finally {
      setIsUploadingPdf(false);
      setUploadScanStep('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processPdfFile(e.dataTransfer.files[0]);
    }
  };

  const POPULAR_SUGGESTIONS = [
    'Docker', 'PostgreSQL', 'Redis', 'Kubernetes', 'AWS', 'Kafka',
    'GraphQL', 'Tailwind CSS', 'Git', 'CI/CD', 'TypeScript', 'Next.js'
  ];

  const QUICK_ROLES = [
    { key: 'fullstack', label: 'Full-Stack' },
    { key: 'frontend', label: 'Frontend' },
    { key: 'python_backend', label: 'Python' },
    { key: 'nodejs_backend', label: 'Node.js' },
    { key: 'golang_backend', label: 'Go' },
    { key: 'devops', label: 'DevOps' },
  ];

  const currentCompiledPrompt = compileAiDirectivesToPrompt(
    profile.aiDirectives || DEFAULT_AI_DIRECTIVES,
    profile.role,
    profile.level || 'middle'
  );

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-2xl animate-in fade-in duration-200">
      {/* Outer Obsidian Modal Window */}
      <div className="relative w-full max-w-4xl bg-black border border-white/[0.12] rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_30px_rgba(255,255,255,0.03)] text-zinc-100 max-h-[92dvh] flex flex-col overflow-hidden ring-1 ring-white/[0.05]">
        
        {/* Subtle Kinetic Pinstripe Canvas Layer */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.035]"
          style={{
            backgroundImage: 'repeating-linear-gradient(to right, rgba(255,255,255,0.8) 0px, rgba(255,255,255,0.8) 1px, transparent 1px, transparent 32px)',
            maskImage: 'radial-gradient(ellipse 90% 80% at 50% 20%, black 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 50% 20%, black 40%, transparent 100%)',
          }}
        />

        {/* Modal Header */}
        <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#07070b]/90 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-zinc-200 shadow-inner">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                  Interview Context & Resume Configuration
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-white/10 text-zinc-300 border border-white/10">
                  {profile.level || 'middle'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Calibrate real-time Copilot answers, upload your CV, and tune response directives.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer border border-transparent hover:border-white/10"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* AI Parse Banner (shows when auto-fill finishes) */}
        {parseBannerInfo && (
          <div className="relative z-10 px-6 py-2.5 bg-zinc-900/90 border-b border-white/15 flex items-center justify-between text-xs animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-zinc-200">
              <FileCheck2 className="w-4 h-4 text-white" />
              <span>
                Detected <strong className="text-white">{parseBannerInfo.role}</strong> with{' '}
                <strong className="text-white">{parseBannerInfo.skillsCount} skills</strong> and{' '}
                <strong className="text-white">{parseBannerInfo.projectsCount} projects</strong>.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setParseBannerInfo(null)}
              className="text-[11px] font-mono text-zinc-400 hover:text-white underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Fluid Animated Sliding Pill Dock */}
        <div className="relative z-10 px-6 py-2.5 bg-[#050508]/90 border-b border-white/[0.08] flex-shrink-0">
          <div className="flex bg-[#0a0a0f] p-1 rounded-xl border border-white/[0.07] gap-1 relative">
            {[
              { id: 'role', label: 'Target Role', icon: Code2, count: profile.techStack.length },
              { id: 'projects', label: 'Pet Projects', icon: FolderGit2, count: profile.petProjects.length },
              { id: 'context', label: 'Resume & Vacancy', icon: FileText, hasDot: Boolean(profile.cvContext || profile.jobDescription) },
              { id: 'persona', label: 'AI Persona & Directives', icon: Sliders, badge: 'PRO' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-2 z-10 ${
                    isActive ? 'text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-modal-tab"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      className="absolute inset-0 bg-white/[0.12] rounded-lg border border-white/20 shadow-sm z-[-1]"
                    />
                  )}
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-zinc-500'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                  {tab.hasDot && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                  )}
                  {tab.badge && (
                    <span className="text-[9px] font-mono px-1 py-0.2 bg-white/10 text-zinc-300 rounded border border-white/10">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="relative z-10 flex-1 overflow-y-auto px-6 py-5 space-y-6 custom-scrollbar bg-black/60">
          <AnimatePresence mode="wait">
            
            {/* TAB 1: TARGET ROLE & INTERVIEW */}
            {activeTab === 'role' && (
              <motion.div
                key="tab-role"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {/* Vacancy Target Input & Role Presets */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-white flex items-center gap-2">
                        <Briefcase className="w-3.5 h-3.5 text-zinc-300" />
                        <span>Target Position & Vacancy</span>
                      </label>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Define your exact position, company, or target domain.
                      </p>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={profile.role}
                    onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                    placeholder="e.g. Senior Backend Engineer (FastAPI / PostgreSQL) at Revolut"
                    className="w-full bg-[#0a0a0f] border border-white/10 hover:border-white/20 focus:border-white/50 focus:ring-1 focus:ring-white/20 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all shadow-inner font-sans"
                  />

                  {/* 1-Click Quick Presets */}
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                      <span>Quick Role Templates:</span>
                      <span className="text-zinc-500">Auto-fills stack & projects</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {QUICK_ROLES.map(({ key, label }) => {
                        const preset = ROLE_PRESETS[key];
                        if (!preset) return null;
                        const isSelected = selectedPresetKey === key || profile.role === preset.role;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => applyPreset(key, preset)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-sans transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-white text-zinc-950 font-bold shadow-sm ring-1 ring-white/50'
                                : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08]'
                            }`}
                          >
                            <span>{label}</span>
                            {isSelected && <Check className="w-3 h-3 text-zinc-950 stroke-[3]" />}
                          </button>
                        );
                      })}

                      {/* Dropdown for All 18 Roles */}
                      <select
                        value={selectedPresetKey || ''}
                        onChange={(e) => {
                          const key = e.target.value;
                          if (key && ROLE_PRESETS[key]) {
                            applyPreset(key, ROLE_PRESETS[key]);
                          }
                        }}
                        className="bg-zinc-950 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none cursor-pointer hover:border-white/30"
                      >
                        <option value="">— All 18 roles —</option>
                        <optgroup label="Frontend & Full-Stack">
                          <option value="frontend">{ROLE_PRESETS.frontend.label}</option>
                          <option value="fullstack">{ROLE_PRESETS.fullstack.label}</option>
                        </optgroup>
                        <optgroup label="Backend Development">
                          <option value="python_backend">{ROLE_PRESETS.python_backend.label}</option>
                          <option value="nodejs_backend">{ROLE_PRESETS.nodejs_backend.label}</option>
                          <option value="java_backend">{ROLE_PRESETS.java_backend.label}</option>
                          <option value="golang_backend">{ROLE_PRESETS.golang_backend.label}</option>
                          <option value="dotnet_backend">{ROLE_PRESETS.dotnet_backend.label}</option>
                        </optgroup>
                        <optgroup label="Mobile Development">
                          <option value="ios_mobile">{ROLE_PRESETS.ios_mobile.label}</option>
                          <option value="android_mobile">{ROLE_PRESETS.android_mobile.label}</option>
                          <option value="flutter_mobile">{ROLE_PRESETS.flutter_mobile.label}</option>
                        </optgroup>
                        <optgroup label="Cloud, DevOps & QA">
                          <option value="devops">{ROLE_PRESETS.devops.label}</option>
                          <option value="qa_automation">{ROLE_PRESETS.qa_automation.label}</option>
                        </optgroup>
                        <optgroup label="Data & Machine Learning">
                          <option value="data_engineer">{ROLE_PRESETS.data_engineer.label}</option>
                          <option value="data_science">{ROLE_PRESETS.data_science.label}</option>
                        </optgroup>
                        <optgroup label="Architecture & Management">
                          <option value="system_architect">{ROLE_PRESETS.system_architect.label}</option>
                          <option value="product_manager">{ROLE_PRESETS.product_manager.label}</option>
                          <option value="uiux_designer">{ROLE_PRESETS.uiux_designer.label}</option>
                          <option value="cybersecurity">{ROLE_PRESETS.cybersecurity.label}</option>
                        </optgroup>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Seniority / Grade Level Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 block">
                    Experience Level (Seniority Grade):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: 'junior', label: 'Junior', sub: '1-2 yrs', age: 22 },
                      { id: 'middle', label: 'Middle', sub: '2-4 yrs', age: 25 },
                      { id: 'senior', label: 'Senior', sub: '5+ yrs', age: 29 },
                      { id: 'lead', label: 'Lead / Arch', sub: 'Staff / Tech Lead', age: 34 },
                    ].map((lvl) => {
                      const isSelected = (profile.level || 'middle') === lvl.id;
                      return (
                        <button
                          key={lvl.id}
                          type="button"
                          onClick={() => setProfile({ ...profile, level: lvl.id as CandidateLevel, age: lvl.age })}
                          className={`py-2.5 px-3 rounded-xl text-xs font-medium transition-all text-center cursor-pointer border ${
                            isSelected
                              ? 'bg-white/15 border-white text-white font-bold shadow-[0_0_25px_rgba(255,255,255,0.18)]'
                              : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="font-semibold">{lvl.label}</div>
                          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{lvl.sub}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tech Stack Tags Cloud & Keyboard-First Input */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                      <span>Tech Stack Competencies:</span>
                      <span className="text-zinc-200 font-mono text-[11px] bg-white/10 px-1.5 py-0.5 rounded">
                        {profile.techStack.length}
                      </span>
                    </label>
                    <span className="text-[11px] text-zinc-500 font-mono">Press [Enter] or [,] to add tag</span>
                  </div>

                  {/* Active Tags Flow */}
                  <div className="flex flex-wrap gap-1.5 min-h-[46px] p-3 rounded-xl bg-[#0a0a0f] border border-white/10 items-center">
                    {profile.techStack.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-white/[0.08] text-zinc-200 border border-white/10 hover:border-white/20 transition-colors"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-zinc-400 hover:text-white font-bold px-0.5 rounded cursor-pointer transition-colors"
                          title="Remove tag"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {profile.techStack.length === 0 && (
                      <span className="text-xs text-zinc-500 italic">No skills listed yet. Add skills below or upload your CV.</span>
                    )}
                  </div>

                  {/* Add Tag Row */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.includes(',')) {
                          handleAddTag();
                        } else {
                          setNewTagInput(val);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        } else if (e.key === 'Backspace' && newTagInput === '' && profile.techStack.length > 0) {
                          handleRemoveTag(profile.techStack[profile.techStack.length - 1]);
                        }
                      }}
                      placeholder="Add technology (e.g. Kubernetes, gRPC, ClickHouse)..."
                      className="flex-1 bg-[#0a0a0f] border border-white/10 hover:border-white/20 focus:border-white/50 rounded-xl px-3.5 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-white border border-white/15 flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>

                  {/* Quick Inline Suggestions */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                    <span className="text-[11px] text-zinc-400">Popular:</span>
                    {POPULAR_SUGGESTIONS.filter((item) => !profile.techStack.includes(item)).slice(0, 8).map((sugg) => (
                      <button
                        key={sugg}
                        type="button"
                        onClick={() => {
                          setProfile((prev) => ({
                            ...prev,
                            techStack: [...prev.techStack, sugg],
                          }));
                        }}
                        className="text-[11px] font-mono text-zinc-400 hover:text-white hover:bg-white/5 border border-white/5 rounded px-2 py-0.5 cursor-pointer transition-colors"
                      >
                        +{sugg}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live AI Calibration Card */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-xs flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-white shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-semibold text-zinc-200">
                      Live AI Calibration Preview:
                    </div>
                    <p className="text-zinc-300 text-[11px] leading-relaxed">
                      Copilot will tune depth of architecture, internal memory mechanics, and edge cases for a{' '}
                      <strong className="text-white">{(profile.level || 'middle').toUpperCase()}</strong> level in{' '}
                      <strong className="text-white">&ldquo;{profile.role || 'Software Engineer'}&rdquo;</strong>.
                      Answers will organically ground themselves in your active stack ({profile.techStack.slice(0, 6).join(', ')}).
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: PET PROJECTS & REAL CASES */}
            {activeTab === 'projects' && (
              <motion.div
                key="tab-projects"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
                    Copilot weaves these projects as real-world proof points during architectural and behavioral questions.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddProject}
                    className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-white border border-white/15 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Project</span>
                  </button>
                </div>

                {profile.petProjects.length === 0 ? (
                  <div className="text-center py-12 px-4 rounded-2xl bg-white/[0.02] border border-white/10">
                    <FolderGit2 className="w-9 h-9 text-zinc-600 mx-auto mb-2" />
                    <p className="text-xs text-zinc-400 mb-4">No pet projects added yet.</p>
                    <button
                      type="button"
                      onClick={handleAddProject}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-white border border-white/20 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create First Project</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {profile.petProjects.map((proj, idx) => {
                      const isExpanded = expandedProjectId === proj.id;
                      return (
                        <div
                          key={proj.id}
                          className="rounded-xl bg-[#0a0a0f] border border-white/10 overflow-hidden transition-all"
                        >
                          {/* Accordion Summary Bar */}
                          <div
                            onClick={() => setExpandedProjectId(isExpanded ? null : proj.id)}
                            className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <span className="text-xs font-mono text-zinc-500">#{idx + 1}</span>
                              <div className="truncate">
                                <span className="text-xs font-semibold text-zinc-200 mr-2">{proj.name || 'Untitled Project'}</span>
                                {proj.keyHighlight && (
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5">
                                    {proj.keyHighlight.slice(0, 45)}...
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleCloneProject(proj)}
                                title="Duplicate project"
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProject(proj.id)}
                                title="Delete project"
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setExpandedProjectId(isExpanded ? null : proj.id)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
                              >
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          {/* Accordion Expanded Fields */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="px-4 pb-4 pt-1 border-t border-white/[0.06] space-y-3"
                              >
                                <div>
                                  <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                                    Project Name:
                                  </label>
                                  <input
                                    type="text"
                                    value={proj.name}
                                    onChange={(e) => handleUpdateProject(proj.id, 'name', e.target.value)}
                                    placeholder="e.g. Distributed Event-Driven Broker"
                                    className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/40"
                                  />
                                </div>

                                <div>
                                  <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                                    Architecture & Problem Solved:
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={proj.description}
                                    onChange={(e) => handleUpdateProject(proj.id, 'description', e.target.value)}
                                    placeholder="What it does, core challenges, and technologies utilized"
                                    className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none focus:border-white/40 leading-relaxed font-sans"
                                  />
                                </div>

                                <div>
                                  <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                                    Key Metric / Technical Achievement (What AI Highlights):
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={proj.keyHighlight}
                                    onChange={(e) => handleUpdateProject(proj.id, 'keyHighlight', e.target.value)}
                                    placeholder="e.g. Optimized DB query latency by 85% with Redis caching and composite B-tree indices"
                                    className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none focus:border-white/40 leading-relaxed font-sans"
                                  />
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 3: RESUME & VACANCY CONTEXT */}
            {activeTab === 'context' && (
              <motion.div
                key="tab-context"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {/* PDF Ingestion Dropzone Card with Laser Scanner */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`relative overflow-hidden rounded-2xl border-2 border-dashed p-6 transition-all text-center ${
                    isDragging
                      ? 'border-white bg-white/[0.08]'
                      : 'border-white/15 bg-white/[0.02] hover:border-white/30'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        processPdfFile(e.target.files[0]);
                      }
                    }}
                  />

                  {/* Animated Laser Sweep Line during Upload */}
                  {isUploadingPdf && (
                    <motion.div
                      className="absolute inset-x-0 h-[2px] bg-white shadow-[0_0_15px_rgba(255,255,255,1)] z-20"
                      initial={{ top: '0%' }}
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                    />
                  )}

                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white mb-1 shadow-inner">
                      {isUploadingPdf ? (
                        <Sparkles className="w-5 h-5 text-white animate-spin" />
                      ) : (
                        <UploadCloud className="w-5 h-5 text-white" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-white tracking-tight">
                        {isUploadingPdf ? 'Scanning & Structuring Resume...' : 'Drop your PDF Resume here or click to browse'}
                      </h4>
                      <p className="text-xs text-zinc-400">
                        {isUploadingPdf
                          ? uploadScanStep || 'Analyzing CV structure...'
                          : 'Supports PDF up to 15MB. Automatically populates target role, skills, pet projects & CV context.'}
                      </p>
                    </div>

                    {!isUploadingPdf && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 cursor-pointer transition-colors shadow-sm"
                      >
                        Select PDF File
                      </button>
                    )}
                  </div>
                </div>

                {/* Dual Context Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Job Description */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                      <span>Job Description / Requirements:</span>
                      <span className="text-[10px] font-mono text-zinc-500">Optional</span>
                    </label>
                    <textarea
                      rows={5}
                      value={profile.jobDescription || ''}
                      onChange={(e) => setProfile({ ...profile, jobDescription: e.target.value })}
                      placeholder="Paste vacancy requirements here. Copilot will directly target employer expectations."
                      className="w-full bg-[#0a0a0f] border border-white/10 hover:border-white/20 focus:border-white/40 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none leading-relaxed font-sans"
                    />
                  </div>

                  {/* CV Context */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                      <span>CV Narrative & Background:</span>
                      <span className="text-[10px] font-mono text-zinc-500">Auto-filled by PDF</span>
                    </label>
                    <textarea
                      rows={5}
                      value={profile.cvContext || ''}
                      onChange={(e) => setProfile({ ...profile, cvContext: e.target.value })}
                      placeholder="Resume summary or career achievements. AI will quote real milestones from your biography."
                      className="w-full bg-[#0a0a0f] border border-white/10 hover:border-white/20 focus:border-white/40 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none leading-relaxed font-sans"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 4: AI PERSONA & BEHAVIOR DIRECTIVES STUDIO */}
            {activeTab === 'persona' && (
              <motion.div
                key="tab-persona"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] flex items-center gap-3">
                  <Sliders className="w-4 h-4 text-white shrink-0" />
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Tune Copilot response style with 1-click toggles. Directives are automatically compiled into real-time system prompts.
                  </p>
                </div>

                {/* Behavioral Chips Grid */}
                <div className="space-y-4">
                  {/* Vector 1: Response Length */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-300 block">
                      Response Length:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'ultra-concise', label: 'Ultra-Concise', sub: '1-2 punchy sentences' },
                        { id: 'structured', label: 'Structured & In-Depth', sub: 'Mechanics + Architecture' },
                        { id: 'bullets', label: 'Bullet Points Only', sub: '3 bold keywords list' },
                      ].map((item) => {
                        const isSelected = (profile.aiDirectives?.responseLength || 'ultra-concise') === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setProfile({
                              ...profile,
                              aiDirectives: {
                                ...(profile.aiDirectives || DEFAULT_AI_DIRECTIVES),
                                responseLength: item.id as any,
                              }
                            })}
                            className={`p-2.5 rounded-xl text-left border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-white/15 border-white text-white font-semibold shadow-sm'
                                : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <div className="text-xs">{item.label}</div>
                            <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{item.sub}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Vector 2: Tone of Voice */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-300 block">
                      Tone of Voice:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'authoritative', label: 'Authoritative Architect', sub: 'Defends design decisions' },
                        { id: 'pragmatic', label: 'Pragmatic & Direct', sub: 'No fluff or theory' },
                        { id: 'star', label: 'Storyteller (STAR)', sub: 'Situation, Action, Result' },
                      ].map((item) => {
                        const isSelected = (profile.aiDirectives?.toneOfVoice || 'authoritative') === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setProfile({
                              ...profile,
                              aiDirectives: {
                                ...(profile.aiDirectives || DEFAULT_AI_DIRECTIVES),
                                toneOfVoice: item.id as any,
                              }
                            })}
                            className={`p-2.5 rounded-xl text-left border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-white/15 border-white text-white font-semibold shadow-sm'
                                : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <div className="text-xs">{item.label}</div>
                            <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{item.sub}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Vector 3: Engineering Focus */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-300 block">
                      Engineering Focus:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'architecture', label: 'System Architecture', sub: 'Bottlenecks, Scale, DB IO' },
                        { id: 'clean_code', label: 'Clean Code & Algorithms', sub: 'SOLID, Memory, Typing' },
                        { id: 'business_impact', label: 'Product & Business Impact', sub: 'Velocity, ROI, Metrics' },
                      ].map((item) => {
                        const isSelected = (profile.aiDirectives?.engineeringFocus || 'architecture') === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setProfile({
                              ...profile,
                              aiDirectives: {
                                ...(profile.aiDirectives || DEFAULT_AI_DIRECTIVES),
                                engineeringFocus: item.id as any,
                              }
                            })}
                            className={`p-2.5 rounded-xl text-left border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-white/15 border-white text-white font-semibold shadow-sm'
                                : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <div className="text-xs">{item.label}</div>
                            <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{item.sub}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Vector 4: Anti-AI Guardrails (Multi-Select) */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-300 block">
                      Anti-AI Guardrails:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { id: 'no_fluff', label: 'No Fluff', desc: 'Ban "Sure!", "Great question!", "Under the hood"' },
                        { id: 'challenge_weak', label: 'Challenge Weak Assumptions', desc: 'Clarify unstated edge cases' },
                        { id: 'show_tradeoffs', label: 'Mandatory Production Trade-offs', desc: 'Always cite pros vs. cons' },
                        { id: 'no_academic', label: 'No Textbook Definitions', desc: 'Skip Wikipedia-style intros' },
                      ].map((item) => {
                        const currentGuardrails = profile.aiDirectives?.guardrails || [];
                        const isSelected = currentGuardrails.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              const next = isSelected
                                ? currentGuardrails.filter((g) => g !== item.id)
                                : [...currentGuardrails, item.id];
                              setProfile({
                                ...profile,
                                aiDirectives: {
                                  ...(profile.aiDirectives || DEFAULT_AI_DIRECTIVES),
                                  guardrails: next,
                                },
                              });
                            }}
                            className={`p-2.5 rounded-xl text-left border cursor-pointer transition-all flex items-start gap-2.5 ${
                              isSelected
                                ? 'bg-white/15 border-white text-white'
                                : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border ${
                              isSelected ? 'bg-white text-black border-white' : 'border-white/20'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <div>
                              <div className="text-xs font-semibold">{item.label}</div>
                              <div className="text-[10px] text-zinc-400">{item.desc}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Nuances Free-Form Textarea */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 block">
                      Custom Free-Form Directives:
                    </label>
                    <textarea
                      rows={2}
                      value={profile.customNuances || profile.aiDirectives?.customNuances || ''}
                      onChange={(e) => setProfile({
                        ...profile,
                        customNuances: e.target.value,
                        aiDirectives: {
                          ...(profile.aiDirectives || DEFAULT_AI_DIRECTIVES),
                          customNuances: e.target.value,
                        },
                      })}
                      placeholder="e.g. Від першого лиця, з реальними кейсами, впевнено і по-простому..."
                      className="w-full bg-[#0a0a0f] border border-white/10 hover:border-white/20 focus:border-white/40 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none leading-relaxed font-sans"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setProfile({
                          ...profile,
                          customNuances: 'Від першого лиця, з реальними кейсами з досвіду',
                          aiDirectives: { ...(profile.aiDirectives || DEFAULT_AI_DIRECTIVES), customNuances: 'Від першого лиця, з реальними кейсами з досвіду' }
                        })}
                        className="px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-white/10 border border-white/10 text-[10px] text-zinc-300 font-sans cursor-pointer"
                      >
                        🗣️ Від першого лиця
                      </button>
                      <button
                        type="button"
                        onClick={() => setProfile({
                          ...profile,
                          customNuances: 'Коротко, без води, конкретні факти та тези',
                          aiDirectives: { ...(profile.aiDirectives || DEFAULT_AI_DIRECTIVES), customNuances: 'Коротко, без води, конкретні факти та тези' }
                        })}
                        className="px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-white/10 border border-white/10 text-[10px] text-zinc-300 font-sans cursor-pointer"
                      >
                        ⚡ Коротко і по суті
                      </button>
                      <button
                        type="button"
                        onClick={() => setProfile({
                          ...profile,
                          customNuances: 'Упор на архітектуру, надійність та компроміси (trade-offs)',
                          aiDirectives: { ...(profile.aiDirectives || DEFAULT_AI_DIRECTIVES), customNuances: 'Упор на архітектуру, надійність та компроміси (trade-offs)' }
                        })}
                        className="px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-white/10 border border-white/10 text-[10px] text-zinc-300 font-sans cursor-pointer"
                      >
                        🏗️ Архітектура та трейдоффи
                      </button>
                    </div>
                  </div>

                  {/* Expandable Live Prompt Preview */}
                  <div className="rounded-xl border border-white/10 bg-[#07070a] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowPromptPreview(!showPromptPreview)}
                      className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-zinc-300 hover:text-white cursor-pointer hover:bg-white/[0.02]"
                    >
                      <div className="flex items-center gap-2">
                        <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="font-mono">Live Copilot System Prompt Compiler</span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-500">
                        {showPromptPreview ? 'Collapse' : 'Inspect'}
                      </span>
                    </button>
                    {showPromptPreview && (
                      <div className="p-3.5 border-t border-white/[0.06] bg-black/80 font-mono text-[11px] text-zinc-300 whitespace-pre-wrap leading-relaxed">
                        {currentCompiledPrompt}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Modal Footer Controls */}
        <div className="relative z-10 flex items-center justify-between px-6 py-4 border-t border-white/[0.08] bg-[#07070b]/90 backdrop-blur-xl flex-shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer px-2.5 py-1.5 rounded-lg font-mono border border-transparent hover:border-white/10 hover:bg-white/[0.04]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-white text-black hover:bg-zinc-200 shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Save & Sync Profile</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
