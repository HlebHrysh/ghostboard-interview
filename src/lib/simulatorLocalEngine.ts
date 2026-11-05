/**
 * Simulator Local Engine & Knowledge Base
 * 
 * Provides:
 * 1. Speculative client-side auto-context pre-detection
 * 2. Pre-crafted high-fidelity answers for the 4 speed chips across all modifiers
 * 3. Dynamic Senior-grade structured synthesizer for arbitrary questions
 * 4. Zero-tag clean stream generation for instant Sub-200ms TTFT
 */

export type SimulatorModifier = 'normal' | 'shorter' | 'simpler' | 'code' | 're_angle';

export interface SimulatorBullet {
  anchor: string;
  text: string;
}

export interface SimulatorAnswer {
  contextBadge: string;
  hook: string;
  bullets: SimulatorBullet[];
  codeOrCase: {
    language: string;
    code: string;
    complexity?: string;
  };
  takeaway: string;
}

/**
 * Speculatively infers the technical domain and context badge from raw keystrokes/voice input.
 * Triggered at 0ms latency while typing.
 */
export function detectAutoContext(input: string): string {
  const q = input.trim().toLowerCase();
  if (!q) return '';

  // 1. PostgreSQL & Databases
  if (/(postgres|sql|індекс|индекс|b-tree|mvcc|explain|wal|acid|database|баз.*даних)/i.test(q)) {
    return '⚡ Auto-Context: Databases • PostgreSQL • Senior';
  }

  // 2. Frontend & JS Runtime
  if (/(react|js|javascript|event loop|node|v8|microtask|macrotask|libuv|hydration|next\.js|frontend|dom)/i.test(q)) {
    return '⚡ Auto-Context: Frontend • JS Runtime • Senior';
  }

  // 3. System Design & Highload
  if (/(redis|cache|kafka|rate limit|лімітер|highload|sharding|consistent hash|system design|load balanc)/i.test(q)) {
    return '⚡ Auto-Context: System Design • Highload';
  }

  // 4. OS & Concurrency
  if (/(процес|потік|thread|process|concurrency|mutex|deadlock|semaphore|goroutine|асинхрон|паралел)/i.test(q)) {
    return '⚡ Auto-Context: OS • Concurrency • Senior';
  }

  // 5. DevOps & Cloud
  if (/(docker|k8s|kubernetes|container|ci\/cd|terraform|aws|gcp|nginx)/i.test(q)) {
    return '⚡ Auto-Context: DevOps • Cloud & Infra • Senior';
  }

  // 6. Algorithms / LeetCode
  if (/(leetcode|binary search|tree|graph|dynamic programming|complexity|o\(n\))/i.test(q)) {
    return '⚡ Auto-Context: Algorithms • Core CS • Senior';
  }

  return '⚡ Auto-Context: Engineering • Senior Practitioner';
}

/**
 * Pre-crafted production answers for the 4 quick chips with modifier variants.
 */
const QUICK_CHIP_ANSWERS: Record<string, Record<SimulatorModifier, SimulatorAnswer>> = {
  'процес vs потік': {
    normal: {
      contextBadge: '⚡ Auto-Context: OS • Concurrency • Senior',
      hook: 'Головна відмінність — адресний простір: процес має повністю ізольовану пам’ять і власні дескриптори, а потоки живуть у спільному просторі одного процесу.',
      bullets: [
        {
          anchor: 'Ізоляція пам’яті',
          text: 'Краш одного потоку валить весь процес; краш процесу ізольований ядром ОС.',
        },
        {
          anchor: 'Ціна Context Switch',
          text: 'Перемикання потоків у 3–5 разів швидше, бо не скидається кеш сторінок (TLB).',
        },
        {
          anchor: 'IPC vs Shared Heap',
          text: 'Процеси спілкуються через пайпи, сокети чи shared memory, а потоки — напряму через пам’ять.',
        },
      ],
      codeOrCase: {
        language: 'rust',
        code: `// Lightweight OS thread vs process isolation
use std::thread;

let handle = thread::spawn(|| {
    // Shared heap, distinct call stack (8MB default on Linux)
    println!("Running in thread: minimal TLS overhead");
});
handle.join().unwrap();`,
        complexity: 'Context switch: Threads ~1-2µs (TLB hit) vs Process ~5-10µs (TLB flush)',
      },
      takeaway: 'Починай з ізоляції віртуальної пам’яті та TLB — це відрізняє Senior від Junior.',
    },
    shorter: {
      contextBadge: '⚡ Auto-Context: OS • Concurrency • Senior',
      hook: 'Процес — це ізольований простір пам’яті; потік — це одиниця виконання всередині процесу зі спільною купою.',
      bullets: [
        { anchor: 'Пам’ять', text: 'Процес має власний адресний простір, потоки ділять heap.' },
        { anchor: 'Оверхед', text: 'Створення потоку та перемикання значно легші для ядра.' },
        { anchor: 'Стабільність', text: 'Помилка пам’яті в потоці знищує всі сусідні потоки.' },
      ],
      codeOrCase: {
        language: 'bash',
        code: `$ ps -eLF | grep node # Перегляд LWP (Lightweight Processes) ядра Linux`,
        complexity: 'Cost: thread switch O(1) in CPU registers vs process page table remap',
      },
      takeaway: 'Лаконічно: спільна пам’ять проти ізоляції.',
    },
    simpler: {
      contextBadge: '⚡ Auto-Context: OS • Concurrency • Senior',
      hook: 'Уяви фабрику: процес — це окрема будівля зі своєю охороною, а потоки — це працівники в одній кімнаті, які користуються спільними інструментами.',
      bullets: [
        { anchor: 'Спільний стіл', text: 'Працівники-потоки можуть випадково перекинути чашку сусіда (race condition).' },
        { anchor: 'Окрема будівля', text: 'Якщо одна будівля-процес загориться, інші заводи продовжать працювати.' },
        { anchor: 'Швидкість', text: 'Покликати колегу в кімнаті швидше, ніж відправляти кур’єра на іншу фабрику.' },
      ],
      codeOrCase: {
        language: 'plaintext',
        code: `[Фабрика A (Процес 1)] -> Робітник 1, Робітник 2 (Спільний склад / Heap)
[Фабрика B (Процес 2)] -> Повна ізоляція, зв'язок лише поштою (IPC)`,
        complexity: 'Інтуїція: безпека ізоляції проти швидкості спілкування',
      },
      takeaway: 'Проста аналогія миттєво знімає напругу на співбесіді.',
    },
    code: {
      contextBadge: '⚡ Auto-Context: OS • Concurrency • Senior',
      hook: 'На рівні коду потоки мають доступ до єдиного стану, тому вимагають м’ютексів чи атоміків для захисту від data race.',
      bullets: [
        { anchor: 'Shared State', text: 'Спільна змінна в купі вимагає Arc<Mutex<T>> або atomics.' },
        { anchor: 'Synchronization', text: 'Без м’ютекса або CAS виникає UB і пошкодження пам’яті.' },
        { anchor: 'Zero-Copy', text: 'Обмін даними між потоками без серіалізації на відміну від IPC.' },
      ],
      codeOrCase: {
        language: 'go',
        code: `var counter int64
var wg sync.WaitGroup

// 100 goroutines (green threads) sharing memory
for i := 0; i < 100; i++ {
    wg.Add(1)
    go func() {
        defer wg.Done()
        atomic.AddInt64(&counter, 1) // Safe concurrent mutation
    }()
}
wg.Wait()`,
        complexity: 'Atomic CAS: O(1) lock-free, zero syscall overhead',
      },
      takeaway: 'Покажи ідіоматичний lock-free код замість банальних описів.',
    },
    re_angle: {
      contextBadge: '⚡ Auto-Context: OS • Concurrency • Senior',
      hook: 'У сучасному Highload ми обираємо модель не за термінами, а за пропускною здатністю: Epoll/Event Loop (Node) vs Goroutines (Go) vs OS Threads (Java).',
      bullets: [
        { anchor: 'C10k Проблема', text: '100k OS потоків покладуть пам’ять ядра через розмір стеків (2MB/thread).' },
        { anchor: 'Green Threads', text: 'Go/Erlang використовують кооперативне планування зі стеками від 2KB.' },
        { anchor: 'Fail-Isolation', text: 'У мікросервісах процеси ізолюють в Docker, мінімізуючи blast radius.' },
      ],
      codeOrCase: {
        language: 'plaintext',
        code: `100k Concurrency Comparison:
- OS Threads: 100k * 2MB = 200GB RAM (Deadlock risk, heavy kernel scheduler)
- Go Goroutines: 100k * 2KB = 200MB RAM (M:N work-stealing runtime)
- Event Loop: 1 Thread + non-blocking epoll (CPU bound bottlenecks)`,
        complexity: 'Memory footprint: Go ~2KB/goroutine vs Linux pthread ~8MB virtual',
      },
      takeaway: 'Архітектурний погляд на concurrency — найвищий бал у рекрутера.',
    },
  },

  'індекси в postgres': {
    normal: {
      contextBadge: '⚡ Auto-Context: Databases • PostgreSQL • Senior',
      hook: 'Індекси в Postgres — це окремі збалансовані структури даних (за замовчуванням B-Tree), які вказують на TID (Tuple ID: номер сторінки та офсет) у таблиці.',
      bullets: [
        {
          anchor: 'B-Tree Механіка',
          text: 'Шукає діапазони та точні значення за O(log N) дискових звернень через кеш буферів.',
        },
        {
          anchor: 'Покриваючі Індекси',
          text: 'Секція INCLUDE дозволяє виконати Index-Only Scan без звернення до дискового Heap.',
        },
        {
          anchor: 'Ціна Write Overhead',
          text: 'Кожен INSERT/UPDATE оновлює індексні сторінки та збільшує навантаження на WAL.',
        },
      ],
      codeOrCase: {
        language: 'sql',
        code: `-- High-performance covering index for frequent queries
CREATE INDEX CONCURRENTLY idx_users_org_active 
ON users (org_id, status) 
INCLUDE (email, created_at)
WHERE deleted_at IS NULL; -- Partial index saves 70% space`,
        complexity: 'Index-Only Scan: O(log N) depth, skips Heap visits via VM (Visibility Map)',
      },
      takeaway: 'Завжди згадай CREATE INDEX CONCURRENTLY та Visibility Map.',
    },
    shorter: {
      contextBadge: '⚡ Auto-Context: Databases • PostgreSQL • Senior',
      hook: 'B-Tree індекс зменшує пошук з лінійного O(N) до логарифмічного O(log N), зберігаючи вказівники на сторінки Heap.',
      bullets: [
        { anchor: 'B-Tree', text: 'Збалансоване дерево: корінь, проміжні вузли, листи з TID.' },
        { anchor: 'HOT Updates', text: 'Heap-Only Tuples уникають оновлення індексу, якщо колонка не змінилась.' },
        { anchor: 'Overhead', text: 'Уповільнює DML-операції та роздуває розмір бази (Bloat).' },
      ],
      codeOrCase: {
        language: 'sql',
        code: `EXPLAIN (ANALYZE, BUFFERS) 
SELECT email FROM users WHERE org_id = 42;`,
        complexity: 'Search: O(log_B N) where B=300-500 fanout factor',
      },
      takeaway: 'Коротко: B-Tree, HOT updates, індексний bloat.',
    },
    simpler: {
      contextBadge: '⚡ Auto-Context: Databases • PostgreSQL • Senior',
      hook: 'Уяви товсту енциклопедію: замість читати всі 1000 сторінок від початку, ти відкриваєш алфавітний покажчик наприкінці й одразу переходиш на потрібний аркуш.',
      bullets: [
        { anchor: 'Швидкий пошук', text: 'Ти знаходиш тему за 2 секунди замість 20 хвилин перегортання.' },
        { anchor: 'Оновлення книги', text: 'Коли автор домальовує новий розділ, покажчик доводиться переписувати заново.' },
        { anchor: 'Товщина книги', text: 'Якщо робити покажчик на кожне слово, енциклопедія стане вдвічі товстішою.' },
      ],
      codeOrCase: {
        language: 'plaintext',
        code: `[Покажчик: "Індекси" -> Стор. 412] ===(Швидкий стрибок)===> [Сторінка 412: Текст статті]
Без індексу: читаємо сторінку 1, 2, 3... до 412 (Sequential Scan)`,
        complexity: 'Аналогія: миттєвий покажчик проти перечитування всієї книги',
      },
      takeaway: 'Зрозуміла метафора доводить, що ти вмієш пояснювати складне просто.',
    },
    code: {
      contextBadge: '⚡ Auto-Context: Databases • PostgreSQL • Senior',
      hook: 'У продакшені ми будуємо складові та часткові індекси під конкретні фільтри, щоб уникнути зайвого читання Heap.',
      bullets: [
        { anchor: 'Leftmost Prefix', text: 'Складений індекс (a, b) працює для WHERE a=1 AND b=2 або тільки WHERE a=1.' },
        { anchor: 'Partial Filtering', text: 'WHERE status = active скорочує індекс на 90% при soft deletes.' },
        { anchor: 'GiST / GIN', text: 'Для JSONB або повнотекстового пошуку використовуємо GIN замість B-Tree.' },
      ],
      codeOrCase: {
        language: 'sql',
        code: `-- Partial GIN index for JSONB payloads
CREATE INDEX idx_orders_metadata ON orders 
USING gin (metadata jsonb_path_ops)
WHERE status = 'pending';

-- Fast containment query
SELECT id, total FROM orders 
WHERE metadata @> '{"priority": "high"}';`,
        complexity: 'GIN containment query: O(K log N) inverted index lookup',
      },
      takeaway: 'Покажи GIN/GiST чи partial index — це відразу рівень Staff Engineer.',
    },
    re_angle: {
      contextBadge: '⚡ Auto-Context: Databases • PostgreSQL • Senior',
      hook: 'У highload системах головна небезпека індексів — не пам’ять, а блокування DDL, Table Bloat та вакуум (autovacuum freeze locks).',
      bullets: [
        { anchor: 'Deadlocks на DDL', text: 'CREATE INDEX без CONCURRENTLY блокує всі writes (ShareLock).' },
        { anchor: 'Write Amplification', text: '10 індексів на таблиці множать I/O операції на кожен INSERT у 10 разів.' },
        { anchor: 'BRIN для Time-Series', text: 'Для логів використовуємо BRIN (Block Range Index): у 100 разів менший за B-Tree.' },
      ],
      codeOrCase: {
        language: 'sql',
        code: `-- BRIN index for massive 500M row time-series table
CREATE INDEX idx_audit_created_brin ON audit_logs 
USING brin (created_at) WITH (pages_per_range = 128);
-- Size: 15MB instead of 12GB for standard B-Tree!`,
        complexity: 'Storage footprint: BRIN ~0.1% of B-Tree, O(K) range scan speed',
      },
      takeaway: 'Озвуч BRIN проти B-Tree на великих обсягах — інтерв’юер буде вражений.',
    },
  },

  'event loop у js': {
    normal: {
      contextBadge: '⚡ Auto-Context: Frontend • JS Runtime • Senior',
      hook: 'Event Loop — це однопотоковий механізм координації, який виконує код у Call Stack, спорожняє чергу мікрозадач (Promises), а потім забирає макрозадачі з черги подій.',
      bullets: [
        {
          anchor: 'Пріоритет Мікрозадач',
          text: 'Promise.then і MutationObserver виконуються повністю перед будь-яким новим рендером чи таймером.',
        },
        {
          anchor: 'Рендер-пайплайн',
          text: 'requestAnimationFrame викликається безпосередньо перед фазою перерахунку стилів і композитингу браузера.',
        },
        {
          anchor: 'Libuv / V8 Поділ',
          text: 'V8 виконує JS, а неблокуючий I/O (мережу, файли, таймери) обслуговує пул потоків libuv.',
        },
      ],
      codeOrCase: {
        language: 'javascript',
        code: `console.log('1: Sync');
setTimeout(() => console.log('4: Macrotask (Timer)'), 0);
queueMicrotask(() => console.log('3: Microtask'));
Promise.resolve().then(() => console.log('2: Promise Microtask'));

// Output: 1 -> 3 -> 2 -> 4 (Microtask queue drained first!)`,
        complexity: 'Execution Order: Call Stack -> Microtasks Queue (All) -> RAF -> Render -> Macrotask (1)',
      },
      takeaway: 'Наголоси, що мікрозадачі вичищаються повністю за один цикл, викликаючи starvation.',
    },
    shorter: {
      contextBadge: '⚡ Auto-Context: Frontend • JS Runtime • Senior',
      hook: 'Event Loop безперервно перевіряє Call Stack: якщо він порожній, спочатку спорожняє чергу мікротасок, а потім запускає наступну макротаску.',
      bullets: [
        { anchor: 'Call Stack', text: 'Синхронний код виконується першим до повного виходу.' },
        { anchor: 'Microtasks', text: 'Promises, queueMicrotask — мають абсолютний пріоритет.' },
        { anchor: 'Macrotasks', text: 'setTimeout, setInterval, I/O події беруться по одній за тік.' },
      ],
      codeOrCase: {
        language: 'javascript',
        code: `// Starvation risk: recursive microtasks freeze the UI!
function block() { Promise.resolve().then(block); }`,
        complexity: 'UI Freeze: Call Stack starved indefinitely by unresolved microtask loop',
      },
      takeaway: 'Головне правило: мікрозадачі завжди випереджають макрозадачі.',
    },
    simpler: {
      contextBadge: '⚡ Auto-Context: Frontend • JS Runtime • Senior',
      hook: 'Уяви лікаря в кабінеті: він приймає пацієнта (Call Stack), потім одразу відповідає на термінові записки медсестри (Microtasks), і тільки потім викликає наступного із загальної черги в коридорі (Macrotasks).',
      bullets: [
        { anchor: 'Один лікар', text: 'JavaScript працює в одну руку — він не може робити дві операції одночасно.' },
        { anchor: 'Черга за дверима', text: 'Таймери чекають у коридорі, поки лікар повністю не звільниться.' },
        { anchor: 'Термінові справи', text: 'Обіцянки (Promises) — це термінові довідки, які підписуються поза чергою.' },
      ],
      codeOrCase: {
        language: 'plaintext',
        code: `[Кабінет Лікаря: Синхронний код]
      ↓ звільнився
[Стіл термінових записок: Promises / Microtasks] (вичищається повністю!)
      ↓ спорожнів
[Загальна черга в коридорі: setTimeout / DOM події] (береться по одній)`,
        complexity: 'Аналогія: пріоритет термінових записок над чергою в коридорі',
      },
      takeaway: 'Проста картина черги розсіює будь-яку плутанину.',
    },
    code: {
      contextBadge: '⚡ Auto-Context: Frontend • JS Runtime • Senior',
      hook: 'Щоб уникнути зависання інтерфейсу при важких обчисленнях, ми розбиваємо роботу на кванти за допомогою scheduler.yield() або MessageChannel.',
      bullets: [
        { anchor: 'Time Slicing', text: 'Розбиваємо O(N) масив на чанки по 16мс, повертаючи контроль браузеру.' },
        { anchor: 'scheduler.yield()', text: 'Сучасний стандарт React Concurrent / Chrome для cooperative scheduling.' },
        { anchor: 'MessageChannel', text: 'Швидше за setTimeout(0), який має вбудовану затримку ~4мс у браузері.' },
      ],
      codeOrCase: {
        language: 'typescript',
        code: `async function processHugeList(items: string[]) {
  for (let i = 0; i < items.length; i++) {
    processItem(items[i]);
    // Yield to let browser paint and handle user clicks
    if (i % 500 === 0 && 'scheduler' in window) {
      await (window as unknown as { scheduler: { yield: () => Promise<void> } }).scheduler.yield();
    }
  }
}`,
        complexity: 'Frame budget: keeps execution slice under 16.6ms for 60 FPS fluidity',
      },
      takeaway: 'Згадай scheduler.yield() чи React Time Slicing замість сухої теорії.',
    },
    re_angle: {
      contextBadge: '⚡ Auto-Context: Frontend • JS Runtime • Senior',
      hook: 'Event Loop у Node.js кардинально відрізняється від браузерного: у Node є 6 чітких фаз libuv (Timers, Pending I/O, Idle, Poll, Check/setImmediate, Close).',
      bullets: [
        { anchor: 'setImmediate vs setTimeout', text: 'setImmediate виконується у фазі Check, гарантовано після циклу I/O.' },
        { anchor: 'process.nextTick', text: 'Специфічна черга Node, яка спрацьовує навіть раніше за Promise microtasks.' },
        { anchor: 'Worker Threads', text: 'Для CPU-intensive операцій виносимо код у Worker Threads, щоб не блокувати Poll фазу.' },
      ],
      codeOrCase: {
        language: 'javascript',
        code: `// Node.js specific ordering
setTimeout(() => console.log('timer'), 0);
setImmediate(() => console.log('immediate'));
process.nextTick(() => console.log('nextTick')); // Runs before ALL promises!`,
        complexity: 'Order: process.nextTick -> Promise Microtask -> Poll/Check Phases',
      },
      takeaway: 'Різниця між браузерним Event Loop та фазами Node.js libuv — 100% Senior.',
    },
  },

  'проектування rate limiter': {
    normal: {
      contextBadge: '⚡ Auto-Context: System Design • Highload',
      hook: 'На практиці я проєктую Rate Limiter за схемою Sliding Window Counter у Redis Cluster з локальним memory-буфером на Edge для захисту від сплесків.',
      bullets: [
        {
          anchor: 'Алгоритм Sliding Window',
          text: 'Запобігає 2x перевантаженню на межі вікна, яке виникає у Fixed Window Counter.',
        },
        {
          anchor: 'Атомарність через Lua',
          text: 'Один Lua-скрипт у Redis виконує ZREMRANGEBYSCORE, ZADD та EXPIRE за 1 round-trip.',
        },
        {
          anchor: 'Стратегія Fail-Open',
          text: 'Якщо Redis кластер недоступний, ми пропускаємо трафік, щоб не покласти сервіс.',
        },
      ],
      codeOrCase: {
        language: 'lua',
        code: `-- Atomic Sliding Window Limiter in Redis Lua
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local current = redis.call('ZCARD', key)
if current < limit then
    redis.call('ZADD', key, now, now)
    redis.call('EXPIRE', key, math.ceil(window / 1000))
    return 1 -- Allowed
end
return 0 -- Rate Limited`,
        complexity: 'Complexity: O(log N + M) where M is expired tokens. Space: O(limit) keys per user',
      },
      takeaway: 'Завжди озвучуй trade-off між точністю ліміту та навантаженням на Redis мережу.',
    },
    shorter: {
      contextBadge: '⚡ Auto-Context: System Design • Highload',
      hook: 'Найкраща архітектура — Sliding Window Counter на базі Redis Sorted Sets з fail-open деградацією.',
      bullets: [
        { anchor: 'Алгоритм', text: 'Sliding Window згладжує burst-трафік на межах інтервалів.' },
        { anchor: 'Атомарність', text: 'Lua-скрипт або Redis Cell гарантує консистентність без рейсів.' },
        { anchor: 'Надійність', text: 'Fail-open режим: падіння кешу не блокує користувачів.' },
      ],
      codeOrCase: {
        language: 'http',
        code: `HTTP/1.1 429 Too Many Requests
Retry-After: 30
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0`,
        complexity: 'Standard IETF rate-limit headers for client backoff',
      },
      takeaway: 'Коротко: Sliding window, Redis Lua, Fail-open.',
    },
    simpler: {
      contextBadge: '⚡ Auto-Context: System Design • Highload',
      hook: 'Уяви турнікет у метро з жетонами: у тебе є кошик на 10 жетонів, щосекунди туди падає один новий жетон; якщо бігти надто швидко — жетони закінчаться і турнікет не пропустить.',
      bullets: [
        { anchor: 'Кошик з жетонами', text: 'Це алгоритм Token Bucket: він дозволяє короткий сплеск, але обмежує середню швидкість.' },
        { anchor: 'Турнікет', text: 'Шлюз (API Gateway) перевіряє жетон перед тим, як пустити запит на сервери.' },
        { anchor: 'Зламаний турнікет', text: 'Краще пропустити людей безкоштовно (Fail-Open), ніж створити тисняву на вході.' },
      ],
      codeOrCase: {
        language: 'plaintext',
        code: `[Запит клієнта] -> [Є жетон у відрі?] -> ТАК: пропускаємо, забираємо жетон
                                   -> НІ: повертаємо 429 "Спробуйте через 5с"`,
        complexity: 'Аналогія: жетони в кошику рятують станцію від тисняви',
      },
      takeaway: 'Метафора з турнікетом метро пояснює Token Bucket за 10 секунд.',
    },
    code: {
      contextBadge: '⚡ Auto-Context: System Design • Highload',
      hook: 'Для ультра-високих навантажень (100k+ RPS) ми комбінуємо локальний In-Memory Token Bucket у процесі з періодичною синхронізацією в Redis.',
      bullets: [
        { anchor: 'Local Burst Cache', text: 'Клієнт бере пачку з 50 токенів у пам’ять, скорочуючи звернення до Redis на 98%.' },
        { anchor: 'Token Bucket Struct', text: 'Зберігає лише 2 числа: last_refill_timestamp та current_tokens.' },
        { anchor: 'Zero Latency', text: 'Перевірка за 10 наносекунд у пам’яті замість 1мс мережевого RTT.' },
      ],
      codeOrCase: {
        language: 'typescript',
        code: `class TokenBucket {
  private tokens: number;
  private last: number = Date.now();
  constructor(private capacity: number, private refillRatePerSec: number) {
    this.tokens = capacity;
  }
  consume(count = 1): boolean {
    const now = Date.now();
    this.tokens = Math.min(this.capacity, this.tokens + ((now - this.last) / 1000) * this.refillRatePerSec);
    this.last = now;
    if (this.tokens >= count) { this.tokens -= count; return true; }
    return false;
  }
}`,
        complexity: 'Memory: O(1) space per key (2 float values), O(1) CPU instructions',
      },
      takeaway: 'Покажи гібридний Local + Redis лімітер для справжнього Highload.',
    },
    re_angle: {
      contextBadge: '⚡ Auto-Context: System Design • Highload',
      hook: 'Головний виклик у розподіленому Rate Limiter на мульти-регіонах — це не алгоритм, а затримка реплікації (Cross-Region Sync Latency).',
      bullets: [
        { anchor: 'Split-Brain & Leaks', text: 'Синхронізація ліміту між US-East та EU-West через WAN призводить до подвійного ліміту.' },
        { anchor: 'Local Quotas', text: 'Рішення: ділимо глобальний ліміт на квоти за регіонами пропорційно історичному трафіку.' },
        { anchor: 'Tiered Limiting', text: '3 рівні захисту: Cloudflare WAF (DDoS) -> Nginx (IP) -> Redis/App (Tenant ID).' },
      ],
      codeOrCase: {
        language: 'plaintext',
        code: `Multi-Tier Highload Rate Limiting:
1. Cloudflare/Cloud Armor: 1M+ RPS volumetric IP rate limiting at Anycast edge
2. Envoy / Kong Gateway: 100k RPS Token bucket (sliding window in Envoy memory)
3. App Tier (Redis Cluster): 20k RPS business logic quotas (per-user tier, pricing plan)`,
        complexity: 'Defense-in-depth: Edge absorbs 95% junk before DB or Redis is touched',
      },
      takeaway: 'Multi-region квоти та tiered defense — відповідь рівня Principal Architect.',
    },
  },
};

/**
 * Normalized lookup key helper.
 */
function normalizeQuestionKey(question: string): string {
  const q = question.toLowerCase();
  if (/(процес|потік|thread|process)/i.test(q)) return 'процес vs потік';
  if (/(індекс|индекс|postgres|sql|b-tree)/i.test(q)) return 'індекси в postgres';
  if (/(event loop|івент луп|node.*loop|js.*loop)/i.test(q)) return 'event loop у js';
  if (/(rate limit|рейт ліміт|лімітер|rate-limit)/i.test(q)) return 'проектування rate limiter';
  return '';
}

/**
 * Dynamically synthesizes an ultra-crisp Senior response for any arbitrary question.
 */
function generateDynamicSeniorAnswer(question: string, modifier: SimulatorModifier): SimulatorAnswer {
  const contextBadge = detectAutoContext(question);
  const cleanQ = question.trim().replace(/[?!.]+$/, '');

  if (modifier === 'shorter') {
    return {
      contextBadge,
      hook: `У продакшені ми вирішуємо задачу «${cleanQ}» через надійну ідемпотентну архітектуру та ізоляцію ресурсів.`,
      bullets: [
        { anchor: 'Архітектура', text: 'Мінімалістична схема з передбачуваним часом відгуку.' },
        { anchor: 'Паралелізм', text: 'Неблокуюча асинхронна обробка черг без contention.' },
        { anchor: 'Моніторинг', text: 'SLA метрики p99, distributed tracing та алерт-політики.' },
      ],
      codeOrCase: {
        language: 'typescript',
        code: `// Fast verified pipeline execution
export async function handleQuery(ctx: Context): Promise<Result> {
  const span = tracer.startSpan('resolve_${cleanQ.slice(0, 16).replace(/\s+/g, '_')}');
  try {
    return await executeOptimized(ctx);
  } finally {
    span.end();
  }
}`,
        complexity: 'Latency p99 < 15ms, zero lock contention',
      },
      takeaway: 'Коротко, виважено і строго по суті.',
    };
  }

  if (modifier === 'simpler') {
    return {
      contextBadge,
      hook: `Якщо спростити, «${cleanQ}» працює так само, як регулювальник на перехресті: направляє потоки туди, де є вільне місце, і зупиняє затори.`,
      bullets: [
        { anchor: 'Проста логіка', text: 'Замість складних формул — чітке правило черговості та перевірки наявності місця.' },
        { anchor: 'Запобігання аваріям', text: 'Якщо один учасник зупиняється, вся система плавно оминає перешкоду.' },
        { anchor: 'Швидкий результат', text: 'Користувач отримує відповідь одразу, а важка робота доробляється у фоні.' },
      ],
      codeOrCase: {
        language: 'plaintext',
        code: `[Вхідний запит] ---> [Регулювальник / Шлюз] ---> [Вільний сервіс A]
                                             ---> [Вільний сервіс B] (рівномірний розподіл)`,
        complexity: 'Інтуїтивна модель: відсутність вузьких місць за рахунок простоти',
      },
      takeaway: 'Проста метафора демонструє глибоке розуміння речей.',
    };
  }

  if (modifier === 'code') {
    return {
      contextBadge,
      hook: `Реалізація «${cleanQ}» базується на надійному патерні з перевіркою граничних умов та обробкою помилок.`,
      bullets: [
        { anchor: 'Clean Contract', text: 'Типізований інтерфейс з валідацією вхідних даних на старті.' },
        { anchor: 'Zero Allocations', text: 'Мінімізація алокацій у критичному шляху виконання.' },
        { anchor: 'Fault Tolerance', text: 'Автоматичний retry з експоненційним бекоффом та circuit breaker.' },
      ],
      codeOrCase: {
        language: 'typescript',
        code: `export async function solveProblem<T>(input: T): Promise<ServiceResult<T>> {
  const backoff = new ExponentialBackoff({ maxRetries: 3, baseMs: 100 });
  return circuitBreaker.execute(async () => {
    return await db.transaction(async (tx) => {
      const state = await tx.acquireLock(input);
      return tx.applySafeMutation(state);
    });
  });
}`,
        complexity: 'Time Complexity: O(log N) indexed search • Space: O(1) persistent state',
      },
      takeaway: 'Ідіоматичний, стійкий до збоїв продакшен-код.',
    };
  }

  if (modifier === 're_angle') {
    return {
      contextBadge,
      hook: `Якщо подивитися на «${cleanQ}» під кутом відмовостійкості, ключовий trade-off — це узгодженість даних проти доступності під час збоїв мережі.`,
      bullets: [
        { anchor: 'CAP Trade-off', text: 'Чи готові ми віддавати stale data при деградації upstream-сервісів?' },
        { anchor: 'Backpressure', text: 'Захист внутрішніх баз від каскадного падіння при лавиноподібному навантаженні.' },
        { anchor: 'Alternative Path', text: 'Асинхронний Event-Driven підхід через Kafka замість синхронного RPC.' },
      ],
      codeOrCase: {
        language: 'plaintext',
        code: `Trade-off Matrix for "${cleanQ}":
- Sync RPC: Strong consistency, High latency coupling, Risk of cascading timeout
- Async Event Bus: Eventual consistency, Resilient backpressure, Decoupled scaling`,
        complexity: 'Decoupled Eventual Consistency: 99.99% Availability at 100k RPS',
      },
      takeaway: 'Senior-аргументація через системні trade-offs.',
    };
  }

  // Normal / Balanced
  return {
    contextBadge,
    hook: `На практиці для «${cleanQ}» я обираю рішення з прямим фокусом на продуктивність, передбачуваний стан та низький p99 latency.`,
    bullets: [
      { anchor: 'Архітектура', text: 'Розділення відповідальності без зайвих абстракцій та оверхеду.' },
      { anchor: 'Оптимізація I/O', text: 'Мінімізація мережевих кругообігів через кешування та батчинг.' },
      { anchor: 'Надійність', text: 'Ізоляція збоїв (bulkheading) та передбачувані таймаути на всіх рівнях.' },
    ],
    codeOrCase: {
      language: 'typescript',
      code: `// Resilient production implementation
export async function executeStrategy(params: Params): Promise<Response> {
  const cached = await localCache.get(params.id);
  if (cached) return cached;

  const result = await primaryCluster.query(params);
  await localCache.set(params.id, result, { ttl: 60 });
  return result;
}`,
      complexity: 'Cache Hit: O(1) < 1ms • Cache Miss: O(log N) DB query',
    },
    takeaway: 'Озвучуй спочатку метрики та практику, а вже потім деталі реалізації.',
  };
}

/**
 * Main query resolver: fetches instant Senior answer for any input and modifier.
 */
export function getLocalSimulatorAnswer(question: string, modifier: SimulatorModifier = 'normal'): SimulatorAnswer {
  const key = normalizeQuestionKey(question);
  if (key && QUICK_CHIP_ANSWERS[key]) {
    const chipSet = QUICK_CHIP_ANSWERS[key];
    return chipSet[modifier] || chipSet.normal;
  }
  return generateDynamicSeniorAnswer(question, modifier);
}
