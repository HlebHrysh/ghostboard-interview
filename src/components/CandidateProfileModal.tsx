'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from '@/contexts/LocaleContext';
import { getModalsTranslations } from '@/lib/modalsI18n';
import type { SupportedLocale } from '@/lib/geoLang';

export interface PetProject {
  id: string;
  name: string;
  description: string;
  keyHighlight: string;
}

export interface CandidateProfile {
  name?: string;
  age: number;
  role: string;
  techStack: string[];
  petProjects: PetProject[];
  customContext: string;
  cvContext?: string;
  jobDescription?: string;
}

export const DEFAULT_CANDIDATE_PROFILE: CandidateProfile = {
  name: 'Candidate',
  age: 23,
  role: 'Full-Stack Developer (React / TypeScript / Node.js)',
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
};

/**
 * 18 POPULAR TECH ROLES & PRESETS
 * Fully pre-configured with stacks, pet projects, and contextual background.
 */
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
        description: 'Next.js 15 App Router web application with Server Components, Tailwind CSS and Zustand state management',
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
      'Swift Concurrency (async/await)', 'Xcode', 'MVVM', 'TestFlight', 'Git'
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
      'Dart', 'Flutter', 'React Native', 'TypeScript', 'Bloc',
      'Redux', 'Firebase', 'REST API', 'iOS & Android Build Tools', 'Git'
    ],
    petProjects: [
      {
        id: 'flt_p1',
        name: 'Cross-Platform Marketplace App',
        description: 'Flutter app published to iOS & Android with BLoC state management and native bridge modules',
        keyHighlight: 'Single codebase targeting iOS and Android with 95%+ code sharing and native-like performance'
      }
    ],
    customContext: 'Mobile Developer building high-performance cross-platform apps with Flutter and React Native with clean state management and responsive UI.'
  },
  devops: {
    category: 'cloud',
    label: 'DevOps / SRE / Cloud',
    role: 'DevOps / SRE / Cloud Engineer',
    techStack: [
      'Linux', 'Docker', 'Kubernetes (K8s)', 'Helm', 'Terraform',
      'AWS', 'GCP', 'GitHub Actions', 'CI/CD', 'Nginx',
      'Prometheus', 'Grafana', 'Ansible', 'Git'
    ],
    petProjects: [
      {
        id: 'dev_p1',
        name: 'Production Kubernetes Infrastructure (IaC)',
        description: 'Multi-cluster Kubernetes setup automated with Terraform, Helm, and GitHub Actions CI/CD',
        keyHighlight: 'Zero-downtime rolling deployments, Prometheus/Grafana alerting, automated SSL/ingress'
      }
    ],
    customContext: 'DevOps & Site Reliability Engineer focused on Infrastructure as Code (Terraform), Kubernetes orchestration, robust CI/CD pipelines, and high availability.'
  },
  qa_automation: {
    category: 'qa_data',
    label: 'QA Automation (SDET)',
    role: 'QA Automation Engineer (SDET)',
    techStack: [
      'TypeScript', 'Python', 'Playwright', 'Cypress', 'Selenium',
      'PyTest', 'Postman', 'REST Assured', 'CI/CD Pipelines', 'Allure Reports', 'Docker', 'Git'
    ],
    petProjects: [
      {
        id: 'qa_p1',
        name: 'End-to-End Test Automation Framework',
        description: 'Parallelized test framework built with Playwright and TypeScript integrated into CI/CD',
        keyHighlight: 'Reduced test execution time by 60% through parallel workers and cross-browser regression testing'
      }
    ],
    customContext: 'QA Automation Engineer / SDET with strong background in API, UI, and performance test automation, CI/CD quality gates, and test strategy.'
  },
  data_engineer: {
    category: 'qa_data',
    label: 'Data Engineer',
    role: 'Data Engineer (Spark / Airflow / SQL)',
    techStack: [
      'Python', 'SQL', 'Apache Spark', 'Apache Airflow', 'Kafka',
      'dbt', 'Snowflake', 'BigQuery', 'PostgreSQL', 'Docker', 'AWS S3', 'Git'
    ],
    petProjects: [
      {
        id: 'de_p1',
        name: 'Streaming & Batch Analytics Pipeline',
        description: 'Scalable data pipeline with Kafka, PySpark, Airflow scheduling and Snowflake warehouse',
        keyHighlight: 'Processes millions of daily events with incremental dbt models and data quality checks'
      }
    ],
    customContext: 'Data Engineer specializing in ETL/ELT pipelines, distributed data processing with Spark, workflow orchestration with Airflow, and data modeling.'
  },
  data_science: {
    category: 'qa_data',
    label: 'Data Science / AI / ML',
    role: 'Data Scientist / Machine Learning Engineer',
    techStack: [
      'Python', 'PyTorch', 'TensorFlow', 'Pandas', 'NumPy',
      'Scikit-learn', 'LLMs', 'LangChain', 'RAG', 'HuggingFace', 'SQL', 'Docker', 'Git'
    ],
    petProjects: [
      {
        id: 'ds_p1',
        name: 'RAG Search & LLM Document Assistant',
        description: 'Retrieval-Augmented Generation system using LangChain, vector embeddings, and PyTorch fine-tuning',
        keyHighlight: 'Cosine similarity semantic search with FAISS/ChromaDB and sub-second answer synthesis'
      }
    ],
    customContext: 'Data Scientist & ML Engineer experienced in statistical modeling, deep learning (PyTorch), LLM application development, RAG systems, and MLOps.'
  },
  system_architect: {
    category: 'management',
    label: 'System Architect / Tech Lead',
    role: 'System Architect / Tech Lead',
    techStack: [
      'System Design', 'Distributed Systems', 'Microservices', 'Event-Driven Architecture',
      'Domain-Driven Design (DDD)', 'Cloud (AWS/GCP)', 'PostgreSQL', 'Redis', 'Kafka', 'Docker', 'K8s'
    ],
    petProjects: [
      {
        id: 'arch_p1',
        name: 'High-Availability Multi-Region Microservice Architecture',
        description: 'Distributed system blueprint featuring event-driven orchestration, CQRS and active-active DB replication',
        keyHighlight: '99.99% uptime design with circuit breakers, idempotency keys, and graceful degradation'
      }
    ],
    customContext: 'System Architect & Tech Lead skilled in high-load distributed systems, scalability, trade-off analysis (CAP/PACELC), microservices, and engineering mentorship.'
  },
  product_manager: {
    category: 'management',
    label: 'Technical Product Manager',
    role: 'Technical Product Manager / IT Project Manager',
    techStack: [
      'Agile / Scrum / Kanban', 'Product Roadmapping', 'User Stories & PRDs',
      'SQL & Data Analysis', 'Jira / Confluence', 'A/B Testing', 'System Design Basics', 'Figma', 'Metrics (AARRR, OKRs)'
    ],
    petProjects: [
      {
        id: 'pm_p1',
        name: 'SaaS User Onboarding Redesign & Growth Funnel',
        description: 'Product discovery, PRD authoring, user journey mapping and A/B test experiments',
        keyHighlight: 'Increased 30-day user retention by 28% through friction reduction and data-driven iterations'
      }
    ],
    customContext: 'Technical Product Manager experienced in leading cross-functional engineering teams, translating business goals into crisp PRDs, and metric-driven delivery.'
  },
  uiux_designer: {
    category: 'management',
    label: 'UI/UX & Product Designer',
    role: 'UI/UX & Product Designer',
    techStack: [
      'Figma', 'Design Systems', 'Wireframing', 'Interactive Prototyping',
      'User Research', 'Usability Testing', 'Information Architecture', 'Responsive Design', 'Design Tokens'
    ],
    petProjects: [
      {
        id: 'ux_p1',
        name: 'Enterprise Design System & Dashboard Redesign',
        description: 'Comprehensive design system in Figma with 50+ reusable components, tokens, and WCAG AA accessibility',
        keyHighlight: 'Boosted design-to-development velocity by 40% and improved usability task success to 95%'
      }
    ],
    customContext: 'Product Designer bridging user empathy, data-driven UX research, design systems, and pixel-perfect UI execution for web and mobile.'
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
      petProjects: Array.isArray(parsed.petProjects) ? parsed.petProjects : DEFAULT_CANDIDATE_PROFILE.petProjects,
      techStack: Array.isArray(parsed.techStack) ? parsed.techStack : DEFAULT_CANDIDATE_PROFILE.techStack,
    };
  } catch {
    return DEFAULT_CANDIDATE_PROFILE;
  }
}

interface TabsI18n {
  tabRole: string;
  tabProjects: string;
  tabContext: string;
  presetTitle: string;
  presetSubtitle: string;
  selectRolePlaceholder: string;
  quickAdd: string;
  projInfo: string;
  projectCardTitle: string;
  projectCardDelete: string;
  projNameLabel: string;
  projDescLabel: string;
  projHighlightLabel: string;
  noProjects: string;
  contextInfo: string;
  jobTitle: string;
  jobSubtitle: string;
  cvTitle: string;
  cvSubtitle: string;
  bioTitle: string;
  bioSubtitle: string;
  activeRoleApplied: string;
  rolePlaceholder: string;
  tagPlaceholder: string;
  deleteTagHint: string;
  groupFrontend: string;
  groupBackend: string;
  groupMobile: string;
  groupCloud: string;
  groupData: string;
  groupManagement: string;
}

const I18N_TABS: Record<string, TabsI18n> = {
  ua: {
    tabRole: 'Спеціалізація та стек',
    tabProjects: 'Пет-проєкти',
    tabContext: 'Резюме та вакансія',
    presetTitle: 'Швидкий вибір спеціалізації (автозаповнення)',
    presetSubtitle: 'Оберіть потрібну роль — стек і проєкти підставляться автоматично:',
    selectRolePlaceholder: '— Або оберіть зі списку всіх 18 ролей —',
    quickAdd: 'Популярні технології:',
    projInfo: 'ШІ наводитиме ці проєкти як реальні приклади вашого досвіду у відповідях на співбесіді.',
    projectCardTitle: 'Проєкт',
    projectCardDelete: 'Видалити',
    projNameLabel: 'Назва проєкту',
    projDescLabel: 'Що робить проєкт та які технології використано',
    projHighlightLabel: 'Головне технічне досягнення / Що підкреслити ШІ',
    noProjects: 'У вас поки немає доданих проєктів. Ви можете додати власний або вибрати готову роль у шаблонах.',
    contextInfo: 'Необов\'язково. Допомагає ШІ максимально точно адаптувати відповіді під конкретну вакансію та компанію.',
    jobTitle: 'Вимоги вакансії (Job Description)',
    jobSubtitle: 'Вставте текст вакансії сюди, щоб ШІ відповідав саме на те, що шукає компанія.',
    cvTitle: 'Ваше резюме (CV Context)',
    cvSubtitle: 'Вставте текст вашого CV, щоб ШІ міг наводити факти з вашої реальної біографії.',
    bioTitle: 'Додаткові побажання до відповідей ШІ',
    bioSubtitle: 'Будь-які вказівки (наприклад: "відповідай лаконічно", "роби акцент на практиці").',
    activeRoleApplied: 'Застосовано роль:',
    rolePlaceholder: 'Наприклад: Frontend Developer (React / Next.js)',
    tagPlaceholder: 'Введіть технологію (напр. Redis, Docker)...',
    deleteTagHint: 'Натисніть на × щоб видалити',
    groupFrontend: 'Frontend & Full-Stack',
    groupBackend: 'Backend розробка',
    groupMobile: 'Mobile розробка',
    groupCloud: 'Cloud, DevOps & QA',
    groupData: 'Data Science & AI / ML',
    groupManagement: 'Архітектура та управління',
  },
  en: {
    tabRole: 'Role & Tech Stack',
    tabProjects: 'Pet Projects',
    tabContext: 'Resume & Job Context',
    presetTitle: 'Quick Role Presets (Auto-fill)',
    presetSubtitle: 'Choose your specialization — role, tech stack, and projects will auto-fill:',
    selectRolePlaceholder: '— Or choose from all 18 roles —',
    quickAdd: 'Popular technologies:',
    projInfo: 'AI will cite these projects as real-world examples of your experience during the interview.',
    projectCardTitle: 'Project',
    projectCardDelete: 'Delete',
    projNameLabel: 'Project Name',
    projDescLabel: 'What it does & technologies used',
    projHighlightLabel: 'Key technical highlight / What AI should mention',
    noProjects: 'No projects added yet. You can add your own or choose a role preset above.',
    contextInfo: 'Optional. Helps AI precisely tailor answers to the specific job opening and company.',
    jobTitle: 'Job Description requirements',
    jobSubtitle: 'Paste vacancy text here so AI answers what the employer is specifically looking for.',
    cvTitle: 'Your Resume (CV Context)',
    cvSubtitle: 'Paste your CV text so AI mentions facts from your real career background.',
    bioTitle: 'Additional Style & Answer Preferences',
    bioSubtitle: 'Any specific instructions (e.g. "answer concisely", "focus on production experience").',
    activeRoleApplied: 'Applied role:',
    rolePlaceholder: 'e.g. Frontend Developer (React / Next.js)',
    tagPlaceholder: 'Add technology (e.g. Redis, Docker)...',
    deleteTagHint: 'Click × to remove',
    groupFrontend: 'Frontend & Full-Stack',
    groupBackend: 'Backend Development',
    groupMobile: 'Mobile Development',
    groupCloud: 'Cloud, DevOps & QA',
    groupData: 'Data Science & AI / ML',
    groupManagement: 'Architecture & Management',
  },
  pl: {
    tabRole: 'Rola i Technologie',
    tabProjects: 'Projekty',
    tabContext: 'Oferta i CV',
    presetTitle: 'Szybki wybór roli (autouzupełnianie)',
    presetSubtitle: 'Wybierz specjalizację — rola, technologie i projekty wypełnią się same:',
    selectRolePlaceholder: '— Lub wybierz z listy 18 ról —',
    quickAdd: 'Popularne technologie:',
    projInfo: 'AI wykorzysta te projekty jako przykłady Twojego doświadczenia podczas rozmowy.',
    projectCardTitle: 'Projekt',
    projectCardDelete: 'Usuń',
    projNameLabel: 'Nazwa projektu',
    projDescLabel: 'Co robi projekt i technologie',
    projHighlightLabel: 'Kluczowe osiągnięcie / Co AI ma podkreślić',
    noProjects: 'Brak dodanych projektów. Kliknij poniższy przycisk lub wybierz szablon roli.',
    contextInfo: 'Opcjonalne. Pomaga AI dostosować odpowiedzi do wymagań oferty.',
    jobTitle: 'Wymagania oferty pracy (Job Description)',
    jobSubtitle: 'Wklej treść oferty, aby AI skupiło się na kluczowych wymaganiach.',
    cvTitle: 'Twoje CV (CV Context)',
    cvSubtitle: 'Wklej tekst CV, aby AI mogło odwoływać się do Twojego doświadczenia.',
    bioTitle: 'Wskazówki co do stylu odpowiedzi',
    bioSubtitle: 'Wskazówki (np. "odpowiadaj zwięźle", "stawiaj na praktykę").',
    activeRoleApplied: 'Zastosowano rolę:',
    rolePlaceholder: 'Np: Frontend Developer (React / Next.js)',
    tagPlaceholder: 'Dodaj technologię (np. Redis, Docker)...',
    deleteTagHint: 'Kliknij × aby usunąć',
    groupFrontend: 'Frontend & Full-Stack',
    groupBackend: 'Backend Development',
    groupMobile: 'Mobile Development',
    groupCloud: 'Cloud, DevOps & QA',
    groupData: 'Data Science & AI',
    groupManagement: 'Architektura i Zarządzanie',
  },
  de: {
    tabRole: 'Rolle & Tech-Stack',
    tabProjects: 'Projekte',
    tabContext: 'Stelle & Lebenslauf',
    presetTitle: 'Schnelle Rollenauswahl (Auto-Fill)',
    presetSubtitle: 'Wählen Sie Ihre Spezialisierung — Rolle, Stack und Projekte werden ausgefüllt:',
    selectRolePlaceholder: '— Oder wählen Sie aus 18 Rollen —',
    quickAdd: 'Beliebte Technologien:',
    projInfo: 'Die KI nutzt diese Projekte als Beispiele Ihrer Erfahrung im Interview.',
    projectCardTitle: 'Projekt',
    projectCardDelete: 'Löschen',
    projNameLabel: 'Projektname',
    projDescLabel: 'Projektbeschreibung und Stack',
    projHighlightLabel: 'Wichtigster technischer Erfolg',
    noProjects: 'Noch keine Projekte hinzugefügt. Fügen Sie eines hinzu oder wählen Sie eine Rolle.',
    contextInfo: 'Optional. Hilft der KI, Antworten exakt auf die Stelle abzustimmen.',
    jobTitle: 'Stellenbeschreibung (Job Description)',
    jobSubtitle: 'Stellentext einfügen, damit die KI gezielt darauf eingeht.',
    cvTitle: 'Ihr Lebenslauf (CV Context)',
    cvSubtitle: 'CV-Text einfügen für reale Praxiserfahrung.',
    bioTitle: 'Zusätzliche Wünsche & Stil',
    bioSubtitle: 'Besondere Wünsche (z. B. "prägnant antworten").',
    activeRoleApplied: 'Rolle angewendet:',
    rolePlaceholder: 'z. B. Frontend Developer (React / Next.js)',
    tagPlaceholder: 'Technologie hinzufügen (z. B. Redis, Docker)...',
    deleteTagHint: 'Klicken Sie auf × zum Entfernen',
    groupFrontend: 'Frontend & Full-Stack',
    groupBackend: 'Backend-Entwicklung',
    groupMobile: 'Mobile Entwicklung',
    groupCloud: 'Cloud, DevOps & QA',
    groupData: 'Data Science & AI',
    groupManagement: 'Architektur & Management',
  },
  fr: {
    tabRole: 'Rôle et Stack',
    tabProjects: 'Projets',
    tabContext: 'Offre et CV',
    presetTitle: 'Sélection rapide du rôle (auto-remplissage)',
    presetSubtitle: 'Choisissez votre spécialité — rôle, stack et projets se remplissent automatiquement :',
    selectRolePlaceholder: '— Ou choisissez parmi les 18 rôles —',
    quickAdd: 'Technologies populaires :',
    projInfo: 'L\'IA citera ces projets comme des exemples concrets de votre expérience pendant l\'entretien.',
    projectCardTitle: 'Projet',
    projectCardDelete: 'Supprimer',
    projNameLabel: 'Nom du projet',
    projDescLabel: 'Rôle du projet et technologies utilisées',
    projHighlightLabel: 'Réalisation clé / Ce que l\'IA doit mentionner',
    noProjects: 'Aucun projet ajouté pour le moment. Cliquez sur le bouton ci-dessous ou choisissez un rôle.',
    contextInfo: 'Facultatif. Permet à l\'IA d\'adapter précisément les réponses aux exigences de l\'offre.',
    jobTitle: 'Exigences de l\'offre d\'emploi (Job Description)',
    jobSubtitle: 'Collez le texte de l\'offre pour orienter les réponses de l\'IA.',
    cvTitle: 'Votre CV (Contexte CV)',
    cvSubtitle: 'Collez le texte de votre CV pour citer votre parcours réel.',
    bioTitle: 'Consignes de style et de réponse',
    bioSubtitle: 'Consignes spécifiques (ex : "réponds de façon concise").',
    activeRoleApplied: 'Rôle appliqué :',
    rolePlaceholder: 'ex : Frontend Developer (React / Next.js)',
    tagPlaceholder: 'Ajouter une technologie (ex : Redis, Docker)...',
    deleteTagHint: 'Cliquez sur × pour supprimer',
    groupFrontend: 'Frontend & Full-Stack',
    groupBackend: 'Développement Backend',
    groupMobile: 'Développement Mobile',
    groupCloud: 'Cloud, DevOps & QA',
    groupData: 'Data Science & IA',
    groupManagement: 'Architecture & Gestion',
  },
  es: {
    tabRole: 'Rol y Stack',
    tabProjects: 'Proyectos',
    tabContext: 'Vacante y CV',
    presetTitle: 'Selección rápida de rol (autocompletado)',
    presetSubtitle: 'Elige tu especialidad — el rol, el stack y los proyectos se completan solos:',
    selectRolePlaceholder: '— O elige de la lista de 18 roles —',
    quickAdd: 'Tecnologías populares:',
    projInfo: 'La IA mencionará estos proyectos como ejemplos reales de tu experiencia en la entrevista.',
    projectCardTitle: 'Proyecto',
    projectCardDelete: 'Eliminar',
    projNameLabel: 'Nombre del proyecto',
    projDescLabel: 'Qué hace el proyecto y tecnologías',
    projHighlightLabel: 'Logro clave / Qué debe resaltar la IA',
    noProjects: 'Aún no hay proyectos añadidos. Añade uno abajo o elige un rol predefinido.',
    contextInfo: 'Opcional. Ayuda a la IA a adaptar las respuestas a los requisitos del puesto.',
    jobTitle: 'Descripción de la vacante (Job Description)',
    jobSubtitle: 'Pega el texto de la vacante para que la IA responda exactamente a lo solicitado.',
    cvTitle: 'Tu currículum (CV Context)',
    cvSubtitle: 'Pega tu CV para que la IA cite tu trayectoria profesional real.',
    bioTitle: 'Preferencias de respuesta y estilo',
    bioSubtitle: 'Instrucciones específicas (ej: "responde de forma concisa").',
    activeRoleApplied: 'Rol aplicado:',
    rolePlaceholder: 'ej: Frontend Developer (React / Next.js)',
    tagPlaceholder: 'Agregar tecnología (ej: Redis, Docker)...',
    deleteTagHint: 'Haz clic en × para eliminar',
    groupFrontend: 'Frontend y Full-Stack',
    groupBackend: 'Desarrollo Backend',
    groupMobile: 'Desarrollo Móvil',
    groupCloud: 'Cloud, DevOps y QA',
    groupData: 'Data Science e IA',
    groupManagement: 'Arquitectura y Gestión',
  },
  pt: {
    tabRole: 'Cargo e Stack',
    tabProjects: 'Projetos',
    tabContext: 'Vaga e Currículo',
    presetTitle: 'Seleção rápida de perfil (preenchimento automático)',
    presetSubtitle: 'Escolha sua especialidade — cargo, tecnologias e projetos serão preenchidos:',
    selectRolePlaceholder: '— Ou escolha na lista de 18 perfis —',
    quickAdd: 'Tecnologias populares:',
    projInfo: 'A IA usará esses projetos como exemplos práticos da sua experiência durante a entrevista.',
    projectCardTitle: 'Projeto',
    projectCardDelete: 'Excluir',
    projNameLabel: 'Nome do projeto',
    projDescLabel: 'O que o projeto faz e tecnologias usadas',
    projHighlightLabel: 'Destaque técnico principal / O que a IA deve citar',
    noProjects: 'Nenhum projeto adicionado ainda. Adicione um abaixo ou selecione um modelo acima.',
    contextInfo: 'Opcional. Ajuda a IA a alinhar as respostas às exigências específicas da vaga.',
    jobTitle: 'Requisitos da vaga (Job Description)',
    jobSubtitle: 'Cole o texto da vaga aqui para a IA focar no que a empresa procura.',
    cvTitle: 'Seu currículo (CV Context)',
    cvSubtitle: 'Cole o texto do seu CV para a IA citar sua trajetória real.',
    bioTitle: 'Preferências de estilo e resposta',
    bioSubtitle: 'Instruções adicionais (ex: "responda de forma concisa").',
    activeRoleApplied: 'Perfil aplicado:',
    rolePlaceholder: 'ex: Frontend Developer (React / Next.js)',
    tagPlaceholder: 'Adicionar tecnologia (ex: Redis, Docker)...',
    deleteTagHint: 'Clique em × para remover',
    groupFrontend: 'Frontend & Full-Stack',
    groupBackend: 'Desenvolvimento Backend',
    groupMobile: 'Desenvolvimento Mobile',
    groupCloud: 'Cloud, DevOps & QA',
    groupData: 'Data Science & IA',
    groupManagement: 'Arquitetura e Gestão',
  },
  it: {
    tabRole: 'Ruolo e Stack',
    tabProjects: 'Progetti',
    tabContext: 'Offerta e CV',
    presetTitle: 'Scelta rapida del profilo (autocompilazione)',
    presetSubtitle: 'Scegli la tua specializzazione — ruolo, tecnologie e progetti si compileranno da soli:',
    selectRolePlaceholder: '— O scegli dall\'elenco di 18 ruoli —',
    quickAdd: 'Tecnologie popolari:',
    projInfo: 'L\'IA citerà questi progetti come esempi reali della tua esperienza durante il colloquio.',
    projectCardTitle: 'Progetto',
    projectCardDelete: 'Elimina',
    projNameLabel: 'Nome del progetto',
    projDescLabel: 'Cosa fa il progetto e tecnologie impiegate',
    projHighlightLabel: 'Risultato tecnico principale / Cosa evidenziare all\'IA',
    noProjects: 'Nessun progetto ancora aggiunto. Aggiungine uno o seleziona un profilo.',
    contextInfo: 'Opzionale. Aiuta l\'IA ad adattare le risposte ai requisiti specifici dell\'offerta.',
    jobTitle: 'Requisiti dell\'offerta di lavoro (Job Description)',
    jobSubtitle: 'Incolla il testo dell\'offerta per guidare le risposte dell\'IA.',
    cvTitle: 'Il tuo curriculum (CV Context)',
    cvSubtitle: 'Incolla il testo del tuo CV per consentire all\'IA di citare la tua reale esperienza.',
    bioTitle: 'Preferenze di stile e risposte',
    bioSubtitle: 'Istruzioni specifiche (es: "rispondi in modo conciso").',
    activeRoleApplied: 'Profilo applicato:',
    rolePlaceholder: 'es: Frontend Developer (React / Next.js)',
    tagPlaceholder: 'Aggiungi tecnologia (es: Redis, Docker)...',
    deleteTagHint: 'Clicca su × per eliminare',
    groupFrontend: 'Frontend & Full-Stack',
    groupBackend: 'Sviluppo Backend',
    groupMobile: 'Sviluppo Mobile',
    groupCloud: 'Cloud, DevOps & QA',
    groupData: 'Data Science & IA',
    groupManagement: 'Architettura & Gestione',
  },
  cs: {
    tabRole: 'Role a Technologie',
    tabProjects: 'Projekty',
    tabContext: 'Pozice a Životopis',
    presetTitle: 'Rychlý výběr specializace (automatické vyplnění)',
    presetSubtitle: 'Vyberte svou roli — pozice, technologie i projekty se vyplní samy:',
    selectRolePlaceholder: '— Nebo vyberte ze seznamu 18 rolí —',
    quickAdd: 'Oblíbené technologie:',
    projInfo: 'AI bude tyto projekty uvádět jako praktické příklady vašich zkušeností během pohovoru.',
    projectCardTitle: 'Projekt',
    projectCardDelete: 'Smazat',
    projNameLabel: 'Název projektu',
    projDescLabel: 'Co projekt dělá a použité technologie',
    projHighlightLabel: 'Hlavní technický úspěch / Co má AI zdůraznit',
    noProjects: 'Zatím nemáte přidané žádné projekty. Přidejte projekt níže nebo zvolte šablonu.',
    contextInfo: 'Volitelné. Pomáhá AI přesně přizpůsobit odpovědi požadavkům konkrétní pracovní nabídky.',
    jobTitle: 'Požadavky pracovní pozice (Job Description)',
    jobSubtitle: 'Vložte text inzerátu, aby AI reagovala přesně na to, co firma hledá.',
    cvTitle: 'Váš životopis (CV Context)',
    cvSubtitle: 'Vložte text životopisu, aby AI mohla uvádět fakta z vaší skutečné kariéry.',
    bioTitle: 'Dodatečné pokyny ke stylu odpovědí',
    bioSubtitle: 'Zvláštní přání (např. "odpovídej stručně", "důraz na praxi").',
    activeRoleApplied: 'Použita role:',
    rolePlaceholder: 'např: Frontend Developer (React / Next.js)',
    tagPlaceholder: 'Přidat technologii (např. Redis, Docker)...',
    deleteTagHint: 'Klikněte na × pro smazání',
    groupFrontend: 'Frontend & Full-Stack',
    groupBackend: 'Backend vývoj',
    groupMobile: 'Mobilní vývoj',
    groupCloud: 'Cloud, DevOps & QA',
    groupData: 'Data Science & AI',
    groupManagement: 'Architektura a Management',
  },
  nl: {
    tabRole: 'Rol & Stack',
    tabProjects: 'Projecten',
    tabContext: 'Vacature & CV',
    presetTitle: 'Snelle rolselectie (automatisch invullen)',
    presetSubtitle: 'Kies uw specialisatie — rol, technologieën en projecten worden direct ingevuld:',
    selectRolePlaceholder: '— Of kies uit de lijst van 18 rollen —',
    quickAdd: 'Populaire technologieën:',
    projInfo: 'AI noemt deze projecten als voorbeelden van uw ervaring tijdens het sollicitatiegesprek.',
    projectCardTitle: 'Project',
    projectCardDelete: 'Verwijderen',
    projNameLabel: 'Projectnaam',
    projDescLabel: 'Wat doet het project en gebruikte stack',
    projHighlightLabel: 'Belangrijkste technische prestatie / Wat AI moet noemen',
    noProjects: 'Nog geen projecten toegevoegd. Voeg er hieronder een toe of kies een profiel.',
    contextInfo: 'Optioneel. Helpt AI antwoorden af te stemmen op de specifieke vacature-eisen.',
    jobTitle: 'Vacature-eisen (Job Description)',
    jobSubtitle: 'Plak de vacaturetekst hier zodat AI gericht antwoordt op wat het bedrijf zoekt.',
    cvTitle: 'Uw cv (CV Context)',
    cvSubtitle: 'Plak uw cv-tekst zodat AI feiten uit uw werkelijke loopbaan kan aanhalen.',
    bioTitle: 'Aanvullende stijl- en antwoordvoorkeuren',
    bioSubtitle: 'Instructies (bijv. "antwoord beknopt", "focus op praktijkvoorbeelden").',
    activeRoleApplied: 'Rol toegepast:',
    rolePlaceholder: 'bijv. Frontend Developer (React / Next.js)',
    tagPlaceholder: 'Technologie toevoegen (bijv. Redis, Docker)...',
    deleteTagHint: 'Klik op × om te verwijderen',
    groupFrontend: 'Frontend & Full-Stack',
    groupBackend: 'Backend Ontwikkeling',
    groupMobile: 'Mobiele Ontwikkeling',
    groupCloud: 'Cloud, DevOps & QA',
    groupData: 'Data Science & AI',
    groupManagement: 'Architectuur & Management',
  },
};

function getTabsI18n(locale: string): TabsI18n {
  return I18N_TABS[locale] || I18N_TABS.en || I18N_TABS.ua;
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
  const [activeTab, setActiveTab] = useState<'role' | 'projects' | 'context'>('role');
  const [selectedPresetKey, setSelectedPresetKey] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setProfile(getStoredCandidateProfile());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const t = getTabsI18n(activeLocale);

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      onSave?.(profile);
      toast.success(pr.toastSaved);
      onClose();
    } catch {
      toast.error('Error saving profile');
    }
  };

  const handleReset = () => {
    setProfile(DEFAULT_CANDIDATE_PROFILE);
    setSelectedPresetKey(null);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CANDIDATE_PROFILE));
    toast.info(pr.toastReset);
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
    toast.success(`${t.activeRoleApplied} ${p.label}`);
  };

  const handleAddTag = () => {
    const clean = newTagInput.trim();
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
    const newProj: PetProject = {
      id: `p_${Date.now()}`,
      name: pr.newProjName,
      description: pr.newProjDesc,
      keyHighlight: pr.newProjHighlight,
    };
    setProfile((prev) => ({
      ...prev,
      petProjects: [...prev.petProjects, newProj],
    }));
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

  const POPULAR_SUGGESTIONS = [
    'Docker', 'PostgreSQL', 'Redis', 'Kubernetes', 'AWS', 'Kafka',
    'GraphQL', 'Tailwind CSS', 'Git', 'CI/CD'
  ];

  const hasContextFilled = Boolean(profile.jobDescription?.trim() || profile.cvContext?.trim());

  // Quick 6 top roles for one-click pill bar
  const QUICK_ROLES = [
    { key: 'fullstack', label: 'Full-Stack' },
    { key: 'frontend', label: 'Frontend' },
    { key: 'python_backend', label: 'Python' },
    { key: 'nodejs_backend', label: 'Node.js' },
    { key: 'java_backend', label: 'Java' },
    { key: 'devops', label: 'DevOps' },
  ];

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-[#18191E] border border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xl text-zinc-100 max-h-[92dvh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-zinc-800/80 bg-[#18191E] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-800/70 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
              <User className="w-4 h-4 text-zinc-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-zinc-100 tracking-tight">
                {pr.title}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {pr.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/70 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Control Tabs */}
        <div className="px-5 sm:px-6 py-2.5 bg-[#141519] border-b border-zinc-800/60 flex-shrink-0">
          <div className="flex bg-[#1D1E25] p-1 rounded-xl border border-zinc-800/80 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('role')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'role'
                  ? 'bg-zinc-700/90 text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{t.tabRole}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'role' ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-800/60 text-zinc-400'
              }`}>
                {profile.techStack.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('projects')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'projects'
                  ? 'bg-zinc-700/90 text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>{t.tabProjects}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'projects' ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-800/60 text-zinc-400'
              }`}>
                {profile.petProjects.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('context')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'context'
                  ? 'bg-zinc-700/90 text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{t.tabContext}</span>
              {hasContextFilled && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              )}
            </button>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-6 custom-scrollbar">
          {activeTab === 'role' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Block 1: Role Presets (Selection) */}
              <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-200">
                    {t.presetTitle}
                  </label>
                  <span className="text-[11px] text-zinc-400 hidden sm:inline">
                    18 готових шаблонів
                  </span>
                </div>

                {/* 1-Click Common Roles & Full Dropdown */}
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
                        className={`px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-zinc-200 text-zinc-950 font-bold shadow-sm'
                            : 'bg-zinc-800/70 hover:bg-zinc-750 text-zinc-300 border border-zinc-700/60'
                        }`}
                      >
                        <span>{label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-zinc-950" />}
                      </button>
                    );
                  })}

                  {/* All 18 roles dropdown with categorized optgroups */}
                  <select
                    value={selectedPresetKey || ''}
                    onChange={(e) => {
                      const key = e.target.value;
                      if (key && ROLE_PRESETS[key]) {
                        applyPreset(key, ROLE_PRESETS[key]);
                      }
                    }}
                    className="bg-zinc-800/70 border border-zinc-700/60 hover:border-zinc-500 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-400 cursor-pointer"
                  >
                    <option value="">{t.selectRolePlaceholder}</option>
                    <optgroup label={t.groupFrontend}>
                      <option value="frontend">{ROLE_PRESETS.frontend.label} — {ROLE_PRESETS.frontend.role}</option>
                      <option value="fullstack">{ROLE_PRESETS.fullstack.label} — {ROLE_PRESETS.fullstack.role}</option>
                    </optgroup>
                    <optgroup label={t.groupBackend}>
                      <option value="python_backend">{ROLE_PRESETS.python_backend.label} — {ROLE_PRESETS.python_backend.role}</option>
                      <option value="nodejs_backend">{ROLE_PRESETS.nodejs_backend.label} — {ROLE_PRESETS.nodejs_backend.role}</option>
                      <option value="java_backend">{ROLE_PRESETS.java_backend.label} — {ROLE_PRESETS.java_backend.role}</option>
                      <option value="golang_backend">{ROLE_PRESETS.golang_backend.label} — {ROLE_PRESETS.golang_backend.role}</option>
                      <option value="dotnet_backend">{ROLE_PRESETS.dotnet_backend.label} — {ROLE_PRESETS.dotnet_backend.role}</option>
                    </optgroup>
                    <optgroup label={t.groupMobile}>
                      <option value="ios_mobile">{ROLE_PRESETS.ios_mobile.label} — {ROLE_PRESETS.ios_mobile.role}</option>
                      <option value="android_mobile">{ROLE_PRESETS.android_mobile.label} — {ROLE_PRESETS.android_mobile.role}</option>
                      <option value="flutter_mobile">{ROLE_PRESETS.flutter_mobile.label} — {ROLE_PRESETS.flutter_mobile.role}</option>
                    </optgroup>
                    <optgroup label={t.groupCloud}>
                      <option value="devops">{ROLE_PRESETS.devops.label} — {ROLE_PRESETS.devops.role}</option>
                      <option value="qa_automation">{ROLE_PRESETS.qa_automation.label} — {ROLE_PRESETS.qa_automation.role}</option>
                    </optgroup>
                    <optgroup label={t.groupData}>
                      <option value="data_engineer">{ROLE_PRESETS.data_engineer.label} — {ROLE_PRESETS.data_engineer.role}</option>
                      <option value="data_science">{ROLE_PRESETS.data_science.label} — {ROLE_PRESETS.data_science.role}</option>
                    </optgroup>
                    <optgroup label={t.groupManagement}>
                      <option value="system_architect">{ROLE_PRESETS.system_architect.label} — {ROLE_PRESETS.system_architect.role}</option>
                      <option value="product_manager">{ROLE_PRESETS.product_manager.label} — {ROLE_PRESETS.product_manager.role}</option>
                      <option value="uiux_designer">{ROLE_PRESETS.uiux_designer.label} — {ROLE_PRESETS.uiux_designer.role}</option>
                      <option value="cybersecurity">{ROLE_PRESETS.cybersecurity.label} — {ROLE_PRESETS.cybersecurity.role}</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Block 2: Role Title & Age */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-3">
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    {pr.roleLabel}
                  </label>
                  <input
                    type="text"
                    value={profile.role}
                    onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                    placeholder={t.rolePlaceholder}
                    className="w-full bg-[#131418] border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors font-sans"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    {pr.ageLabel}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="16"
                      max="75"
                      value={profile.age}
                      onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || 18 })}
                      className="w-full bg-[#131418] border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-xl px-3 py-2 text-sm font-mono text-zinc-100 focus:outline-none transition-colors text-center"
                    />
                    <span className="text-xs text-zinc-400 font-mono shrink-0">{pr.yearsOld}</span>
                  </div>
                </div>
              </div>

              {/* Block 3: Tech Stack Tags Box */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <span>{pr.stackLabel}</span>
                    <span className="text-zinc-500 font-mono text-[11px]">({profile.techStack.length})</span>
                  </label>
                  <span className="text-[11px] text-zinc-500">{t.deleteTagHint}</span>
                </div>

                {/* Active Stack Tags Cloud */}
                <div className="flex flex-wrap gap-1.5 min-h-[46px] p-2.5 rounded-xl bg-[#131418] border border-zinc-800 items-center">
                  {profile.techStack.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-zinc-800 text-zinc-200 border border-zinc-700/60 hover:border-zinc-500 transition-colors"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-zinc-400 hover:text-rose-400 font-bold px-0.5 rounded cursor-pointer transition-colors"
                        title="Remove"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                {/* Add Custom Tag Row */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder={t.tagPlaceholder}
                    className="flex-1 bg-[#131418] border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-xl px-3.5 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 border border-zinc-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{pr.addTech}</span>
                  </button>
                </div>

                {/* Clean inline suggestions */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                  <span className="text-[11px] text-zinc-400">{t.quickAdd}</span>
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
                      className="text-[11px] font-mono text-zinc-400 hover:text-zinc-100 hover:underline cursor-pointer transition-colors px-1"
                    >
                      +{sugg}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <p className="text-xs text-zinc-400 leading-relaxed">
                {t.projInfo}
              </p>

              {profile.petProjects.length === 0 ? (
                <div className="text-center py-10 px-4 rounded-2xl bg-zinc-800/30 border border-zinc-800">
                  <FolderGit2 className="w-9 h-9 text-zinc-500 mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-zinc-400 mb-4">{t.noProjects}</p>
                  <button
                    type="button"
                    onClick={handleAddProject}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-xs font-medium text-zinc-200 border border-zinc-700 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{pr.addProject}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {profile.petProjects.map((proj, idx) => (
                    <div
                      key={proj.id}
                      className="p-4 sm:p-5 rounded-2xl bg-zinc-800/35 border border-zinc-800/90 space-y-3.5"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                        <div className="flex items-center gap-2">
                          <FolderGit2 className="w-4 h-4 text-zinc-400" />
                          <span className="text-xs font-semibold text-zinc-200">
                            {t.projectCardTitle} #{idx + 1}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(proj.id)}
                          className="text-xs text-zinc-400 hover:text-rose-400 flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Delete project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{t.projectCardDelete}</span>
                        </button>
                      </div>

                      {/* Field 1: Project Name */}
                      <div>
                        <label className="text-xs font-semibold text-zinc-300 block mb-1">
                          {t.projNameLabel}
                        </label>
                        <input
                          type="text"
                          value={proj.name}
                          onChange={(e) => handleUpdateProject(proj.id, 'name', e.target.value)}
                          placeholder="Наприклад: High-Performance SaaS Platform"
                          className="w-full bg-[#131418] border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none font-sans"
                        />
                      </div>

                      {/* Field 2: Description & Architecture */}
                      <div>
                        <label className="text-xs font-semibold text-zinc-300 block mb-1">
                          {t.projDescLabel}
                        </label>
                        <textarea
                          rows={2}
                          value={proj.description}
                          onChange={(e) => handleUpdateProject(proj.id, 'description', e.target.value)}
                          placeholder="Короткий опис: яку задачу вирішує та які ключові технології використані"
                          className="w-full bg-[#131418] border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-xl px-3.5 py-2 text-xs text-zinc-300 placeholder-zinc-500 focus:outline-none leading-relaxed font-sans"
                        />
                      </div>

                      {/* Field 3: Key Technical Highlight */}
                      <div>
                        <label className="text-xs font-semibold text-zinc-300 block mb-1">
                          {t.projHighlightLabel}
                        </label>
                        <textarea
                          rows={2}
                          value={proj.keyHighlight}
                          onChange={(e) => handleUpdateProject(proj.id, 'keyHighlight', e.target.value)}
                          placeholder="Головне досягнення чи оптимізація (ШІ розкаже про це як про ваш успішний кейс)"
                          className="w-full bg-[#131418] border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-xl px-3.5 py-2 text-xs text-zinc-300 placeholder-zinc-500 focus:outline-none leading-relaxed font-sans"
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddProject}
                    className="w-full py-3 rounded-xl border border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-800/20 hover:bg-zinc-800/50 text-xs font-medium text-zinc-300 hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{pr.addProject}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'context' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <p className="text-xs text-zinc-400 leading-relaxed">
                {t.contextInfo}
              </p>

              {/* Job Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  {t.jobTitle}
                </label>
                <textarea
                  rows={4}
                  value={profile.jobDescription || ''}
                  onChange={(e) => setProfile({ ...profile, jobDescription: e.target.value })}
                  placeholder={pr.jobPlaceholder}
                  className="w-full bg-[#131418] border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none leading-relaxed font-sans"
                />
              </div>

              {/* CV Context */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  {t.cvTitle}
                </label>
                <textarea
                  rows={4}
                  value={profile.cvContext || ''}
                  onChange={(e) => setProfile({ ...profile, cvContext: e.target.value })}
                  placeholder={pr.cvPlaceholder}
                  className="w-full bg-[#131418] border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none leading-relaxed font-sans"
                />
              </div>

              {/* Custom Bio / Instructions */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  {t.bioTitle}
                </label>
                <textarea
                  rows={3}
                  value={profile.customContext}
                  onChange={(e) => setProfile({ ...profile, customContext: e.target.value })}
                  placeholder={pr.bioPlaceholder}
                  className="w-full bg-[#131418] border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none leading-relaxed font-sans"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-t border-zinc-800/80 bg-[#18191E] flex-shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer px-2 py-1 rounded-lg"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{pr.reset}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer border border-zinc-700/80"
            >
              {pr.cancel}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/10 active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{pr.save}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
