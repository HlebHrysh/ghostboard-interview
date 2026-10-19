/**
 * Comprehensive Python & Backend Technical Speech Normalizer.
 * Maps phonetic transcriptions, Cyrillic developer slang, and misheard audio
 * to exact industry-standard technical terms without recursive regex cascade corruption.
 */

const PHONETIC_RULES: Array<[RegExp, string]> = [
  // ── Core Python Internals & Concepts ────────────────────────────────
  [/(?<![\p{L}\p{N}])(джил|гил|глобал[\s-]*интерпретер[\s-]*лок|г[\s.]*и[\s.]*л)(?![\p{L}\p{N}])/giu, 'GIL (Global Interpreter Lock)'],
  [/(?<![\p{L}\p{N}])(эм[\s-]*эр[\s-]*о|мро|м[\s.]*р[\s.]*о)(?![\p{L}\p{N}])/giu, 'MRO (Method Resolution Order / C3 Linearization)'],
  [/(?<![\p{L}\p{N}])(дандер[\s-]*слотс|слотс|__slots__)(?![\p{L}\p{N}])/giu, '__slots__ (Memory Optimization)'],
  [/(?<![\p{L}\p{N}])(дандер(?:[а-яіїєґ]{0,3})?(?:[\s-]*(?:методи|методы|метод[а-яіїєґ]*))?|магические[\s-]*методы|магічні[\s-]*методи)(?![\p{L}\p{N}])/giu, 'Dunder methods (__init__, __call__, __repr__)'],
  [/(?<![\p{L}\p{N}])(пайтон[а-яіїєґ]*|пітон[а-яіїєґ]*|python)(?![\p{L}\p{N}])/giu, 'Python'],
  [/(?<![\p{L}\p{N}])(гарбидж[\s-]*коллектор|збирач[\s-]*сміття|сборщик[\s-]*мусора|референс[\s-]*каунтинг|підрахунок[\s-]*посилань)(?![\p{L}\p{N}])/giu, 'Garbage Collector & Reference Counting'],
  [/(?<![\p{L}\p{N}])(генератор[иів]*|генераторы|итератор[ыов]*|ітератор[иів]*|йілд|елд|yield)(?![\p{L}\p{N}])/giu, 'Generators & Iterators (yield)'],
  [/(?<![\p{L}\p{N}])(декоратор[иів]*|декораторы)(?![\p{L}\p{N}])/giu, 'Decorators (functools.wraps)'],
  [/(?<![\p{L}\p{N}])(контекстний[\s-]*менеджер|контекстный[\s-]*менеджер)(?![\p{L}\p{N}])/giu, 'Context Manager (__enter__, __exit__)'],
  [/(?<![\p{L}\p{N}])(метаклас[иів]*|метаклассы)(?![\p{L}\p{N}])/giu, 'Metaclasses (type.__new__)'],
  [/(?<![\p{L}\p{N}])(тайп[\s-]*хінти|тайп[\s-]*хинты|тайпінг|тайпинг|протокол[иів]*)(?![\p{L}\p{N}])/giu, 'Type Hints (typing, Protocol)'],
  [/(?<![\p{L}\p{N}])(датаклас[иів]*|датаклассы|dataclass)(?![\p{L}\p{N}])/giu, 'dataclass'],
  [/(?<![\p{L}\p{N}])(мультипроцесінг|мультипроцессинг)(?![\p{L}\p{N}])/giu, 'Multiprocessing (ProcessPoolExecutor)'],
  [/(?<![\p{L}\p{N}])(тредінг|трединг|многопоточность|багатопотоковість)(?![\p{L}\p{N}])/giu, 'Threading (ThreadPoolExecutor)'],
  [/(?<![\p{L}\p{N}])(пайтесті|пайтест|pytest)(?![\p{L}\p{N}])/giu, 'pytest'],
  [/(?<![\p{L}\p{N}])(фікстур[иа]|фикстур[ыа])(?![\p{L}\p{N}])/giu, 'pytest fixtures'],
  [/(?<![\p{L}\p{N}])(мокі|моки|манкіпатч|манкипатч|mock|monkeypatch)(?![\p{L}\p{N}])/giu, 'unittest.mock & monkeypatch'],
  [/(?<![\p{L}\p{N}])(профайлінг|профайлинг|сіпрофайл|cProfile)(?![\p{L}\p{N}])/giu, 'cProfile (Profiling)'],
  [/(?<![\p{L}\p{N}])(поетрі|поэтри|poetry|uv|рафф|ruff)(?![\p{L}\p{N}])/giu, 'Poetry / uv (Package Manager)'],

  // ── Asyncio & Concurrency (Specific / Compounds FIRST) ──────────────
  [/(?<![\p{L}\p{N}])(газер|гезер|асинк[\s-]*газер|asyncio\.gather)(?![\p{L}\p{N}])/giu, 'asyncio.gather'],
  [/(?<![\p{L}\p{N}])(таск[\s-]*груп|asyncio\.TaskGroup)(?![\p{L}\p{N}])/giu, 'asyncio.TaskGroup'],
  [/(?<![\p{L}\p{N}])(асінк[\s-]*авейт|асинк[\s-]*авейт|(?:асін[кц]|асин[кц])[а-яіїєґ]*)(?![\p{L}\p{N}])/giu, 'Asyncio (async/await)'],
  [/(?<![\p{L}\p{N}])(івент[\s-]*луп|івентлуп|евент[\s-]*луп|эвент[\s-]*луп)(?![\p{L}\p{N}])/giu, 'Event Loop (asyncio)'],
  [/(?<![\p{L}\p{N}])(корутин[иаы]|таск[иаы]|фьючерс[иы]?|future)(?![\p{L}\p{N}])/giu, 'Coroutine / Task / Future'],
  [/(?<![\p{L}\p{N}])(семафор[иы]?|мютекс[иы]?|лок[иы]?|lock)(?![\p{L}\p{N}])/giu, 'asyncio.Semaphore / Lock'],

  // ── Web Frameworks & API (DRF BEFORE Django) ────────────────────────
  [/(?<![\p{L}\p{N}])(д[\s.]*р[\s.]*ф|дрф|джанго[\s-]*рест[а-яіїєґ]*|джанґо[\s-]*рест[а-яіїєґ]*)(?![\p{L}\p{N}])/giu, 'DRF (Django REST Framework)'],
  [/(?<![\p{L}\p{N}])(джанго|джанґо|джангі)[а-яіїєґ]*(?![\p{L}\p{N}])/giu, 'Django'],
  [/(?<![\p{L}\p{N}])(фаст[\s-]*апі|фастапі|фаст[\s-]*апи|фастапи|fast[\s-]*api)(?![\p{L}\p{N}])/giu, 'FastAPI'],
  [/(?<![\p{L}\p{N}])(старлетт|старлет|starlette)(?![\p{L}\p{N}])/giu, 'Starlette'],
  [/(?<![\p{L}\p{N}])(підантік|пайдантік|пайдантик|пудантик|пайдентик|пайдантек)(?![\p{L}\p{N}])/giu, 'Pydantic v2'],
  [/(?<![\p{L}\p{N}])(ювікорн|ювикорн|увикорн|uvicorn)(?![\p{L}\p{N}])/giu, 'Uvicorn'],
  [/(?<![\p{L}\p{N}])(гунікорн|гуникорн|gunicorn)(?![\p{L}\p{N}])/giu, 'Gunicorn'],
  [/(?<![\p{L}\p{N}])(асгі|асги|asgi)(?![\p{L}\p{N}])/giu, 'ASGI'],
  [/(?<![\p{L}\p{N}])(всгі|всги|wsgi)(?![\p{L}\p{N}])/giu, 'WSGI'],
  [/(?<![\p{L}\p{N}])(діпенденсі[\s-]*інжекшн|депенденси[\s-]*инжекшн|впровадження[\s-]*залежностей|депси)(?![\p{L}\p{N}])/giu, 'Dependency Injection (Depends)'],
  [/(?<![\p{L}\p{N}])(мідлвара|мідлварі|мидлварь|мидлвары|миддлвар)(?![\p{L}\p{N}])/giu, 'Middleware'],
  [/(?<![\p{L}\p{N}])(лайфспен|лайфспан|lifespan)(?![\p{L}\p{N}])/giu, 'Lifespan context manager'],

  // ── Databases, SQL & ORM (SQLAlchemy BEFORE generic SQL) ────────────
  [/(?<![\p{L}\p{N}])(склалхімі[яї]|склалхимия|алхімія|алхимия|ескуель[\s-]*алхімія)(?![\p{L}\p{N}])/giu, 'SQLAlchemy 2.0'],
  [/(?<![\p{L}\p{N}])(но[\s-]*ес[\s-]*ку[\s-]*ель|ноу[\s-]*ес[\s-]*ку[\s-]*ель|ноу[\s-]*сиквел|но[\s-]*сиквел|ноускл|носкл|nosql)(?![\p{L}\p{N}])/giu, 'NoSQL'],
  [/(?<![\p{L}\p{N}])(ес[\s-]*ку[\s-]*ель|эс[\s-]*кью[\s-]*эль|сіквел|сиквел|скуэль|ескуель|sq[\s-]*l)(?![\p{L}\p{N}])/giu, 'SQL'],
  [/(?<![\p{L}\p{N}])(postgres(?:ql)?|постгрес(?:кюель)?|посгрес|постгріс|постгрі|постгре)[а-яіїєґa-z]*(?![\p{L}\p{N}])/giu, 'PostgreSQL'],
  [/(?<![\p{L}\p{N}])(мвцц|м[\s.]*в[\s.]*ц[\s.]*ц|mvcc)(?![\p{L}\p{N}])/giu, 'MVCC (Multi-Version Concurrency Control)'],
  [/(?<![\p{L}\p{N}])(алембік[а-яіїєґ]*|алембик[а-яіїєґ]*|міграці[а-яіїєґ]*|миграци[а-яіїєґ]*)(?![\p{L}\p{N}])/giu, 'Alembic (Migrations)'],
  [/(?<![\p{L}\p{N}])(б[\s-]*трі|бі[\s-]*трі|б[\s-]*дерево|б[\s-]*три|би[\s-]*три)(?![\p{L}\p{N}])/giu, 'B-Tree Index'],
  [/(?<![\p{L}\p{N}])(джін[\s-]*індекс|гин[\s-]*индекс|gin[\s-]*index)(?![\p{L}\p{N}])/giu, 'GIN Index'],
  [/(?<![\p{L}\p{N}])(гіст[\s-]*індекс|гист[\s-]*индекс|gist[\s-]*index)(?![\p{L}\p{N}])/giu, 'GiST Index'],
  [/(?<![\p{L}\p{N}])(експлейн[\s-]*аналайз|эксплейн[\s-]*аналайз|explain[\s-]*analyze)(?![\p{L}\p{N}])/giu, 'EXPLAIN ANALYZE'],
  [/(?<![\p{L}\p{N}])(автовакуум|вакуум|autovacuum|vacuum)(?![\p{L}\p{N}])/giu, 'VACUUM / Autovacuum (Postgres MVCC)'],
  [/(?<![\p{L}\p{N}])(вал[\s-]*лог|write[\s-]*ahead[\s-]*log|wal)(?![\p{L}\p{N}])/giu, 'WAL (Write-Ahead Logging)'],
  [/(?<![\p{L}\p{N}])(транзакці[їя]|транзакции|транзакций|асид|есід)(?![\p{L}\p{N}])/giu, 'ACID Transactions'],
  [/(?<![\p{L}\p{N}])(рівні[\s-]*ізоляції|уровни[\s-]*изоляции|isolation[\s-]*levels)(?![\p{L}\p{N}])/giu, 'Isolation Levels (Read Committed, Repeatable Read, Serializable)'],
  [/(?<![\p{L}\p{N}])(брудне[\s-]*читання|грязное[\s-]*чтение|dirty[\s-]*read)(?![\p{L}\p{N}])/giu, 'Dirty Read'],
  [/(?<![\p{L}\p{N}])(фантомне[\s-]*читання|фантомное[\s-]*чтение|phantom[\s-]*read)(?![\p{L}\p{N}])/giu, 'Phantom Read'],
  [/(?<![\p{L}\p{N}])(ен[\s-]*плюс[\s-]*один|проблема[\s-]*н[\s-]*плюс[\s-]*один|n\+1)(?![\p{L}\p{N}])/giu, 'N+1 Query Problem'],
  [/(?<![\p{L}\p{N}])(селект[\s-]*релейтед|select_related)(?![\p{L}\p{N}])/giu, 'select_related (SQL JOIN)'],
  [/(?<![\p{L}\p{N}])(префетч[\s-]*релейтед|prefetch_related)(?![\p{L}\p{N}])/giu, 'prefetch_related (In-memory prefetching)'],
  [/(?<![\p{L}\p{N}])(пул[\s-]*конектів|пул[\s-]*соединений|connection[\s-]*pool)(?![\p{L}\p{N}])/giu, 'Connection Pool (SQLAlchemy / PgBouncer)'],
  [/(?<![\p{L}\p{N}])(пджібаунсер|пиджибаунсер|пгбаунсер|pgbouncer)(?![\p{L}\p{N}])/giu, 'PgBouncer'],
  [/(?<![\p{L}\p{N}])(дедлок[иів]*|дедлоки|взаємне[\s-]*блокування)(?![\p{L}\p{N}])/giu, 'Deadlock'],
  [/(?<![\p{L}\p{N}])(шардінг|шардинг|шардування)(?![\p{L}\p{N}])/giu, 'Sharding'],
  [/(?<![\p{L}\p{N}])(партиціювання|партиционирование|partitioning)(?![\p{L}\p{N}])/giu, 'Table Partitioning'],
  [/(?<![\p{L}\p{N}])(реплікаці[яї]|репликаци[яи]|мастер[\s-]*слейв|мастер[\s-]*реплика)(?![\p{L}\p{N}])/giu, 'Replication (Master-Replica)'],
  [/(?<![\p{L}\p{N}])(джоін[иів]*|джойн[ыов]*)(?![\p{L}\p{N}])/giu, 'SQL JOIN (INNER, LEFT, FULL)'],
  [/(?<![\p{L}\p{N}])(о[\s.]*р[\s.]*м|орм)(?![\p{L}\p{N}])/giu, 'ORM'],

  // ── Queues, Caching & Events (Palatalization on Kafka) ────────────────
  [/(?<![\p{L}\p{N}])(селері|селери|селлери|целери|celery|seleri)[а-яіїєґa-z]*(?![\p{L}\p{N}])/giu, 'Celery'],
  [/(?<![\p{L}\p{N}])(редіс|редис|redis)[а-яіїєґa-z]*(?![\p{L}\p{N}])/giu, 'Redis (In-memory Data Store & Cache)'],
  [/(?<![\p{L}\p{N}])(реббіт[\s-]*емкю|раббіт[а-яіїєґ]*|ребіт[а-яіїєґ]*|rabbitmq)(?![\p{L}\p{N}])/giu, 'RabbitMQ'],
  [/(?<![\p{L}\p{N}])(кафк[а-яіїєґ]*|кафц[іе][а-яіїєґ]*|kafka)(?![\p{L}\p{N}])/giu, 'Kafka'],
  [/(?<![\p{L}\p{N}])(лру[\s-]*кеш[а-яіїєґ]*|лру|lru[\s-]*cache|lru)(?![\p{L}\p{N}])/giu, 'LRU Cache'],
  [/(?<![\p{L}\p{N}])(ордерд[\s-]*дікт[а-яіїєґ]*|ордерд[\s-]*дикт[а-яіїєґ]*|ordereddict|ordered[\s-]*dict)(?![\p{L}\p{N}])/giu, 'OrderedDict'],
  [/(?<![\p{L}\p{N}])(брокер[\s-]*повідомлень|message[\s-]*broker)(?![\p{L}\p{N}])/giu, 'Message Broker (RabbitMQ / Redis)'],
  [/(?<![\p{L}\p{N}])(дед[\s-]*леттер[\s-]*кью|длк|dlq)(?![\p{L}\p{N}])/giu, 'DLQ (Dead Letter Queue)'],
  [/(?<![\p{L}\p{N}])(інвалідація[\s-]*кешу|инвалидация[\s-]*кеша|cache[\s-]*invalidation)(?![\p{L}\p{N}])/giu, 'Cache Invalidation'],
  [/(?<![\p{L}\p{N}])(кеш[\s-]*стампід|cache[\s-]*stampede)(?![\p{L}\p{N}])/giu, 'Cache Stampede (Dogpiling)'],
  [/(?<![\p{L}\p{N}])(рейт[\s-]*лімітінг|рейт[\s-]*лимит|rate[\s-]*limit)(?![\p{L}\p{N}])/giu, 'Rate Limiting (Token Bucket / Leaky Bucket)'],

  // ── Distributed Systems, High Availability & Principles ─────────────
  [/(?<![\p{L}\p{N}])(теорем[а-яіїєґ]*[\s-]*кап|кап[\s-]*теорем[а-яіїєґ]*|teorema[\s-]*cup|cap[\s-]*theorem|cap[\s-]*теорем[а-яіїєґ]*|теорія[\s-]*кап)(?![\p{L}\p{N}])/giu, 'CAP Theorem (Consistency, Availability, Partition Tolerance)'],
  [/(?<![\p{L}\p{N}])(бейз[\s-]*концепція|base[\s-]*properties|eventual[\s-]*consistency|кінцева[\s-]*узгодженість)(?![\p{L}\p{N}])/giu, 'BASE (Eventual Consistency)'],
  [/(?<![\p{L}\p{N}])(консистентн[іы]сть|сильна[\s-]*узгодженість|strong[\s-]*consistency)(?![\p{L}\p{N}])/giu, 'Strong vs Eventual Consistency'],

  // ── Architecture, Protocols & Security ──────────────────────────────
  [/(?<![\p{L}\p{N}])(рест[\s-]*апі|рест[\s-]*апи|рестапі|restful)(?![\p{L}\p{N}])/giu, 'REST API'],
  [/(?<![\p{L}\p{N}])(графкюель|граф[\s-]*кю[\s-]*ель|graphql)(?![\p{L}\p{N}])/giu, 'GraphQL'],
  [/(?<![\p{L}\p{N}])(джі[\s-]*ер[\s-]*пі[\s-]*сі|грпк|г[\s-]*р[\s-]*п[\s-]*к|grpc)(?![\p{L}\p{N}])/giu, 'gRPC & Protobuf'],
  [/(?<![\p{L}\p{N}])(веб[\s-]*сокет[иів]*|вебсокет[ыов]*|websocket)(?![\p{L}\p{N}])/giu, 'WebSocket'],
  [/(?<![\p{L}\p{N}])(чиста[\s-]*архітектура|чистая[\s-]*архитектура|гексагональна)(?![\p{L}\p{N}])/giu, 'Clean / Hexagonal Architecture'],
  [/(?<![\p{L}\p{N}])(солід|солид|solid)(?![\p{L}\p{N}])/giu, 'SOLID Principles'],
  [/(?<![\p{L}\p{N}])(репозиторій[\s-]*патерн|паттерн[\s-]*репозиторий|repository)(?![\p{L}\p{N}])/giu, 'Repository Pattern'],
  [/(?<![\p{L}\p{N}])(юніт[\s-]*оф[\s-]*ворк|unit[\s-]*of[\s-]*work)(?![\p{L}\p{N}])/giu, 'Unit of Work'],
  [/(?<![\p{L}\p{N}])(джейсон[\s-]*веб[\s-]*токен|жвт|джвт|jwt)(?![\p{L}\p{N}])/giu, 'JWT (JSON Web Token)'],
  [/(?<![\p{L}\p{N}])(оаус|оаут|oauth2)(?![\p{L}\p{N}])/giu, 'OAuth2 (Bearer Token)'],
  [/(?<![\p{L}\p{N}])(корс[иы]?|cors)(?![\p{L}\p{N}])/giu, 'CORS (Cross-Origin Resource Sharing)'],
  [/(?<![\p{L}\p{N}])(ксрф|csrf)(?![\p{L}\p{N}])/giu, 'CSRF Protection'],

  // ── DevOps, Linux & Deploy (Multi-stage BEFORE Docker, Inflections on Docker/Terraform/Helm) ──
  [/(?<![\p{L}\p{N}])(мультистейдж[\s-]*білд|multi[\s-]*stage)(?![\p{L}\p{N}])/giu, 'Multi-stage Docker Build'],
  [/(?<![\p{L}\p{N}])(докер[\s-]*компоуз[а-яіїєґ]*|докер[\s-]*композ[а-яіїєґ]*|докер[а-яіїєґ]*)(?![\p{L}\p{N}])/giu, 'Docker & Docker Compose'],
  [/(?<![\p{L}\p{N}])(кубернетіс[а-яіїєґ]*|кубернетес[а-яіїєґ]*|кубер[а-яіїєґ]*|k8s)(?![\p{L}\p{N}])/giu, 'Kubernetes (k8s)'],
  [/(?<![\p{L}\p{N}])(енджінікс[а-яіїєґ]*|енджінкс[а-яіїєґ]*|нжінкс[а-яіїєґ]*|энджинкс[а-яіїєґ]*|нгинкс[а-яіїєґ]*|nginx)(?![\p{L}\p{N}])/giu, 'Nginx (Reverse Proxy)'],
  [/(?<![\p{L}\p{N}])(сіай[\s/]*сіді|сиай[\s/]*сиди|генерація[\s-]*екшенів)(?![\p{L}\p{N}])/giu, 'CI/CD (GitHub Actions)'],
  [/(?<![\p{L}\p{N}])(терраформ[а-яіїєґ]*|тераформ[а-яіїєґ]*|terraform)(?![\p{L}\p{N}])/giu, 'Terraform'],
  [/(?<![\p{L}\p{N}])(хельм[а-яіїєґ]*|хелм[а-яіїєґ]*|helm)(?![\p{L}\p{N}])/giu, 'Helm'],
  [/(?<![\p{L}\p{N}])(прометеус[а-яіїєґ]*|промете[йяеє][а-яіїєґ]*|графан[а-яіїєґ]*|prometheus|grafana)(?![\p{L}\p{N}])/giu, 'Prometheus & Grafana'],
  [/(?<![\p{L}\p{N}])(сентрі[а-яіїєґ]*|сентри[а-яіїєґ]*|sentry)(?![\p{L}\p{N}])/giu, 'Sentry (Error Tracking)'],

  // ── Frontend & Fullstack (React, Vue, Angular, TS) ───────────────────
  [/(?<![\p{L}\p{N}])(реакт|ріект|react)(?![\p{L}\p{N}])/giu, 'React'],
  [/(?<![\p{L}\p{N}])(некст[\s-]*джіес|некст|next[\s-]*js)(?![\p{L}\p{N}])/giu, 'Next.js'],
  [/(?<![\p{L}\p{N}])(вʼю[\s-]*джіес|вью[\s-]*джес|вью|vue[\s-]*js)(?![\p{L}\p{N}])/giu, 'Vue.js'],
  [/(?<![\p{L}\p{N}])(ангуляр|енгулар|angular)(?![\p{L}\p{N}])/giu, 'Angular'],
  [/(?<![\p{L}\p{N}])(тайпскрипт|тайпскріпт|typescript)(?![\p{L}\p{N}])/giu, 'TypeScript'],
  [/(?<![\p{L}\p{N}])(віртуал[\s-]*дом|виртуальный[\s-]*дом|virtual[\s-]*dom)(?![\p{L}\p{N}])/giu, 'Virtual DOM'],
  [/(?<![\p{L}\p{N}])(юзефект|юзэффект|юз[\s-]*ефект|use[\s-]*effect)(?![\p{L}\p{N}])/giu, 'useEffect'],
  [/(?<![\p{L}\p{N}])(юзстейт|юз[\s-]*стейт|use[\s-]*state)(?![\p{L}\p{N}])/giu, 'useState'],
  [/(?<![\p{L}\p{N}])(юзмемо|юзколбек|use[\s-]*memo|use[\s-]*callback)(?![\p{L}\p{N}])/giu, 'useMemo / useCallback'],
  [/(?<![\p{L}\p{N}])(редакс|редукс|redux|зустанд|zustand)(?![\p{L}\p{N}])/giu, 'Redux / Zustand'],
  [/(?<![\p{L}\p{N}])(тейлвінд|тейлвинд|tailwind)(?![\p{L}\p{N}])/giu, 'Tailwind CSS'],

  // ── Node.js, Java, Go & .NET ─────────────────────────────────────────
  [/(?<![\p{L}\p{N}])(нод[\s-]*джіес|нода|node[\s-]*js)(?![\p{L}\p{N}])/giu, 'Node.js'],
  [/(?<![\p{L}\p{N}])(нест[\s-]*джіес|нест|nest[\s-]*js)(?![\p{L}\p{N}])/giu, 'NestJS'],
  [/(?<![\p{L}\p{N}])(прізма|призма|prisma)(?![\p{L}\p{N}])/giu, 'Prisma ORM'],
  [/(?<![\p{L}\p{N}])(спрінг[\s-]*бут|спринг[\s-]*бут|spring[\s-]*boot)(?![\p{L}\p{N}])/giu, 'Spring Boot'],
  [/(?<![\p{L}\p{N}])(хайбернейт|хибернейт|hibernate)(?![\p{L}\p{N}])/giu, 'Hibernate / JPA'],
  [/(?<![\p{L}\p{N}])(джівіем|жвм|jvm)(?![\p{L}\p{N}])/giu, 'JVM (Java Virtual Machine)'],
  [/(?<![\p{L}\p{N}])(горутин[иаы]|горутины|goroutine[s]?)(?![\p{L}\p{N}])/giu, 'Goroutines (Go)'],
  [/(?<![\p{L}\p{N}])(ченел[иів]*|go[\s-]*channels)(?![\p{L}\p{N}])/giu, 'Go Channels'],
  [/(?<![\p{L}\p{N}])(дотнет|дот[\s-]*нет|\.net|dotnet)(?![\p{L}\p{N}])/giu, '.NET / C#'],
  [/(?<![\p{L}\p{N}])(сі[\s-]*шарп|си[\s-]*шарп|c#)(?![\p{L}\p{N}])/giu, 'C#'],
  [/(?<![\p{L}\p{N}])(лінк|линку|linq)(?![\p{L}\p{N}])/giu, 'LINQ'],
  [/(?<![\p{L}\p{N}])(ентіті[\s-]*фреймворк|ef[\s-]*core)(?![\p{L}\p{N}])/giu, 'Entity Framework Core'],

  // ── Mobile (SwiftUI BEFORE Swift, Jetpack Compose BEFORE Compose) ────
  [/(?<![\p{L}\p{N}])(свіфтюай|свифтюи|swiftui)(?![\p{L}\p{N}])/giu, 'SwiftUI'],
  [/(?<![\p{L}\p{N}])(свіфт[а-яіїєґ]*|свифт[а-яіїєґ]*|swift)(?![\p{L}\p{N}])/giu, 'Swift'],
  [/(?<![\p{L}\p{N}])(котлін|котлин|kotlin)(?![\p{L}\p{N}])/giu, 'Kotlin'],
  [/(?<![\p{L}\p{N}])(джетпак[\s-]*компоуз|компоуз|jetpack[\s-]*compose)(?![\p{L}\p{N}])/giu, 'Jetpack Compose'],
  [/(?<![\p{L}\p{N}])(флаттер|флатер|flutter)(?![\p{L}\p{N}])/giu, 'Flutter (Dart)'],

  // ── QA, Data & AI ───────────────────────────────────────────────────
  [/(?<![\p{L}\p{N}])(плейрайт|playwright)(?![\p{L}\p{N}])/giu, 'Playwright'],
  [/(?<![\p{L}\p{N}])(сайпрес|cypress)(?![\p{L}\p{N}])/giu, 'Cypress'],
  [/(?<![\p{L}\p{N}])(селеніум|selenium)(?![\p{L}\p{N}])/giu, 'Selenium'],
  [/(?<![\p{L}\p{N}])(пайспарк|спарк|pyspark|spark)(?![\p{L}\p{N}])/giu, 'Apache Spark / PySpark'],
  [/(?<![\p{L}\p{N}])(ерфлоу|эйрфлоу|airflow)(?![\p{L}\p{N}])/giu, 'Apache Airflow'],
  [/(?<![\p{L}\p{N}])(пайторч|pytorch)(?![\p{L}\p{N}])/giu, 'PyTorch'],
  [/(?<![\p{L}\p{N}])(тензорфлоу|tensorflow)(?![\p{L}\p{N}])/giu, 'TensorFlow'],
  [/(?<![\p{L}\p{N}])(ранг|раг|rag|retrieval[\s-]*augmented)(?![\p{L}\p{N}])/giu, 'RAG (Retrieval-Augmented Generation)'],
  [/(?<![\p{L}\p{N}])(ланґчейн|лангчейн|langchain)(?![\p{L}\p{N}])/giu, 'LangChain'],
  [/(?<![\p{L}\p{N}])(овасп|owasp)(?![\p{L}\p{N}])/giu, 'OWASP Top 10'],
];

function cleanForeignDiacritics(str: string): string {
  // Strip stray Polish / Scandinavian / Czech / French diacritics on Latin letters
  // while strictly preserving Cyrillic letters (e.g. й, ї, є, ё)
  return str
    .replace(/[a-zA-Z\u00C0-\u024F]+/g, (word) =>
      word.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    )
    .replace(/[ł]/gi, 'l')
    .replace(/[ø]/gi, 'o')
    .replace(/[ß]/gi, 'ss');
}

/**
 * Normalizes technical speech and spoken developer slang into canonical technical terminology.
 * Uses an opaque sentinel placeholder substitution model to eliminate recursive regex cascade
 * collisions where expanded replacement terms (e.g. "Lock" in "GIL (Global Interpreter Lock)")
 * are inadvertently re-matched by subsequent phonetic rules.
 */
export function normalizeTechnicalSpeech(text: string): string {
  if (!text || typeof text !== 'string') return text;
  // Clean diacritics and strip any raw sentinel tokens
  let normalized = cleanForeignDiacritics(text).replace(/[\uE000\uE001]/g, '');
  const sentinels: string[] = [];

  for (const [pattern, replacement] of PHONETIC_RULES) {
    pattern.lastIndex = 0;
    normalized = normalized.replace(pattern, () => {
      const idx = sentinels.length;
      sentinels.push(replacement);
      return `\uE000${idx}\uE001`;
    });
  }

  // Restore sentinels in a single non-recursive terminal substitution
  if (sentinels.length > 0) {
    normalized = normalized.replace(/\uE000(\d+)\uE001/g, (_, idx) => sentinels[Number(idx)]);
  }

  return normalized;
}

export function detectQuestionLanguage(text: string, overrideLocale?: string): 'en' | 'uk' {
  if (overrideLocale === 'en') return 'en';
  if (!text) return 'uk';

  // If text has Cyrillic letters (Ukrainian / Russian), it is a non-English question
  const hasCyrillic = /[а-яА-ЯёЁіІїЇєЄґҐ]/.test(text);
  if (!hasCyrillic) {
    // English question check: presence of question keywords or English letter density
    const hasEnglishWords = /\b(what|how|why|can|could|difference|explain|describe|is|are|does|do|between|which|tell|when|where|with|in|the)\b/i.test(text);
    const latinLetterCount = (text.match(/[a-zA-Z]/g) || []).length;
    if (hasEnglishWords || latinLetterCount > 10) {
      return 'en';
    }
  }

  return 'uk';
}

/**
 * Checks if the text references common backend / fullstack / mobile / cloud technical concepts.
 */
export function hasTechnicalKeyword(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  const keywords = [
    'sql', 'nosql', 'postgres', 'баз дан', 'баз данных', 'бази даних', 'базах даних',
    'таблиц', 'колекці', 'коллекци', 'документ', 'індекс', 'индекс', 'b-tree', 'gin', 'gist',
    'транзакц', 'acid', 'ізоляці', 'изоляци', 'deadlock', 'дедлок', 'join', 'джоин', 'джойн',
    'alembic', 'алембік', 'алембик', 'міграц', 'миграц', 'orm', 'sqlalchemy', 'алхімі', 'алхими',
    'python', 'пайтон', 'пітон', 'питон', 'fastapi', 'фастапі', 'фастапи', 'django', 'джанго', 'drf',
    'pydantic', 'пайдантік', 'пайдантик', 'uvicorn', 'gunicorn', 'asgi', 'wsgi', 'lifespan',
    'asyncio', 'async', 'await', 'асинк', 'асінк', 'асінц', 'асинц', 'event loop', 'івент луп', 'евент луп', 'корутин',
    'gil', 'джил', 'гил', 'mro', 'dunder', 'дандер', 'slots', 'слотс', 'garbage collector', 'збирач сміття',
    'yield', 'генератор', 'ітератор', 'итератор', 'декоратор', 'context manager', 'контекстний',
    'celery', 'селері', 'селери', 'redis', 'редіс', 'редис', 'rabbitmq', 'раббіт', 'ребіт', 'kafka', 'кафка', 'кафц',
    'брокер', 'черг', 'очеред', 'кеш', 'cache', 'rate limit', 'рейт ліміт', 'mvcc', 'мвцц', 'lru', 'лру', 'ordereddict', 'ордерд дікт',
    'docker', 'докер', 'compose', 'компоуз', 'kubernetes', 'кубер', 'k8s', 'nginx', 'енджінікс',
    'terraform', 'терраформ', 'тераформ', 'helm', 'хельм',
    'react', 'реакт', 'next', 'некст', 'vue', 'angular', 'ангуляр', 'typescript', 'тайпскрипт',
    'hook', 'хук', 'useeffect', 'usestate', 'virtual dom', 'redux', 'редакс', 'zustand', 'tailwind',
    'node', 'нода', 'nestjs', 'нест', 'prisma', 'прізма',
    'spring', 'спрінг', 'hibernate', 'хайбернейт', 'jvm', 'джівіем',
    'golang', 'горутин', 'goroutine', 'channels',
    'dotnet', 'дотнет', 'c#', 'сі-шарп', 'linq', 'лінк',
    'swift', 'свіфт', 'swiftui', 'kotlin', 'котлін', 'compose', 'компоуз', 'flutter', 'флаттер',
    'playwright', 'плейрайт', 'cypress', 'сайпрес', 'selenium',
    'spark', 'спарк', 'airflow', 'ерфлоу', 'pytorch', 'пайторч', 'tensorflow', 'rag', 'langchain',
    'owasp', 'овасп', 'appsec',
    'rest', 'graphql', 'grpc', 'websocket', 'вебсокет', 'jwt', 'oauth', 'cors', 'csrf',
    'cap', 'теорема кап', 'cap theorem', 'теорема', 'теореми', 'consistency', 'консистентн', 'availability',
    'solid', 'солід', 'солид', 'структур', 'structure'
  ];
  return keywords.some((k) => lower.includes(k));
}

/**
 * Filter out conversational filler noise, coughs, or single-word confirmations
 * that should not trigger AI answer generation.
 */
export function isFillerOrNoise(text: string): boolean {
  if (!text) return true;
  const clean = text.trim().toLowerCase().replace(/[.,!?;:«»"']/g, '').trim();
  if (clean.length < 3) return true;
  
  const fillers = new Set([
    'так', 'да', 'ок', 'окей', 'ага', 'угу', 'ну', 'ясно', 'понятно', 'добре', 'хорошо',
    'хм', 'гм', 'алло', 'привіт', 'привет', 'hello', 'hi', 'yes', 'yeah', 'yep', 'okay',
    'sure', 'fine', 'cool', 'nice', 'right', 'got it', 'зрозумів', 'понял', 'слухаю', 'слушаю',
    'так так', 'да да', 'ну да', 'ну так', 'чути мене', 'чути', 'чутно', 'чутно мене',
    'чи чути', 'чи чутно', 'ясна річ', 'hmm', 'uhm', 'um'
  ]);
  if (fillers.has(clean)) return true;
  return false;
}

/**
 * Result of target question isolation.
 */
export interface ExtractedQuestionTarget {
  isolatedQuestion: string;
  contextPreamble: string;
  hasTransitionMarker: boolean;
}

/**
 * Intelligently isolates the primary / active technical interview question
 * from continuous conversational speech buffers.
 *
 * Distinguishes preceding feedback or chit-chat on previous topics
 * (e.g. "Дякую за відповідь по Celery, все зрозуміло. А тепер наступне питання...")
 * from the actual target question being asked by the interviewer.
 */
export function isolateTargetQuestionHeuristics(rawText: string): ExtractedQuestionTarget {
  if (!rawText || typeof rawText !== 'string') {
    return { isolatedQuestion: '', contextPreamble: '', hasTransitionMarker: false };
  }

  const text = rawText.trim();

  // Transition markers that explicitly delineate the start of a new question
  const TRANSITION_PATTERNS: RegExp[] = [
    // Ukrainian
    /(?:^|[.!?\n]\s*)(?:наступне(?:\s+таке)?\s+питання[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:інше\s+питання[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:давай(?:\s+тепер)?\s+далі[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:рухаємось(?:\s+тепер)?\s+далі[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:поїхали\s+далі[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:перейдемо\s+до[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:давай\s+(?:поговоримо|про)\s+)/i,
    /(?:^|[.!?\n]\s*)(?:а\s+тепер\s+(?:розкажи|поясни|скажи|опиши|як|що|чому))/i,
    /(?:^|[.!?\n]\s*)(?:а\s+(?:розкажи|поясни|скажи|опиши)\s+)/i,
    /(?:^|[.!?\n]\s*)(?:питання\s+таке[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:у\s+мене(?:\s+до\s+тебе)?\s+питання[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:хочу\s+запитати[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:а\s+як\s+щодо\s+)/i,
    /(?:^|[.!?\n]\s*)(?:а\s+що\s+щодо\s+)/i,
    /(?:^|[.!?\n]\s*)(?:уяви\s+(?:собі\s+)?(?:що|ситуацію)[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:припустимо\s+(?:що)?[:\s]?)/i,

    // Russian
    /(?:^|[.!?\n]\s*)(?:следующий(?:\s+такой)?\s+вопрос[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:другой\s+вопрос[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:давай(?:\s+теперь)?\s+дальше[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:двигаемся(?:\s+теперь)?\s+дальше[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:пойдем\s+дальше[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:перейдем\s+к[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:давай\s+(?:поговорим|про)\s+)/i,
    /(?:^|[.!?\n]\s*)(?:а\s+теперь\s+(?:расскажи|объясни|скажи|опиши|как|что|почему))/i,
    /(?:^|[.!?\n]\s*)(?:а\s+(?:расскажи|объясни|скажи|опиши)\s+)/i,
    /(?:^|[.!?\n]\s*)(?:вопрос\s+такой[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:у\s+меня(?:\s+к\s+тебе)?\s+вопрос[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:хочу\s+спросить[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:а\s+как\s+насчет\s+)/i,
    /(?:^|[.!?\n]\s*)(?:а\s+что\s+насчет\s+)/i,
    /(?:^|[.!?\n]\s*)(?:представь\s+(?:себе\s+)?(?:что|ситуацию)[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:допустим\s+(?:что)?[:\s]?)/i,

    // English
    /(?:^|[.!?\n]\s*)(?:next\s+question[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:moving\s+on[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:let's\s+move\s+on[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:let's\s+switch\s+gears[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:let's\s+talk\s+about[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:now\s+(?:tell\s+me|explain|describe|how|what|why))/i,
    /(?:^|[.!?\n]\s*)(?:my\s+question\s+is[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:i\s+wanted\s+to\s+ask[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:what\s+about[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:how\s+about[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:imagine\s+(?:that)?[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:suppose\s+(?:that)?[:\s]?)/i,
    /(?:^|[.!?\n]\s*)(?:let's\s+say\s+we\s+have[:\s]?)/i,
  ];

  // Search for the latest transition marker in text
  let bestMatchIndex = -1;

  for (const pattern of TRANSITION_PATTERNS) {
    const match = pattern.exec(text);
    if (match && match.index > bestMatchIndex) {
      bestMatchIndex = match.index;
    }
  }

  // If a transition marker was found and leaves at least 3 words after it:
  if (bestMatchIndex > -1) {
    const preamble = text.slice(0, bestMatchIndex).trim();
    const targetSection = text.slice(bestMatchIndex).trim();
    const targetWords = targetSection.split(/\s+/).filter(Boolean);
    if (targetWords.length >= 3) {
      return {
        isolatedQuestion: targetSection,
        contextPreamble: preamble,
        hasTransitionMarker: true,
      };
    }
  }

  // If no explicit marker, check for multi-sentence split:
  // If text has sentences and previous sentence was praise or acknowledgment:
  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length > 1) {
    const lastSentence = sentences[sentences.length - 1];
    const prevSentences = sentences.slice(0, -1).join(' ');
    const isPreviousPraiseOrClosing = /^(дякую|спасибі|добре|зрозуміло|супер|чудово|так|ок|понятно|спасибо|хорошо|отлично|thank you|thanks|alright|great|good|cool|awesome|got it)/i.test(prevSentences.trim());
    
    if (isPreviousPraiseOrClosing && lastSentence.split(/\s+/).length >= 3) {
      return {
        isolatedQuestion: lastSentence,
        contextPreamble: prevSentences,
        hasTransitionMarker: true,
      };
    }
  }

  return {
    isolatedQuestion: text,
    contextPreamble: '',
    hasTransitionMarker: false,
  };
}
