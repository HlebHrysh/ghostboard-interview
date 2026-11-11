/**
 * CV Battle Cards Generator
 * Dynamically synthesizes 6 high-yield interview flashcards tailored to
 * candidate's primaryStack, experienceLevel, role, and cvContext.
 */

export interface CVBattleCard {
  id: string;
  title: string;
  domain: string;
  domainBadge: string;
  hook: string;
  pillars: [string, string, string];
  trap: {
    question: string;
    counterAnswer: string;
  };
  codeSnippet?: string;
}

export interface GenerateCardsOptions {
  primaryStack?: string[];
  experienceLevel?: string;
  cvContext?: string;
  role?: string;
  locale?: string;
}

interface CardTemplate {
  domains: string[];
  domainBadge: string;
  generate: (level: string, isUa: boolean, cvSnippet: string) => CVBattleCard;
}

const CARD_TEMPLATES: Record<string, CardTemplate> = {
  react: {
    domains: ['react', 'next', 'frontend', 'typescript'],
    domainBadge: 'React 19 & Next.js Core',
    generate: (level, isUa) => ({
      id: 'card_react_concurrency',
      title: isUa
        ? 'Як React 19 Fiber обробляє конкурентні переходи (Concurrent Transitions) та уникнути Tearing?'
        : 'How does React 19 handle concurrent transitions and prevent UI tearing under high load?',
      domain: isUa ? 'Frontend Архітектура' : 'Frontend Architecture',
      domainBadge: 'React 19 & Next.js Core',
      hook: isUa
        ? '«У конкурентному режимі React більше не блокує головний потік браузера: рендеринг розбивається на пріоритетні кванти (lanes), а стабільність зовнішнього стану гарантується useSyncExternalStore».'
        : '«In concurrent mode, React yields back to the main thread between prioritized work lanes, relying on useSyncExternalStore for tear-free external state consistency».',
      pillars: [
        isUa
          ? 'Lanes Architecture: диференціація дискретних подій (кліки) від фонових переходів (startTransition)'
          : 'Lanes Priority: isolating discrete user clicks from deferred transition renders',
        isUa
          ? 'useSyncExternalStore: детермінований снапшот для Zustand/Redux без розсинхронізації під час тайм-слайсингу'
          : 'useSyncExternalStore: atomic snapshot reads preventing torn states during yield cycles',
        isUa
          ? 'Automatic Batching: групування всіх оновлень всередині промісів та таймерів в єдиний прохід'
          : 'Automatic Batching: coalescing async promise updates into single render passes',
      ],
      trap: {
        question: isUa
          ? '«Чи можна просто обернути складне обчислення в useMemo, щоб гарантувати що воно ніколи не перерахується повторно?»'
          : '«Can useMemo be treated as a semantic guarantee to never re-execute expensive computations?»',
        counterAnswer: isUa
          ? '«Ні, React розглядає useMemo лише як підказку оптимізації і може скинути кеш при дефіциті пам’яті; для незмінних семантичних посилань слід використовувати useRef або зовнішній кеш».'
          : '«No, React treats useMemo strictly as a performance hint and can purge cached values under memory pressure; use useRef or module caching for semantic guarantees».',
      },
      codeSnippet: `const value = useSyncExternalStore(\n  store.subscribe,\n  store.getSnapshot,\n  store.getServerSnapshot\n);`,
    }),
  },

  backend_db: {
    domains: ['postgres', 'sql', 'database', 'backend', 'node', 'go'],
    domainBadge: 'PostgreSQL & MVCC Transactions',
    generate: (level, isUa) => ({
      id: 'card_pg_isolation',
      title: isUa
        ? 'Рівні ізоляції Read Committed vs Repeatable Read у PostgreSQL: де криється Write Skew?'
        : 'Read Committed vs Repeatable Read in PostgreSQL MVCC: where does Write Skew occur?',
      domain: isUa ? 'Бази даних & Highload' : 'Databases & Highload',
      domainBadge: 'PostgreSQL & MVCC Transactions',
      hook: isUa
        ? '«У Postgres MVCC ізоляція реалізована через видимість кортежів (xmin/xmax); Repeatable Read заморожує снапшот на початку першого запиту, але все ще вразливий до Write Skew без Serializable».'
        : '«Postgres MVCC operates on tuple visibility flags; Repeatable Read freezes transaction snapshots at the first statement, but remains susceptible to Write Skew anomalies».',
      pillars: [
        isUa
          ? 'Read Committed: кожен окремий SELECT бере новий актуальний снапшот бази'
          : 'Read Committed: re-evaluates snapshot visibility per query execution',
        isUa
          ? 'Repeatable Read: єдиний снапшот на всю транзакцію, кидає serialization_failure при конфлікті оновлення одного рядка'
          : 'Repeatable Read: transaction-wide snapshot aborting on concurrent row updates',
        isUa
          ? 'Write Skew Defeat: запобігання зміні пов’язаних неперетинних рядків через SELECT ... FOR UPDATE або SERIALIZABLE'
          : 'Write Skew Mitigation: locking disjoint overlapping predicates via SELECT ... FOR UPDATE or Serializable isolation',
      ],
      trap: {
        question: isUa
          ? '«Чи захищає рівень Repeatable Read від фантомного читання та втрати оновлень без явних блокувань?»'
          : '«Does Repeatable Read eliminate phantom reads and lost updates without explicit row locking?»',
        counterAnswer: isUa
          ? '«У PostgreSQL завдяки снапшотам фантоми відсутні в Repeatable Read, але Write Skew залишається; для захисту інваріантів бізнес-логіки необхідний або SELECT FOR UPDATE, або Serializable рівень».'
          : '«While Postgres snapshots prevent phantom reads under Repeatable Read, Write Skew still breaks compound constraints unless explicit row locks or Serializable are enforced».',
      },
      codeSnippet: `BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;\nSELECT balance FROM accounts WHERE id = 1 FOR UPDATE;`,
    }),
  },

  caching_distributed: {
    domains: ['redis', 'caching', 'distributed', 'system_design'],
    domainBadge: 'Distributed Caching & Highload',
    generate: (level, isUa) => ({
      id: 'card_cache_stampede',
      title: isUa
        ? 'Як усунути Cache Stampede (Dogpiling) під час раптового випадання гарячого ключа з TTL?'
        : 'How do you prevent Cache Stampede (Dogpiling) when hot keys expire under sudden traffic spikes?',
      domain: isUa ? 'Розподілені Системи' : 'Distributed Systems',
      domainBadge: 'Distributed Caching & Highload',
      hook: isUa
        ? '«Для захисту бази даних від падіння при інвалідації гарячого кешу ми комбінуємо Singleflight дедуплікацію запитів та ймовірнісне раннє оновлення (алгоритм XFetch)».'
        : '«To shield primary storage during sudden TTL eviction, we combine Singleflight request collapsing with probabilistic early refreshes via the XFetch algorithm».',
      pillars: [
        isUa
          ? 'Singleflight (Request Coalescing): якщо 1000 запитів запитують один ключ, лише перший іде в БД, інші чекають його Promise'
          : 'Singleflight Coalescing: only one worker hits the DB; concurrent callers share the pending promise',
        isUa
          ? 'Probabilistic Early Refresh (XFetch): delta * beta * ln(rand()) запускає фонове оновлення до повного згасання TTL'
          : 'Probabilistic Refresh (XFetch): background recomputations triggered asynchronously prior to hard expiry',
        isUa
          ? 'TTL Jitter (+- 15%): додавання випадкового зміщення до тайм-аутів для уникнення каскадного випадання'
          : 'TTL Jitter (+/- 15%): spreading expiration timestamps to eliminate synchronized cluster misses',
      ],
      trap: {
        question: isUa
          ? '«Чому звичайний Redis розподілений лок (SET NX EX) може зависнути або викликати каскадний таймаут сервісу?»'
          : '«Why can a naive Redis distributed lock (SET NX EX) freeze workers or trigger cascade timeouts?»',
        counterAnswer: isUa
          ? '«Якщо воркер зависне або GC зупинить процес довше ніж TTL блокування, інший воркер зайде паралельно; потрібен Redlock з fencing token або асинхронний Singleflight без блокування потоку».'
          : '«If node execution stalls or GC pauses outlast lock TTL, lock safety breaks; proper designs require monotonic fencing tokens or non-blocking singleflight concurrency».',
      },
    }),
  },

  idempotency_events: {
    domains: ['kafka', 'microservices', 'queue', 'payments', 'rabbitmq'],
    domainBadge: 'Event Sourcing & Outbox Pattern',
    generate: (level, isUa) => ({
      id: 'card_outbox_idempotency',
      title: isUa
        ? 'Як досягти Exactly-Once обробки подій та уникнути подвійних списань у платіжних сервісах?'
        : 'How do you guarantee Exactly-Once semantics and prevent double-spending in event-driven systems?',
      domain: isUa ? 'Мікросервіси & Події' : 'Microservices & Event Architecture',
      domainBadge: 'Event Sourcing & Outbox Pattern',
      hook: isUa
        ? '«У розподілених мережах фізично існує лише At-Least-Once доставка; справжній Exactly-Once досягається Transactional Outbox патерном та ідемпотентним консюмером з перевіркою хешу операції».'
        : '«Networks only guarantee At-Least-Once delivery; effective Exactly-Once is achieved via the Transactional Outbox pattern paired with idempotent consumers verifying unique transaction keys».',
      pillars: [
        isUa
          ? 'Transactional Outbox: подія записується в локальну SQL-таблицю в тій самій транзакції, що й бізнес-дані'
          : 'Transactional Outbox: atomic dual-write of business state and outbox events in a single DB transaction',
        isUa
          ? 'Idempotency Keys: клієнт передає UUIDv4, база фіксує UNIQUE constraint у таблиці оброблених транзакцій'
          : 'Idempotency Key Constraints: deduplicating retries via atomic unique constraints and state records',
        isUa
          ? 'CDC (Debezium): зчитування логів WAL бази даних без навантаження на пул підключень програми'
          : 'CDC / WAL Streaming: dispatching outbox messages to Kafka via log-tailing without polling latency',
      ],
      trap: {
        question: isUa
          ? '«Чи захищає 2-Phase Commit (2PC) від падінь сервісу краще, ніж Outbox патерн?»'
          : '«Is Two-Phase Commit (2PC) preferable over Transactional Outbox in modern cloud architectures?»',
        counterAnswer: isUa
          ? '«2PC є блокуючим протоколом: якщо координатор падає під час фази Commit, всі ресурси залишаються заблокованими; Outbox патерн локалізує транзакцію та забезпечує незрівнянно вищу доступність».'
          : '«2PC is a blocking protocol vulnerable to coordinator failures that lock shared tables; Transactional Outbox favors availability and fault isolation through local state commits».',
      },
      codeSnippet: `CREATE TABLE outbox_events (\n  id UUID PRIMARY KEY,\n  aggregate_type VARCHAR(64),\n  payload JSONB NOT NULL,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);`,
    }),
  },

  security_auth: {
    domains: ['security', 'auth', 'jwt', 'docker', 'api'],
    domainBadge: 'Application Security & Auth',
    generate: (level, isUa) => ({
      id: 'card_auth_security',
      title: isUa
        ? 'Чому збереження JWT у localStorage вважається XSS-вразливістю і як побудувати безпечну Token Rotation?'
        : 'Why is localStorage token storage vulnerable to XSS and how do you implement secure Token Rotation?',
      domain: isUa ? 'Безпека & Архітектура' : 'Security & Identity Architecture',
      domainBadge: 'Application Security & Auth',
      hook: isUa
        ? '«Будь-яка вразливість у 3rd-party npm-пакетах дає доступ до localStorage; автентифікація має базуватися на HttpOnly SameSite=Strict cookies з автоматичною ротацією Refresh Token».'
        : '«Any third-party script injection compromises localStorage credentials; production security mandates HttpOnly SameSite cookies with sliding Refresh Token Rotation».',
      pillars: [
        isUa
          ? 'HttpOnly + SameSite=Strict: повна ізоляція сесійних кукі від JavaScript контексту браузера'
          : 'HttpOnly SameSite Flagging: strictly prohibiting script access to authorization cookies',
        isUa
          ? 'Short-Lived Access Token: час життя 10-15 хвилин, зберігається тільки в пам’яті процесу'
          : 'Volatile In-Memory Access Tokens: keeping short-lived tokens in memory, never written to disk',
        isUa
          ? 'Token Family Invalidation: при повторному використанні старого Refresh Token вся родина сесій інвалідується'
          : 'Token Family Revocation: invalidating all associated sessions immediately if a spent refresh token is reused',
      ],
      trap: {
        question: isUa
          ? '«Якщо ми використовуємо HTTPS, чи можемо ми безпечно передавати токени в URL-параметрах або LocalStorage?»'
          : '«Does HTTPS encryption make it safe to store tokens in localStorage or query parameters?»',
        counterAnswer: isUa
          ? '«HTTPS шифрує трафік лише в каналі передачі, але не захищає від читання DOM через XSS у браузері або запису URL у серверні логи (access.log) та історію браузера».'
          : '«HTTPS secures data in transit only; it does not protect against DOM-level XSS reads in the client or credential leaks in server access logs and browser history».',
      },
    }),
  },

  node_concurrency: {
    domains: ['node', 'eventloop', 'async', 'performance'],
    domainBadge: 'Node.js Runtime & Event Loop',
    generate: (level, isUa) => ({
      id: 'card_node_eventloop',
      title: isUa
        ? 'У якій фазі Event Loop виконуються microtasks, process.nextTick та як виникає I/O Starvation?'
        : 'In which Event Loop phase do microtasks and process.nextTick execute, and how does starvation occur?',
      domain: isUa ? 'Node.js & Внутрішні Механізми' : 'Node.js Internals & Libuv',
      domainBadge: 'Node.js Runtime & Event Loop',
      hook: isUa
        ? '«Черга microtasks та process.nextTick спустошується повністю між кожною окремою фазою libuv, тому нескінченна рекурсія мікротасок призводить до повного блокування I/O опитування».'
        : '«Microtask and nextTick queues drain completely between every libuv phase; infinite microtask chains freeze the event loop and starve network I/O».',
      pillars: [
        isUa
          ? 'Priority Order: process.nextTick має абсолютний пріоритет перед чергою Promise.then microtasks'
          : 'Queue Precedence: process.nextTick fires ahead of standard Promise microtasks',
        isUa
          ? 'Phase Sequence: Timers → Pending I/O → Poll (I/O) → Check (setImmediate) → Close Callbacks'
          : 'Libuv Phases: Timers → Pending Callbacks → Poll → Check (setImmediate) → Close',
        isUa
          ? 'Threadpool Offload: DNS, fs та криптографія виконуються пулом потоків UV_THREADPOOL_SIZE (default 4)'
          : 'Threadpool Workers: heavy crypto, fs, and dns lookups delegated to UV_THREADPOOL_SIZE threads',
      ],
      trap: {
        question: isUa
          ? '«Чи запускається setTimeout(fn, 0) завжди швидше ніж setImmediate(fn) у будь-якому місці коду?»'
          : '«Does setTimeout(fn, 0) consistently execute before setImmediate(fn) across all contexts?»',
        counterAnswer: isUa
          ? '«Ні, всередині фази I/O callback (наприклад fs.readFile) setImmediate завжди виконується першим, оскільки фаза Check слідує безпосередньо після фази Poll».'
          : '«No, within an I/O cycle (e.g. inside an fs callback), setImmediate executes first because the Check phase immediately follows Poll».',
      },
      codeSnippet: `// Microtask Starvation Danger:\nfunction starve() {\n  process.nextTick(starve); // I/O never runs!\n}`,
    }),
  },
};

/**
 * Generates 6 high-yield battle cards tailored to candidate profile.
 */
export function generateCvBattleCards(options: GenerateCardsOptions = {}): CVBattleCard[] {
  const {
    primaryStack = ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Redis', 'Docker'],
    experienceLevel = 'Senior',
    cvContext = '',
    role = 'Software Engineer',
    locale = 'ua',
  } = options;

  const isUa = locale === 'ua';
  const stackTokens = [
    ...primaryStack.map((s) => s.toLowerCase()),
    role.toLowerCase(),
    cvContext.toLowerCase(),
  ];

  const matchedKeys: string[] = [];

  // Match domain keys based on user profile
  for (const [key, tpl] of Object.entries(CARD_TEMPLATES)) {
    const hits = tpl.domains.some((d) => stackTokens.some((token) => token.includes(d)));
    if (hits) {
      matchedKeys.push(key);
    }
  }

  // Ensure all 6 distinct templates are selected
  const allKeys = Object.keys(CARD_TEMPLATES);
  for (const k of allKeys) {
    if (matchedKeys.length >= 6) break;
    if (!matchedKeys.includes(k)) {
      matchedKeys.push(k);
    }
  }

  const cvSnippet = cvContext.slice(0, 100);

  return matchedKeys.slice(0, 6).map((key) => {
    const tpl = CARD_TEMPLATES[key] || CARD_TEMPLATES.react;
    return tpl.generate(experienceLevel, isUa, cvSnippet);
  });
}

/**
 * Exports cards formatted as high-density printable Markdown cheat-sheet.
 */
export function generateBattleCardsMarkdown(
  cards: CVBattleCard[],
  meta: { role?: string; level?: string; stack?: string[] } = {}
): string {
  const now = new Date().toLocaleDateString('uk-UA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let md = `# ⚡ GHOSTBOARD CV BATTLE CHEAT-SHEET: ${meta.role || 'Senior Software Engineer'} [${(meta.level || 'SENIOR').toUpperCase()}]\n\n`;
  md += `*Стек:* ${(meta.stack || ['TypeScript', 'React', 'Node.js', 'PostgreSQL']).join(', ')}  \n`;
  md += `*Згенеровано:* ${now} | *Готовність до інтервʼю:* 100%  \n\n`;
  md += `> **Інструкція:** Перегляньте ці 6 бойових карток за 5 хвилин до старту дзвінка. Кожна картка містить залізобетонну першу фразу вголос (Hook), 3 опорні архітектурні тези та контраргумент проти пастки інтервʼюера.\n\n`;
  md += `---\n\n`;

  cards.forEach((c, idx) => {
    md += `## Картка #${idx + 1}: ${c.title}\n`;
    md += `🏷️ **Домен:** \`${c.domainBadge}\` | **Категорія:** ${c.domain}\n\n`;
    md += `### 🗣️ Перша фраза вголос (Hook):\n`;
    md += `> ${c.hook}\n\n`;
    md += `### 📌 3 Ключові архітектурні якорі (Pillars):\n`;
    c.pillars.forEach((p) => {
      md += `1. **${p}**\n`;
    });
    md += `\n`;

    if (c.codeSnippet) {
      md += `\`\`\`typescript\n${c.codeSnippet}\n\`\`\`\n\n`;
    }

    md += `### ⚠️ Пастка рекрутера та контраргумент:\n`;
    md += `* **Пастка:** ${c.trap.question}\n`;
    md += `* **Контр-відповідь:** ${c.trap.counterAnswer}\n\n`;
    md += `---\n\n`;
  });

  md += `\n*Згенеровано платформою Ghostboard. Успішного проходження атестації!* 🚀\n`;
  return md;
}
