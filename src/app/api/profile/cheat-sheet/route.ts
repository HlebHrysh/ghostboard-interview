import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/serverDb';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export interface TrickyQuestionItem {
  id: string;
  question: string;
  category: string;
  whyTheyAsk: string;
  leadHook: string;
  keyPillars: string[];
  codeSnippet?: string;
  pitfall: string;
}

export interface SystemDesignTopic {
  title: string;
  pattern: string;
  tradeoffs: string;
  bestPractices: string[];
}

export interface BattleCheatSheetData {
  generatedAt: number;
  role: string;
  level: string;
  techStack: string[];
  readinessScore: number;
  elevatorPitch: {
    hook: string;
    body: string;
    metricsHighlighted: string[];
    conclusion: string;
  };
  trickyQuestions: TrickyQuestionItem[];
  battleCards?: Array<{
    id: string;
    title: string;
    domain: string;
    domainBadge: string;
    hook: string;
    pillars: string[];
    trap: {
      question: string;
      counterAnswer: string;
    };
    codeSnippet?: string;
  }>;
  systemDesign: SystemDesignTopic[];
  redFlags: Array<{ mistake: string; fix: string }>;
  reverseQuestions: string[];
}

// In-memory cache for ultra-fast repeated loads (userId/token -> CheatSheet)
const cheatSheetCache = new Map<string, BattleCheatSheetData>();

export async function GET(req: NextRequest) {
  try {
    const token =
      req.nextUrl.searchParams.get('token') ||
      req.cookies.get('ghostboard_session')?.value ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    const user = token ? await getSessionUser(token) : null;
    const cacheKey = user ? user.id : 'guest_cheat_sheet';

    const cached = cheatSheetCache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, cheatSheet: cached });
    }

    return NextResponse.json({ success: true, cheatSheet: null });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as { message?: string })?.message || 'Failed to fetch cheat sheet' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 20 per minute
    const rateLimit = await checkRateLimit(req, 20, 60000, 'cheat_sheet_gen');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const token =
      req.nextUrl.searchParams.get('token') ||
      req.cookies.get('ghostboard_session')?.value ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    const user = token ? await getSessionUser(token) : null;
    const body = await req.json().catch(() => ({}));

    const role = (body.role || user?.role || 'Senior Software Engineer').trim();
    const level = (body.level || 'senior').trim().toLowerCase();
    const techStack: string[] = Array.isArray(body.techStack) && body.techStack.length > 0
      ? body.techStack
      : ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'Redis'];
    const resumeContext = (body.resumeContext || user?.resumeContext || '').trim();
    const isUa = body.locale === 'ua' || !body.locale;

    const stackLower = techStack.map((t) => t.toLowerCase());

    // ───────────────────────── Dynamic Question Generator ─────────────────────────
    const questions: TrickyQuestionItem[] = [];

    // 1. Stack-specific deep dives
    if (stackLower.some((t) => t.includes('react') || t.includes('next'))) {
      questions.push({
        id: 'q_react_concurrency',
        category: 'React & Frontend Core',
        question: isUa
          ? 'Як саме React 19 та Fiber Reconciler обробляють Concurrent Transitions та як уникнути Tearing у useSyncExternalStore?'
          : 'How do React 19 concurrent transitions interact with the Fiber Reconciler, and how do you prevent tearing with useSyncExternalStore?',
        whyTheyAsk: isUa
          ? 'Перевіряють чи розуміє кандидат як влаштований Scheduler, тайм-слайсинг та роботу зі сторонніми сторами (Zustand, Redux).'
          : 'Testing deep knowledge of Scheduler time-slicing and tear-free external state synchronization.',
        leadHook: isUa
          ? 'У конкурентному режимі React рендерить дерево в пам\'яті кількома інкрементальними чанками без блокування головного потоку.'
          : 'In concurrent mode, React yields back to the browser main thread between lane-prioritized work units.',
        keyPillars: [
          'Lanes Architecture: пріоритезація кліків перед фоновими переходами',
          'useSyncExternalStore: гарантія узгодженості снапшоту під час переривань рендеру',
          'Tearing prevention: відкат незавершених дерев якщо зовнішній стан змінився',
        ],
        codeSnippet: `const state = useSyncExternalStore(\n  store.subscribe,\n  store.getSnapshot,\n  store.getServerSnapshot\n);`,
        pitfall: isUa
          ? 'Сказати що useEffect викликається синхронно або що useMemo гарантує семантичну незмінність об\'єкта.'
          : 'Assuming useEffect runs synchronously or that useMemo guarantees semantic retention.',
      });

      questions.push({
        id: 'q_rsc_server_actions',
        category: 'Next.js & SSR Architecture',
        question: isUa
          ? 'Як влаштована серіалізація пропсів між Server Components (RSC) та Client Components і які вразливості виникають при використанні Server Actions?'
          : 'How does props serialization work across RSC flight payloads and Client boundaries, and what security vectors exist in Server Actions?',
        whyTheyAsk: isUa
          ? 'Тестують практичний досвід з Next.js 14-16 App Router та розуміння чому не можна передавати функції чи цикли через клієнтську межу.'
          : 'Validates real production experience with RSC Flight payload boundaries and zero-trust public RPC endpoints.',
        leadHook: isUa
          ? 'Server Actions — це публічні HTTP POST ендпоінти, тому вони вимагають такої ж суворої валідації вхідних даних та аутентифікації, як REST API.'
          : 'Server Actions are public POST endpoints that expose direct RPC calls and must be guarded like standard public REST handlers.',
        keyPillars: [
          'RSC Flight Stream: компактний текстовий JSON-подібний протокол з ID компонентів',
          'Client boundary: props повинні бути валідними JSON-примітивами без секретів',
          'CSRF & Origin checks: валідація Host / Origin заголовків та Zod-схеми в кожному action',
        ],
        pitfall: isUa
          ? 'Вважати Server Actions закритими внутрішніми функціями, яким можна безумовно довіряти без Zod-перевірки.'
          : 'Treating Server Actions as private trusted code without runtime input schemas.',
      });
    }

    if (stackLower.some((t) => t.includes('node') || t.includes('typescript') || t.includes('backend'))) {
      questions.push({
        id: 'q_node_eventloop',
        category: 'Node.js Runtime & Memory',
        question: isUa
          ? 'У якій фазі Event Loop виконується setImmediate, process.nextTick та черга Promise microtasks, і як викликати Starvation?'
          : 'In which Event Loop phase do setImmediate, process.nextTick and Promise microtasks execute, and how does starvation occur?',
        whyTheyAsk: isUa
          ? 'Визначає різницю між junior/middle, що завчили визначення, і senior, що дебажив заблоковані сервери під 20k RPS.'
          : 'Separates surface knowledge from senior developers who diagnosed blocked threadpools under load.',
        leadHook: isUa
          ? 'Мікротаски та nextTick мають абсолютний пріоритет і вичищаються повністю після кожної поточної операції до переходу до наступної фази libuv.'
          : 'Microtask and nextTick queues drain completely between each libuv phase, making infinite recursion capable of starving I/O.',
        keyPillars: [
          'process.nextTick Queue: виконується негайно перед будь-якими Promise microtasks',
          'Check Phase: setImmediate запускається після Poll (I/O) фази',
          'Threadpool Offloading: криптографія та файлові операції у UV_THREADPOOL_SIZE (default 4)',
        ],
        codeSnippet: `// Microtask Starvation Example:\nfunction starve() {\n  Promise.resolve().then(starve);\n}`,
        pitfall: isUa
          ? 'Плутати setTimeout(fn, 0) і setImmediate, або стверджувати що Node.js багатопотоковий для всього коду.'
          : 'Confusing setTimeout(fn, 0) with setImmediate or claiming JS execution is multi-threaded.',
      });
    }

    if (stackLower.some((t) => t.includes('postgres') || t.includes('sql') || t.includes('database'))) {
      questions.push({
        id: 'q_pg_isolation',
        category: 'PostgreSQL & Database Engines',
        question: isUa
          ? 'Чим відрізняються рівні ізоляції Read Committed та Repeatable Read у PostgreSQL через MVCC, і що таке Write Skew?'
          : 'How do Read Committed and Repeatable Read differ under PostgreSQL MVCC, and what causes Write Skew anomalies?',
        whyTheyAsk: isUa
          ? 'Критично для платіжних систем, інвентарю та запобігання втраченим оновленням (Lost Updates).'
          : 'Essential for financial ledgers, inventory booking, and distributed locking.',
        leadHook: isUa
          ? 'У Postgres MVCC використовує xmin/xmax у хедерах кортежів; Repeatable Read фіксує снапшот на початку першого запиту транзакції.'
          : 'Postgres implements MVCC using tuple visibility headers; Repeatable Read locks the transaction snapshot at the first query.',
        keyPillars: [
          'Read Committed: кожен окремий SELECT бере новий актуальний снапшот',
          'Repeatable Read: єдиний снапшот на всю транзакцію, кидає serialization_failure при конфлікті',
          'Write Skew: аномалія, коли дві транзакції читають спільні дані і змінюють різні рядки, порушуючи інваріант',
        ],
        codeSnippet: `BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;\nSELECT * FROM accounts WHERE id = 1 FOR UPDATE;`,
        pitfall: isUa
          ? 'Думати що Repeatable Read захищає від усіх аномалій без Serializable або SELECT FOR UPDATE.'
          : 'Assuming Repeatable Read eliminates all race conditions without explicit locking or Serializable.',
      });
    }

    if (stackLower.some((t) => t.includes('redis') || t.includes('cache'))) {
      questions.push({
        id: 'q_redis_stampede',
        category: 'Caching & Resilience',
        question: isUa
          ? 'Як вирішити проблему Cache Stampede (Dogpiling) при раптовому випаданні гарячого ключа з TTL?'
          : 'How do you prevent Cache Stampede (Dogpiling) when a hot key expires under high concurrency?',
        whyTheyAsk: isUa
          ? 'Питання зі скринінгів HighLoad систем: перевіряє захист бази даних від миттєвого падіння.'
          : 'HighLoad question testing database survivability when key cache entries invalidate.',
        leadHook: isUa
          ? 'Для запобігання Cache Stampede використовують імовірнісне раннє оновлення (XFetch) або дедуплікацію запитів через Singleflight.'
          : 'Cache Stampede is mitigated either by probabilistic early expiration (XFetch algorithm) or in-flight singleflight request collapsing.',
        keyPillars: [
          'Singleflight pattern: лише 1 воркер іде в БД, решта чекають у черзі того самого Promise/каналу',
          'Probabilistic Early Expiry: delta * beta * ln(rand()) для оновлення у фоні до TTL',
          'Distributed Lock: Redis SET NX з коротким TTL на час регенерації',
        ],
        pitfall: isUa
          ? 'Пропонувати просто збільшити TTL або робити тупий sleep в надії що ключ з\'явиться.'
          : 'Suggesting a static sleep loop or merely increasing TTL without concurrency guards.',
      });
    }

    if (stackLower.some((t) => t.includes('docker') || t.includes('k8s') || t.includes('devops'))) {
      questions.push({
        id: 'q_k8s_graceful',
        category: 'Containers & Cloud Operations',
        question: isUa
          ? 'Що відбувається з мережевим трафіком під час видалення Pod у Kubernetes і навіщо потрібен preStop hook?'
          : 'What happens to active network ingress during a Kubernetes Pod termination, and why is a preStop hook required?',
        whyTheyAsk: isUa
          ? 'Перевіряє чи знає розробник як досягти Zero Downtime Deployment (502 Bad Gateway prevention).'
          : 'Tests if candidate can prevent 502/504 errors during rolling deployments.',
        leadHook: isUa
          ? 'Оновлення Endpoints у kube-proxy та відправка SIGTERM відбуваються асинхронно, тому без паузи pod закриє сокет до видалення з iptables.'
          : 'Kube-proxy endpoint de-registration and SIGTERM signal dispatch occur asynchronously, causing dropped packets without a preStop delay.',
        keyPillars: [
          'Race Condition: kube-proxy iptables update займає 1-3 секунди',
          'preStop sleep: затримка 5-10 секунд перед викликом SIGTERM серверу',
          'Graceful Shutdown: сервер припиняє приймати нові з\'єднання і дочікується існуючих запитів',
        ],
        codeSnippet: `lifecycle:\n  preStop:\n    exec:\n      command: ["/bin/sh", "-c", "sleep 5"]`,
        pitfall: isUa
          ? 'Вважати що kubelet миттєво відключає трафік перед відправкою SIGTERM.'
          : 'Believing traffic cutoff is instantaneously coordinated with process termination.',
      });
    }

    if (stackLower.some((t) => t.includes('go') || t.includes('golang'))) {
      questions.push({
        id: 'q_go_memory',
        category: 'Go Runtime Internals',
        question: isUa
          ? 'Як працює Escape Analysis у Go компіляторі і що викликає витік пам\'яті у Goroutines?'
          : 'How does Go compiler escape analysis determine heap vs stack allocations, and what causes goroutine leaks?',
        whyTheyAsk: isUa
          ? 'Тестує розуміння навантаження на Garbage Collector та асинхронного життєвого циклу.'
          : 'Tests GC overhead awareness and context lifetime management in microservices.',
        leadHook: isUa
          ? 'Якщо змінна переживає фрейм стеку (повернення вказівника чи передача в інтерфейс), компілятор ескейпить її в купу.'
          : 'Any variable whose lifetime cannot be proven to terminate with the stack frame escapes to the heap.',
        keyPillars: [
          'Escape triggers: повернення &struct, передача у fmt.Println (any/interface{}), невизначений розмір зрізу',
          'Goroutine leaks: блокування на незакритому небуферизованому каналі без context timeout',
          'pprof inspection: go tool pprof -alloc_space для аудиту виділень',
        ],
        pitfall: isUa
          ? 'Вважати що `new()` завжди виділяє в купі, а оголошення за значенням завжди на стеку.'
          : 'Believing new() forces heap allocation regardless of escape analysis.',
      });
    }

    if (stackLower.some((t) => t.includes('python') || t.includes('fastapi') || t.includes('django'))) {
      questions.push({
        id: 'q_py_gil',
        category: 'Python Concurrency & Asyncio',
        question: isUa
          ? 'Чому CPU-bound задачі не прискорюються через asyncio/threading у CPython і як масштабувати обчислення?'
          : 'Why do CPU-bound workloads fail to scale with asyncio or threading in CPython, and how do you achieve true parallelism?',
        whyTheyAsk: isUa
          ? 'Перевіряє реальне розуміння GIL (Global Interpreter Lock), multiprocessing та ProcessPoolExecutor.'
          : 'Checks understanding of the GIL, multiprocessing boundaries, and IPC overhead.',
        leadHook: isUa
          ? 'GIL дозволяє виконувати лише один байткод CPython за раз у межах процесу, тому потоки ефективні лише для блокуючого I/O.'
          : 'The GIL serializes CPython bytecode execution per process, restricting multi-threading benefits strictly to I/O-wait states.',
        keyPillars: [
          'asyncio: кооперативна багатозадачність в одному потоці для мережевих сокетів',
          'ProcessPoolExecutor / Celery: окремі процеси з власним адресним простором та GIL',
          'Python 3.13 free-threaded: експериментальне вимкнення GIL без шкоди для стабільності C-extensions',
        ],
        pitfall: isUa
          ? 'Спроба прискорити обчислення хешів чи парсинг масивів через threading.Thread.'
          : 'Attempting to parallelize compute-bound loops with asyncio.gather().',
      });
    }

    // Always fill up to 10 high-impact questions with universal architectural depth
    const universalQuestions: TrickyQuestionItem[] = [
      {
        id: 'q_distributed_idempotency',
        category: 'Distributed Systems',
        question: isUa
          ? 'Як гарантувати ідемпотентність платіжних операцій при ретраях у розподіленій системі?'
          : 'How do you guarantee payment idempotency across network retries in a distributed architecture?',
        whyTheyAsk: isUa
          ? 'Одне з улюблених питань на системний дизайн у фінтеху та e-commerce.'
          : 'Fundamental system design question for fintech, e-commerce, and transaction processing.',
        leadHook: isUa
          ? 'Ідемпотентність досягається клієнтським Idempotency-Key у заголовку, що атомарно лочиться в Redis або Postgres перед виконанням бізнес-логіки.'
          : 'Idempotency requires a unique client-generated Idempotency-Key atomically reserved in storage before processing side-effects.',
        keyPillars: [
          'Unique Constraint: таблиця idempotent_requests зі статусами PENDING, COMPLETED, FAILED',
          'Two-Phase Execution: атомарний INSERT або очікування результату паралельного запиту',
          'Payload hashing: перевірка, що тіло повторного запиту ідентичне первинному',
        ],
        pitfall: isUa
          ? 'Розраховувати на те, що клієнт сам не пошле повторний запит при таймауті.'
          : 'Relying on optimistic client behavior or trusting HTTP retry headers blindly.',
      },
      {
        id: 'q_cap_tradeoff',
        category: 'Architecture Trade-offs',
        question: isUa
          ? 'PACELC теорема: що обирає ваша система під час нормальної роботи коли немає мережевого розділення (Normal vs Partition)?'
          : 'PACELC theorem: what trade-off does your architecture make during normal operations without network partitions (Latency vs Consistency)?',
        whyTheyAsk: isUa
          ? 'Senior / Lead рівень: перевіряє чи знає кандидат PACELC як розширення CAP.'
          : 'Senior/Lead interview criterion validating modern distributed tradeoffs beyond simplified CAP.',
        leadHook: isUa
          ? 'CAP описує лише поведінку при збої (Partition), тоді як PACELC фіксує вибір між затримкою (Latency) та узгодженістю (Consistency) у штатному режимі.'
          : 'While CAP only addresses failure modes (Partition), PACELC governs the daily trade-off between Latency and Consistency.',
        keyPillars: [
          'PA/EL: DynamoDB / Cassandra обирають низьку затримку (L) за рахунок eventual consistency',
          'PC/EC: Spanner / Postgres обирають узгодженість (C) ціною збільшення RTT через кворуми',
          'Read-your-own-writes: маршрутизація запитів користувача на Primary репліку після мутації',
        ],
        pitfall: isUa
          ? 'Стверджувати що система може одночасно мати нульову затримку і миттєву строгу узгодженість через океан.'
          : 'Claiming a globally distributed database can provide strict consistency at zero latency cost.',
      },
      {
        id: 'q_security_jwt',
        category: 'Application Security',
        question: isUa
          ? 'Чому збереження JWT у localStorage є критичною вразливістю і як організувати безпечний Token Rotation?'
          : 'Why is storing access tokens in localStorage an XSS vulnerability, and how do you implement secure sliding session rotation?',
        whyTheyAsk: isUa
          ? 'Стандарт безпеки для Enterprise-проєктів: захист від крадіжки токенів через npm-залежності.'
          : 'Checks web security fundamentals and protection against third-party dependency injection.',
        leadHook: isUa
          ? 'Будь-який сторонній скрипт чи XSS-ін\'єкція може прочитати localStorage, тому токени повинні передаватися лише через HttpOnly SameSite=Strict cookies.'
          : 'Any XSS vulnerability exposes localStorage entirely; session credentials must reside in HttpOnly, SameSite cookies with short TTLs.',
        keyPillars: [
          'HttpOnly + Secure + SameSite=Lax/Strict: браузер блокує доступ з JavaScript',
          'Short-lived Access Token (15 хв) у пам\'яті RAM, Refresh Token в HttpOnly cookie',
          'Refresh Token Rotation: одноразове використання токена з інвалідацією всієї сім\'ї сесій при спробі реюза',
        ],
        pitfall: isUa
          ? 'Вважати що HTTPS повністю захищає від викрадення токена з localStorage.'
          : 'Believing HTTPS prevents JavaScript access to client-side storage.',
      },
      {
        id: 'q_db_indexing',
        category: 'Database Performance',
        question: isUa
          ? 'Чому порядок стовпців у складеному (composite) B-Tree індексі є вирішальним і коли індекс не використовується?'
          : 'Why is column ordering decisive in composite B-Tree indexes, and when does the query planner ignore them?',
        whyTheyAsk: isUa
          ? 'Одне з найчастіших практичних завдань при оптимізації повільних запитів на продакшені.'
          : 'Fundamental query tuning question for diagnosing slow production queries under index scan failure.',
        leadHook: isUa
          ? 'B-Tree індекс працює за правилом лівого префікса: стовпець з перевіркою на рівність (=) завжди повинен передувати діапазонним фільтрам (<, >, BETWEEN).'
          : 'Composite B-Tree indexes enforce leftmost-prefix matching: equality columns must precede range filters to prevent index skip-scans.',
        keyPillars: [
          'Leftmost Prefix Rule: індекс (A, B, C) ефективний для (A) та (A, B), але марний для пошуку тільки за (B, C)',
          'High Cardinality: рівності першими, діапазони останніми',
          'Covering Index (INCLUDE): додавання стовпців у листові вузли для Index-Only Scan без звернення до таблиці (Heap)',
        ],
        pitfall: isUa
          ? 'Створювати окремі індекси на кожне поле замість одного продуманого складеного індексу.'
          : 'Creating individual single-column indexes on every table column expecting PostgreSQL to merge them efficiently.',
      },
    ];

    universalQuestions.forEach((uq) => {
      if (questions.length < 10) questions.push(uq);
    });

    // ───────────────────────── System Design Blueprint ─────────────────────────
    const systemDesign: SystemDesignTopic[] = [
      {
        title: isUa ? 'Відмовостійка черга подій та Outbox Pattern' : 'Fault-Tolerant Event Queue & Transactional Outbox',
        pattern: 'Transactional Outbox + Debezium CDC / Polling Publisher',
        tradeoffs: isUa
          ? 'Атомарність зміни стану БД і відправки події в Kafka/RabbitMQ без distributed transactions (2PC).'
          : 'Guarantees dual-write consistency between relational state and event streaming without 2PC overhead.',
        bestPractices: [
          'Збереження події в outbox_events у тій самій SQL-транзакції',
          'CDC (Change Data Capture) зчитує WAL лог без навантаження на пул з\'єднань',
          'Idempotent consumers з перевіркою processed_events',
        ],
      },
      {
        title: isUa ? 'Багаторівневе кэшування (L1 In-Memory + L2 Distributed Redis)' : 'Multi-Tier Caching (L1 In-Memory + L2 Distributed Redis)',
        pattern: 'Near-Cache with Redis Pub/Sub Invalidation',
        tradeoffs: isUa
          ? 'Субмілісекундна віддача з локальної пам\'яті процесу ціною координації інвалідації через Pub/Sub.'
          : 'Sub-millisecond reads from local process heap with bus-driven cache invalidation broadcasts.',
        bestPractices: [
          'L1 LRU cache з коротким TTL (5-30с) для гарячих об\'єктів',
          'L2 Redis cluster для спільного стану між репліками',
          'Jitter у TTL (+- 15%) для запобігання синхронному випаданню ключів',
        ],
      },
      {
        title: isUa ? 'Шардування баз даних та Consistent Hashing' : 'Database Sharding & Consistent Hashing',
        pattern: 'Virtual Node Ring with Range / Hash Partitioning',
        tradeoffs: isUa
          ? 'Горизонтальне масштабування запису ціною ускладнення міжшардових JOIN та агрегацій.'
          : 'Unlocks horizontal write capacity at the expense of distributed multi-shard joins and distributed transactions.',
        bestPractices: [
          'Вибір природного Shard Key (напр. tenant_id або user_id)',
          'Virtual Nodes (100-200 на сервер) для рівномірного розподілу навантаження',
          'Асинхронна фонова реплікація та Read Replicas для важких аналітичних звітів',
        ],
      },
    ];

    // ───────────────────────── Tailored STAR Pitch ─────────────────────────
    let cvSummaryMention = '';
    if (resumeContext) {
      const firstLines = resumeContext.split('\n').filter((l: string) => l.trim().length > 15).slice(0, 3).join(' ');
      cvSummaryMention = firstLines.slice(0, 220);
    }

    const elevatorPitch = {
      hook: isUa
        ? `Я — ${role} з фокусом на високонавантажених відмовостійких сервісах, чистих архітектурних патернах та швидкому запуску бізнес-фіч.`
        : `I am a ${role} specializing in scalable microservices, high-throughput distributed systems, and rapid feature delivery.`,
      body: cvSummaryMention
        ? isUa
          ? `У моєму бекграунді: ${cvSummaryMention}. Останні роки я фокусувався на оптимізації latency, надійній інтеграції платіжних контурів та проєктуванні систем на ${techStack.slice(0, 4).join(', ')}.`
          : `Drawing from my background: ${cvSummaryMention}, my primary focus has been optimizing p99 latency, hardening core payment flows, and building modular systems with ${techStack.slice(0, 4).join(', ')}.`
        : isUa
        ? `Останні роки я проєктував та розвивав продакшен-сервіси на ${techStack.slice(0, 4).join(', ')}, автоматизував CI/CD пайплайни та вирішував задачі оптимізації запитів під реальним користувацьким трафіком.`
        : `Over recent years, I have architected and scaled production systems across ${techStack.slice(0, 4).join(', ')}, streamlining CI/CD and debugging performance bottlenecks under genuine user load.`,
      metricsHighlighted: [
        isUa ? 'Скорочення p99 latency на 35-45% завдяки оптимізації SQL-індексів та Redis' : 'Reduced p99 latency by 35-45% through composite index tuning and Redis caching',
        isUa ? 'Забезпечення 99.95% SLA доступності під час пікових промо-акцій' : 'Maintained 99.95% SLA uptime during high-concurrency surge events',
        isUa ? 'Zero-downtime міграції баз даних без блокування користувачів' : 'Executed zero-downtime schema migrations across distributed environments',
      ],
      conclusion: isUa
        ? 'У вашій команді я прагну вирішувати найскладніші технічні виклики, покращувати інженерну культуру та приносити вимірну цінність бізнесу з перших тижнів.'
        : 'In this role, I aim to tackle your most demanding technical hurdles, elevate engineering rigor, and drive measurable product impact.',
    };

    // ───────────────────────── Red Flags & Pitfalls ─────────────────────────
    const redFlags = [
      {
        mistake: isUa ? 'Починати писати код без уточнення обмежень та крайніх випадків' : 'Immediately coding without clarifying inputs, scales, and edge constraints',
        fix: isUa ? 'Завжди витрачайте перші 90 секунд на уточнення обсягу даних, null-значень та асимптотики' : 'Spend the first 90 seconds discussing throughput, data ranges, memory bounds, and empty states',
      },
      {
        mistake: isUa ? 'Мовчати більше 15 секунд під час роздумів над архітектурою' : 'Staying completely silent while designing or debugging algorithms',
        fix: isUa ? 'Думайте вголос: промовляйте гіпотези ("Розглянемо варіант із hash map, але якщо пам\'ять обмежена...")' : 'Think out loud: vocalize tradeoffs, hypotheses, and why certain data structures are rejected',
      },
      {
        mistake: isUa ? 'Критикувати минулого роботодавця або скаржитися на поганий легасі-код' : 'Badmouthing prior employers or disparaging team codebases',
        fix: isUa ? 'Формулюйте нейтрально через інженерні виклики та системні уроки, які ви винесли' : 'Frame legacy constraints constructively around the business context and technical lessons learned',
      },
      {
        mistake: isUa ? 'Казати "Це неможливо" замість аналізу trade-offs' : 'Saying "that is impossible" instead of evaluating architectural tradeoffs',
        fix: isUa ? 'Пояснюйте через CAP/PACELC: "Ми можемо гарантувати це, але ціною збільшення затримки на 200мс"' : 'Frame solutions through tradeoffs: "We can achieve strict durability, but at the cost of write throughput"',
      },
      {
        mistake: isUa ? 'Стверджувати що знаєте технологію на 100% або придумувати неіснуючі факти' : 'Faking answers or claiming 100% mastery of tools you only touched briefly',
        fix: isUa ? 'Чесно скажіть: "У продакшені я з цим конкретним нюансом не стикався, але логічно це працює так..."' : 'Acknowledge boundaries confidently: "I haven\'t encountered this edge case in production, but from first principles..."',
      },
    ];

    // ───────────────────────── Reverse Interview Questions ─────────────────────────
    const reverseQuestions = [
      isUa
        ? 'Який технічний борг чи архітектурне вузьке місце зараз найбільше гальмує продуктивність вашої інженерної команди?'
        : 'What technical debt or architectural bottleneck is currently having the biggest impact on engineering velocity?',
      isUa
        ? 'Як влаштований процес релізу: наскільки легко розробнику безпечно викотити фічу в прод і скільки займає відкат (rollback)?'
        : 'What does your release cycle look like, and how friction-free is it for an engineer to ship and rollback code in production?',
      isUa
        ? 'Які ключові інженерні метрики успіху (DORA metrics / SLA) відстежуються для цієї посади в перші 6 місяців?'
        : 'What are the defining engineering metrics of success (e.g. DORA, incident response, throughput) for this role over the first 6 months?',
      isUa
        ? 'Як у команді вирішуються суперечки щодо вибору технологій та архітектурних рішень (RFC, Tech Design Docs)?'
        : 'How does the team resolve technical disagreements when choosing between conflicting architectural proposals (RFCs, design reviews)?',
      isUa
        ? 'Що стало головною причиною відкриття цієї вакансії — розширення нового продуктового напрямку чи зміцнення ядра?'
        : 'What triggered the opening for this position — scaling out an existing pillar or pioneering a new product initiative?',
    ];

    const cheatSheetData: BattleCheatSheetData = {
      generatedAt: Date.now(),
      role,
      level,
      techStack,
      readinessScore: Math.min(85 + (techStack.length >= 4 ? 10 : 5), 98),
      elevatorPitch,
      trickyQuestions: questions.slice(0, 10),
      battleCards: questions.slice(0, 6).map((q) => ({
        id: q.id,
        title: q.question,
        domain: q.category,
        domainBadge: q.category,
        hook: q.leadHook,
        pillars: [
          q.keyPillars[0] || 'Core architecture and reliability',
          q.keyPillars[1] || 'Failure resilience and bottleneck mitigation',
          q.keyPillars[2] || 'Resource efficiency and error handling',
        ],
        trap: {
          question: isUa
            ? '«Як ваша система поведеться при раптовому випаданні або розділенні мережі?»'
            : '«How does this behave under sudden network partition or peak load?»',
          counterAnswer: q.pitfall,
        },
        codeSnippet: q.codeSnippet,
      })),
      systemDesign,
      redFlags,
      reverseQuestions,
    };

    // Cache result
    const cacheKey = user ? user.id : 'guest_cheat_sheet';
    cheatSheetCache.set(cacheKey, cheatSheetData);

    return NextResponse.json({
      success: true,
      cheatSheet: cheatSheetData,
    });
  } catch (err: unknown) {
    console.error('Cheat-sheet API error:', err);
    return NextResponse.json(
      { success: false, error: (err as { message?: string })?.message || 'Failed to generate cheat-sheet' },
      { status: 500 }
    );
  }
}
