'use client';

import React from 'react';
import { X, Sparkles, ExternalLink } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';

interface StealthQuickTestsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onInjectTest: (question: string) => void;
}

const DRAWER_I18N: Record<string, { title: string; subtitle: string; launch: string; mobileSim: string; close: string }> = {
  ua: {
    title: 'Тестові питання для перевірки',
    subtitle: 'Клікніть тему, щоб змоделювати питання інтервʼюера',
    launch: 'Запустити ↵',
    mobileSim: '📱 Симулятор інтервʼюера (Телефон)',
    close: 'Закрити',
  },
  en: {
    title: 'Quick Mock Test Questions',
    subtitle: 'Click any topic to simulate an incoming interviewer question',
    launch: 'Launch ↵',
    mobileSim: '📱 Mobile Interviewer Simulator',
    close: 'Close',
  },
  pl: {
    title: 'Pytania testowe do weryfikacji',
    subtitle: 'Kliknij temat, aby zasymulować pytanie rekrutera',
    launch: 'Uruchom ↵',
    mobileSim: '📱 Symulator rekrutera (Telefon)',
    close: 'Zamknij',
  },
  de: {
    title: 'Schnelle Testfragen',
    subtitle: 'Klicken Sie auf ein Thema, um eine Interviewfrage zu simulieren',
    launch: 'Starten ↵',
    mobileSim: '📱 Interviewer-Simulator (Telefon)',
    close: 'Schließen',
  },
  fr: {
    title: 'Questions de test rapides',
    subtitle: 'Cliquez sur un sujet pour simuler une question du recruteur',
    launch: 'Lancer ↵',
    mobileSim: '📱 Simulateur de recruteur (Mobile)',
    close: 'Fermer',
  },
  es: {
    title: 'Preguntas de prueba rápidas',
    subtitle: 'Haga clic en un tema para simular una pregunta del entrevistador',
    launch: 'Iniciar ↵',
    mobileSim: '📱 Simulador de entrevistador (Móvil)',
    close: 'Cerrar',
  },
  pt: {
    title: 'Perguntas de teste rápidas',
    subtitle: 'Clique em um tópico para simular uma pergunta do entrevistador',
    launch: 'Iniciar ↵',
    mobileSim: '📱 Simulador de entrevistador (Celular)',
    close: 'Fechar',
  },
  it: {
    title: 'Domande di test rapide',
    subtitle: "Clicca su un argomento per simulare una domanda dell'intervistatore",
    launch: 'Avvia ↵',
    mobileSim: '📱 Simulatore intervistatore (Mobile)',
    close: 'Chiudi',
  },
  cs: {
    title: 'Rychlé testovací otázky',
    subtitle: 'Klikněte na téma pro simulaci otázky tazatele',
    launch: 'Spustit ↵',
    mobileSim: '📱 Simulátor tazatele (Telefon)',
    close: 'Zavřít',
  },
  nl: {
    title: 'Snelle testvragen',
    subtitle: 'Klik op een onderwerp om een vraag van de interviewer te simuleren',
    launch: 'Starten ↵',
    mobileSim: '📱 Interviewer Simulator (Mobiel)',
    close: 'Sluiten',
  },
};

export const StealthQuickTestsDrawer: React.FC<StealthQuickTestsDrawerProps> = ({
  isOpen,
  onClose,
  onInjectTest,
}) => {
  const { locale } = useLocale();
  const isUa = locale === 'ua';
  const txt = DRAWER_I18N[locale] || DRAWER_I18N.en;

  const [activeCategory, setActiveCategory] = React.useState<string>('all');

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: isUa ? 'Всі' : 'All' },
    { id: 'frontend', label: 'Frontend' },
    { id: 'python', label: 'Python' },
    { id: 'backend', label: 'Java/Go/Node/.NET' },
    { id: 'mobile', label: 'Mobile' },
    { id: 'cloud', label: 'DevOps' },
    { id: 'qa_data', label: 'QA & Data/AI' },
    { id: 'system_design', label: 'System Design' },
    { id: 'soft_skills', label: 'HR / Intro' },
  ];

  const allTestChips = isUa
    ? [
        // Frontend
        {
          category: 'frontend',
          label: 'React Virtual DOM',
          q: 'Як працює Virtual DOM та алгоритм reconciliation у React 18+?',
          desc: 'Fiber tree, diffing algorithm, batching, concurrent rendering',
        },
        {
          category: 'frontend',
          label: 'useEffect vs useMemo',
          q: 'В чому різниця між useEffect, useMemo та useCallback — коли що використовувати?',
          desc: 'Dependency array, reference identity, memoization trade-offs',
        },
        {
          category: 'frontend',
          label: 'Next.js Server Components',
          q: 'Що таке React Server Components і як вони відрізняються від Client Components у Next.js?',
          desc: 'Zero-bundle-size, streaming SSR, hydration, direct DB access',
        },
        {
          category: 'frontend',
          label: 'TypeScript Generics',
          q: 'Поясни TypeScript generics, conditional types та mapped types на практичному прикладі.',
          desc: 'Type safety, inference, keyof, Record, Infer keyword',
        },
        // Python
        {
          category: 'python',
          label: 'FastAPI vs Django',
          q: 'Коли краще обрати FastAPI, а коли Django/DRF, і як влаштована асинхронність у FastAPI?',
          desc: 'Архітектура, async/await, Starlette, Pydantic vs Django ORM',
        },
        {
          category: 'python',
          label: 'Asyncio & GIL',
          q: 'Як працює Asyncio під капотом у Python і чому GIL не блокує I/O-bound операції?',
          desc: 'Event Loop, selectors, coroutines, Global Interpreter Lock',
        },
        {
          category: 'python',
          label: 'PostgreSQL B-Tree',
          q: 'Як працюють B-Tree індекси в PostgreSQL, коли виникає Seq Scan і що показує EXPLAIN ANALYZE?',
          desc: 'Блоки памʼяті, індексні сканування, селективність, vacuum',
        },
        {
          category: 'python',
          label: 'Celery & Redis',
          q: 'Як влаштована фонова черга задач Celery з брокером Redis і як запобігти втраті повідомлень?',
          desc: 'Acks late, prefetch count, visibility timeout, dead letter',
        },
        // Backend
        {
          category: 'backend',
          label: 'Spring Boot Architecture',
          q: 'Як влаштований життєвий цикл Spring Bean та чим Spring Boot відрізняється від легковагових фреймворків?',
          desc: 'ApplicationContext, IoC Container, Bean Post Processor, proxying',
        },
        {
          category: 'backend',
          label: 'Go Goroutines & Scheduler',
          q: 'Як влаштований планувальник Go (GMP model) і чим горутини відрізняються від системних потоків ОС?',
          desc: 'M:N scheduling, channel primitives, work-stealing algorithm',
        },
        {
          category: 'backend',
          label: 'NestJS Architecture',
          q: 'Як влаштована архітектура модулів та Dependency Injection у NestJS / Node.js?',
          desc: 'Providers, Controllers, Dependency Injection, Pipes, Interceptors',
        },
        {
          category: 'backend',
          label: 'ASP.NET Core & EF Core',
          q: 'Як оптимізувати запити в Entity Framework Core: AsNoTracking, Split Queries та виявлення проблем N+1?',
          desc: 'Expression trees, compiled queries, change tracker, database execution plan',
        },
        // Mobile
        {
          category: 'mobile',
          label: 'SwiftUI vs UIKit',
          q: 'Чим відрізняється декларативний UI в SwiftUI від імперативного UIKit, як влаштований життєвий цикл View?',
          desc: 'Declarative state binding, View modifiers, SwiftUI diff engine',
        },
        {
          category: 'mobile',
          label: 'Swift Concurrency',
          q: 'Як працює Swift Concurrency (async/await, Actors, TaskGroup) і як Actors запобігають data races?',
          desc: 'Data isolation, cooperative thread pool, Sendable protocol',
        },
        {
          category: 'mobile',
          label: 'Jetpack Compose & Kotlin',
          q: 'Як працює Recomposition у Jetpack Compose та як ефективно керувати станом за допомогою StateFlow?',
          desc: 'Compose compiler, slot table, stable types, remember, snapshot state',
        },
        // Cloud
        {
          category: 'cloud',
          label: 'Docker & Compose',
          q: 'Як влаштована мережа між контейнерами в Docker Compose і як налаштувати bridge network?',
          desc: 'DNS resolution, bridge driver, multi-stage builds, rootless containers',
        },
        {
          category: 'cloud',
          label: 'Kubernetes Pods vs Deployments',
          q: 'Чим Pod відрізняється від Deployment і коли використовувати StatefulSet замість Deployment?',
          desc: 'ReplicaSets, rolling updates, PVC volumes, headless services',
        },
        {
          category: 'cloud',
          label: 'CI/CD & Terraform',
          q: 'Опиши ідеальний CI/CD пайплайн з Terraform: state locks, drift detection та security scanning.',
          desc: 'Remote backend S3/DynamoDB, tfsec/checkov, automated PR checks',
        },
        // QA & Data/AI
        {
          category: 'qa_data',
          label: 'Playwright vs Cypress',
          q: 'Чому Playwright переважає Cypress для E2E тестування: multi-tab, WebSockets, паралелізація?',
          desc: 'CDP protocol, auto-waiting, browser contexts, mobile emulation',
        },
        {
          category: 'qa_data',
          label: 'Apache Spark Shuffling',
          q: 'Як працює RDD та DataFrame у Spark: lazy evaluation, shuffles, partitions та вузькі місця памʼяті?',
          desc: 'Stage boundaries, shuffle spills, broadcast joins, Catalyst optimizer',
        },
        {
          category: 'qa_data',
          label: 'RAG Architecture & Embeddings',
          q: 'Як працює RAG архітектура: embedding models, cosine similarity у векторній БД та reranking?',
          desc: 'Chunking strategies, FAISS/Pinecone, hybrid search, context window optimization',
        },
        // System Design
        {
          category: 'system_design',
          label: 'System Design: Real-time Chat',
          q: 'Спроєктуй real-time систему чату (Slack-подібну): архітектура, масштабування, збереження повідомлень.',
          desc: 'WebSockets, Redis pub/sub, Cassandra/PostgreSQL storage, message ordering',
        },
        {
          category: 'system_design',
          label: 'Microservices vs Monolith',
          q: 'Коли варто розбивати моноліт на мікросервіси та як вирішувати консистентність даних через Saga pattern?',
          desc: 'Choreography vs Orchestration, idempotency keys, outbox pattern',
        },
        // Soft skills
        {
          category: 'soft_skills',
          label: 'Про себе та досвід',
          q: 'Розкажи про себе та свій досвід. Що вважаєш своєю найсильнішою стороною як розробника?',
          desc: 'Elevator pitch, досягнення, стек технологій, карʼєрний фокус',
        },
        {
          category: 'soft_skills',
          label: 'Складна технічна проблема',
          q: 'Розкажи про найскладнішу технічну проблему, яку ти вирішив. Що зробив би інакше?',
          desc: 'STAR framework: Situation, Task, Action, Result, Lessons learned',
        },
      ]
    : [
        // Frontend
        {
          category: 'frontend',
          label: 'React Virtual DOM',
          q: 'How does the Virtual DOM and reconciliation algorithm work in React 18+?',
          desc: 'Fiber tree, diffing algorithm, batching, concurrent rendering',
        },
        {
          category: 'frontend',
          label: 'useEffect vs useMemo',
          q: 'What is the key difference between useEffect, useMemo, and useCallback?',
          desc: 'Dependency array, reference identity, memoization trade-offs',
        },
        {
          category: 'frontend',
          label: 'Next.js Server Components',
          q: 'What are React Server Components and how do they differ from Client Components in Next.js?',
          desc: 'Zero-bundle-size, streaming SSR, hydration, direct DB access',
        },
        {
          category: 'frontend',
          label: 'TypeScript Generics',
          q: 'Explain TypeScript generics, conditional types, and mapped types with a real-world example.',
          desc: 'Type safety, inference, keyof, Record, Infer keyword',
        },
        // Python
        {
          category: 'python',
          label: 'FastAPI vs Django',
          q: 'When should you choose FastAPI over Django/DRF, and how is async I/O handled under the hood in FastAPI?',
          desc: 'Starlette ASGI, Pydantic v2 validation, async/await event loops',
        },
        {
          category: 'python',
          label: 'Asyncio & Python GIL',
          q: 'How does Asyncio work under the hood in Python and why does the GIL not block I/O-bound operations?',
          desc: 'Event Loop, epoll/kqueue selectors, non-blocking sockets, OS thread preemption',
        },
        {
          category: 'python',
          label: 'PostgreSQL B-Tree Indexes',
          q: 'How do B-Tree indexes work in PostgreSQL, what triggers a Seq Scan, and what does EXPLAIN ANALYZE reveal?',
          desc: 'Page storage, buffer hit ratio, selectivity factor, index-only scans',
        },
        {
          category: 'python',
          label: 'Celery & Redis Queues',
          q: 'How is distributed task processing implemented with Celery and Redis, and how do you guarantee at-least-once delivery?',
          desc: 'Acks late, prefetch limits, visibility timeout, Dead Letter Queues',
        },
        // Backend
        {
          category: 'backend',
          label: 'Spring Boot Architecture',
          q: 'How does the Spring Bean lifecycle work and when do you choose Spring Boot over lightweight alternatives?',
          desc: 'ApplicationContext, IoC Container, Bean Post Processor, proxying',
        },
        {
          category: 'backend',
          label: 'Go Goroutines & Scheduler',
          q: 'How does the Go GMP scheduler work and how do goroutines differ from OS kernel threads?',
          desc: 'M:N scheduling, channel primitives, work-stealing algorithm',
        },
        {
          category: 'backend',
          label: 'NestJS Architecture',
          q: 'How does the module system and Dependency Injection work in NestJS / Node.js?',
          desc: 'Providers, Controllers, Dependency Injection, Pipes, Interceptors',
        },
        {
          category: 'backend',
          label: 'ASP.NET Core & EF Core',
          q: 'How do you optimize queries in EF Core: AsNoTracking, Split Queries, and avoiding client evaluation?',
          desc: 'Expression trees, compiled queries, change tracker, database execution plan',
        },
        // Mobile
        {
          category: 'mobile',
          label: 'SwiftUI vs UIKit',
          q: 'What are the architectural differences between declarative SwiftUI and imperative UIKit?',
          desc: 'Declarative state binding, View modifiers, SwiftUI diff engine',
        },
        {
          category: 'mobile',
          label: 'Swift Concurrency',
          q: 'How does Swift Concurrency (async/await, Actors, TaskGroup) prevent data races at compile time?',
          desc: 'Data isolation, cooperative thread pool, Sendable protocol',
        },
        {
          category: 'mobile',
          label: 'Jetpack Compose & Kotlin',
          q: 'How does Recomposition work in Jetpack Compose and how do you manage state with StateFlow?',
          desc: 'Compose compiler, slot table, stable types, remember, snapshot state',
        },
        // Cloud
        {
          category: 'cloud',
          label: 'Docker & Compose',
          q: 'How does container networking work in Docker Compose and how do you configure a bridge network?',
          desc: 'DNS resolution, bridge driver, multi-stage builds, rootless containers',
        },
        {
          category: 'cloud',
          label: 'Kubernetes Pods vs Deployments',
          q: 'How does a Pod differ from a Deployment and when would you use a StatefulSet?',
          desc: 'ReplicaSets, rolling updates, PVC volumes, headless services',
        },
        {
          category: 'cloud',
          label: 'CI/CD & Terraform',
          q: 'Describe an ideal production CI/CD pipeline with Terraform: state locks, drift detection and security gates.',
          desc: 'Remote backend S3/DynamoDB, tfsec/checkov, automated PR checks',
        },
        // QA & Data/AI
        {
          category: 'qa_data',
          label: 'Playwright vs Cypress',
          q: 'Why is Playwright preferred over Cypress for enterprise E2E testing: multi-tab, WebSockets, parallel execution?',
          desc: 'CDP protocol, auto-waiting, browser contexts, mobile emulation',
        },
        {
          category: 'qa_data',
          label: 'Apache Spark Shuffling',
          q: 'How do RDDs and DataFrames work in Apache Spark: lazy evaluation, shuffles, and memory management?',
          desc: 'Stage boundaries, shuffle spills, broadcast joins, Catalyst optimizer',
        },
        {
          category: 'qa_data',
          label: 'RAG Architecture & Embeddings',
          q: 'How does a RAG architecture work: embeddings, vector distance metrics (cosine/dot), and reranking?',
          desc: 'Chunking strategies, FAISS/Pinecone, hybrid search, context window optimization',
        },
        // System Design
        {
          category: 'system_design',
          label: 'System Design: Real-time Chat',
          q: 'Design a real-time messaging system (like Slack): architecture, scaling, message persistence.',
          desc: 'WebSockets, Redis pub/sub, Cassandra/PostgreSQL storage, message ordering',
        },
        {
          category: 'system_design',
          label: 'Microservices vs Monolith',
          q: 'When should a team decompose a monolith into microservices and how do you handle distributed transactions?',
          desc: 'Choreography vs Orchestration, idempotency keys, outbox pattern',
        },
        // Soft skills
        {
          category: 'soft_skills',
          label: 'About yourself',
          q: 'Tell me about yourself and your background. What do you consider your greatest engineering strength?',
          desc: 'Elevator pitch, accomplishments, tech stack focus, future aspirations',
        },
        {
          category: 'soft_skills',
          label: 'Complex technical challenge',
          q: 'Describe the most difficult technical challenge you solved. What would you do differently today?',
          desc: 'STAR framework: Situation, Task, Action, Result, Lessons learned',
        },
      ];

  const filteredChips = allTestChips.filter(
    (chip) => activeCategory === 'all' || chip.category === activeCategory
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl stealth-glass-panel rounded-3xl border border-white/10 p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">
                {txt.title}
              </h2>
              <p className="text-[11px] text-zinc-400 font-mono">
                {txt.subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 py-3 border-b border-white/5 flex-shrink-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2.5 py-1 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold'
                  : 'bg-white/5 text-zinc-400 hover:text-white border border-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Chips List */}
        <div className="py-3 space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-1">
          {filteredChips.map((chip) => (
            <button
              key={chip.label}
              onClick={() => {
                onInjectTest(chip.q);
                onClose();
              }}
              className="w-full text-left p-3 rounded-2xl bg-black/40 hover:bg-amber-950/30 border border-white/5 hover:border-amber-500/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono font-bold text-amber-300 group-hover:text-amber-200">
                  {chip.label}
                </span>
                <span className="text-[10px] font-mono text-zinc-500 group-hover:text-zinc-300">
                  {txt.launch}
                </span>
              </div>
              <p className="text-xs text-zinc-300 font-sans leading-snug line-clamp-2">
                {chip.q}
              </p>
              <p className="text-[10px] text-zinc-500 font-mono mt-1">
                {chip.desc}
              </p>
            </button>
          ))}
        </div>

        {/* Mobile Interviewer Simulator Link */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs flex-shrink-0">
          <a
            href="/interviewer.html"
            target="_blank"
            className="flex items-center gap-1.5 text-zinc-400 hover:text-cyan-300 font-mono text-xs transition-colors"
          >
            <span>{txt.mobileSim}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-mono text-xs transition-colors cursor-pointer"
          >
            {txt.close}
          </button>
        </div>
      </div>
    </div>
  );
};
