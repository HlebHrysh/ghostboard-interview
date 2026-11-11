import { describe, it, expect } from 'vitest';
import {
  buildDynamicKeyterms,
  TECH_KEYTERMS,
  buildDeepgramWebSocketUrl,
} from '../src/lib/deepgramLive';
import {
  extractPillarAnchors,
  matchSpokenTranscriptToPillars,
  areTokensMatching,
  normalizeVoiceToken,
} from '../src/lib/voiceAnchorTracker';
import {
  extractPillarAnchors as extractPillarAnchorsDesktop,
  matchSpokenTranscriptToPillars as matchSpokenTranscriptToPillarsDesktop,
} from '../desktop/src/lib/voiceAnchorTracker';

describe('Task 1: Dynamic CV-Aware Deepgram Keyterm Builder', () => {
  it('extracts custom CV tech terms (ClickHouse, Temporal, Zustand, ScyllaDB) ahead of core keyterms', () => {
    const customTerms = ['ClickHouse', 'Temporal', 'Zustand', 'ScyllaDB'];
    const result = buildDynamicKeyterms(customTerms);

    expect(result.slice(0, 4)).toEqual(['ClickHouse', 'Temporal', 'Zustand', 'ScyllaDB']);
    expect(result.length).toBeLessThanOrEqual(24);
    expect(result).toContain('PostgreSQL');
    expect(result).toContain('Kafka');
  });

  it('deduplicates terms case-insensitively when custom terms overlap with core TECH_KEYTERMS', () => {
    const customWithOverlap = ['Python', 'clickhouse', 'React', 'Temporal', 'docker'];
    const result = buildDynamicKeyterms(customWithOverlap);

    expect(result.length).toBeLessThanOrEqual(24);

    const occurrencesOfPython = result.filter((t) => t.toLowerCase() === 'python');
    const occurrencesOfReact = result.filter((t) => t.toLowerCase() === 'react');
    const occurrencesOfDocker = result.filter((t) => t.toLowerCase() === 'docker');

    expect(occurrencesOfPython.length).toBe(1);
    expect(occurrencesOfReact.length).toBe(1);
    expect(occurrencesOfDocker.length).toBe(1);

    // Custom casing is preserved at the front
    expect(result[0]).toBe('Python');
    expect(result[1]).toBe('clickhouse');
  });

  it('strictly caps the merged array at 24 terms maximum and < 100 tokens total even with an oversized CV', () => {
    const hugeCvStack = [
      'ClickHouse', 'Temporal', 'Zustand', 'ScyllaDB', 'FastAPI', 'RabbitMQ',
      'Elasticsearch', 'Cassandra', 'Snowflake', 'DynamoDB', 'Neo4j', 'Couchbase',
      'Airflow', 'Apache Spark', 'Apache Flink', 'Terraform', 'Ansible', 'Linux'
    ];
    const result = buildDynamicKeyterms(hugeCvStack);

    expect(result.length).toBeLessThanOrEqual(24);

    // Compute total tokens across all returned keyterms
    const totalTokens = result.reduce((acc, term) => {
      const parts = term.split(/[\s_\-./\\]+/).filter(Boolean);
      return acc + Math.max(1, parts.length);
    }, 0);

    expect(totalTokens).toBeLessThan(100);
  });

  it('extracts technical proper nouns and framework names from prose CV strings', () => {
    const cvProse =
      'Senior Infrastructure Engineer with 7+ years of experience. Built scalable data pipelines using ClickHouse, ScyllaDB, Temporal orchestration, and Zustand for state management at Stripe.';
    const result = buildDynamicKeyterms(cvProse);

    expect(result).toContain('ClickHouse');
    expect(result).toContain('ScyllaDB');
    expect(result).toContain('Temporal');
    expect(result).toContain('Zustand');
    expect(result.length).toBeLessThanOrEqual(24);
  });

  it('defaults cleanly to core TECH_KEYTERMS (<= 24 terms) when no custom CV is provided', () => {
    const undefinedResult = buildDynamicKeyterms(undefined);
    expect(undefinedResult).toEqual(TECH_KEYTERMS.slice(0, 24));
    expect(undefinedResult.length).toBeLessThanOrEqual(24);

    const emptyArrayResult = buildDynamicKeyterms([]);
    expect(emptyArrayResult).toEqual(TECH_KEYTERMS.slice(0, 24));

    const emptyStringResult = buildDynamicKeyterms('   ');
    expect(emptyStringResult).toEqual(TECH_KEYTERMS.slice(0, 24));
  });

  it('integrates dynamic keyterms into buildDeepgramWebSocketUrl without exceeding limits', () => {
    const url = buildDeepgramWebSocketUrl('nova-3', 'multi', 16000, ['ClickHouse', 'ScyllaDB', 'Temporal']);
    expect(url).toContain('keyterm=ClickHouse');
    expect(url).toContain('keyterm=ScyllaDB');
    expect(url).toContain('keyterm=Temporal');

    const keytermMatches = url.match(/keyterm=/g) || [];
    expect(keytermMatches.length).toBeLessThanOrEqual(24);
  });
});

describe('Task 2: Zero-Latency Voice Anchor Karaoke Tracker (Web & Desktop)', () => {
  const englishPillars = [
    '• **Event Loop**: Node.js uses libuv with epoll to process asynchronous I/O non-blockingly.',
    '• **Worker Threads**: isolates heavy CPU computational tasks off the primary JavaScript thread.',
    '• **Cluster Mode**: spawns child processes via IPC to share server socket ports across CPU cores.'
  ];

  const ukrainianPillars = [
    '• **Оптимістичні блокування**: перевіряємо номер версії рядка перед записом для запобігання гонок.',
    '• **Індекс B-Tree**: оптимізує діапазонні вибірки та логарифмічний пошук за первинним ключем.',
    '• **Реплікація WAL**: забезпечує високу доступність бази даних через асинхронне надсилання логів.'
  ];

  it('extractPillarAnchors extracts bold anchors and normalizes tokens', () => {
    const anchors = extractPillarAnchors(englishPillars);
    expect(anchors).toHaveLength(3);

    expect(anchors[0].anchorText).toBe('Event Loop');
    expect(anchors[0].tokens).toEqual(['event', 'loop']);

    expect(anchors[1].anchorText).toBe('Worker Threads');
    expect(anchors[1].tokens).toEqual(['worker', 'threads']);

    expect(anchors[2].anchorText).toBe('Cluster Mode');
    expect(anchors[2].tokens).toEqual(['cluster', 'mode']);
  });

  it('extractPillarAnchors falls back cleanly to first 4 meaningful words when bold markers are omitted', () => {
    const plainPillars = [
      'Event loop handles non-blocking network calls via libuv.',
      'Worker threads process heavy CPU operations.',
    ];
    const anchors = extractPillarAnchors(plainPillars);

    expect(anchors[0].anchorText).toContain('Event loop');
    expect(anchors[0].tokens.length).toBeGreaterThanOrEqual(2);
  });

  it('matches English spoken transcript: speaking Pillar 1 marks index 0 complete and sets activeIndex: 1', () => {
    const candidateSpeechPillar1 =
      'In our architecture, the event loop handles all incoming non-blocking network requests.';

    const match1 = matchSpokenTranscriptToPillars(candidateSpeechPillar1, englishPillars);
    expect(match1.completedIndices).toEqual([0]);
    expect(match1.activeIndex).toBe(1);

    // Continue speaking Pillar 2 with alreadyCompletedIndices carried over
    const candidateSpeechPillar2 =
      'Whenever CPU-heavy computation happens, we offload that to worker threads.';

    const match2 = matchSpokenTranscriptToPillars(candidateSpeechPillar2, englishPillars, match1.completedIndices);
    expect(match2.completedIndices).toEqual([0, 1]);
    expect(match2.activeIndex).toBe(2);

    // Continue speaking Pillar 3
    const candidateSpeechPillar3 =
      'And in production we run cluster mode to scale across available cores.';

    const match3 = matchSpokenTranscriptToPillars(candidateSpeechPillar3, englishPillars, match2.completedIndices);
    expect(match3.completedIndices).toEqual([0, 1, 2]);
    expect(match3.activeIndex).toBe(3);
  });

  it('matches Ukrainian spoken transcript with grammatical inflections', () => {
    // Pillar 1: "Оптимістичні блокування"
    // Candidate speaks inflection: "оптимістичним блокуванням" (dative/instrumental case)
    const ukCandidateSpeech1 =
      'Для збереження консистентності ми користуємося оптимістичним блокуванням версій рядка.';

    const match1 = matchSpokenTranscriptToPillars(ukCandidateSpeech1, ukrainianPillars);
    expect(match1.completedIndices).toEqual([0]);
    expect(match1.activeIndex).toBe(1);

    // Pillar 2: "Індекс B-Tree"
    const ukCandidateSpeech2 =
      'Для швидкої діапазонної вибірки ми створюємо b-tree індекси у PostgreSQL.';

    const match2 = matchSpokenTranscriptToPillars(ukCandidateSpeech2, ukrainianPillars, match1.completedIndices);
    expect(match2.completedIndices).toEqual([0, 1]);
    expect(match2.activeIndex).toBe(2);

    // Pillar 3: "Реплікація WAL" (candidate speaks "реплікації wal")
    const ukCandidateSpeech3 =
      'Надійність гарантується завдяки потоковій реплікації wal логів на резервні сервери.';

    const match3 = matchSpokenTranscriptToPillars(ukCandidateSpeech3, ukrainianPillars, match2.completedIndices);
    expect(match3.completedIndices).toEqual([0, 1, 2]);
    expect(match3.activeIndex).toBe(3);
  });

  it('marks pillar complete via Condition B (3 consecutive content words) even if bold title is omitted', () => {
    // Pillar 1: '• **Event Loop**: Node.js uses libuv with epoll to process asynchronous I/O non-blockingly.'
    // Content words in sequence: ['uses', 'libuv', 'epoll', 'process', 'asynchronous', 'non-blockingly']
    // Candidate speaks: "We configured libuv with epoll to process our async traffic"
    // Consecutive content words matched: "libuv", "epoll", "process" (3 consecutive content words)
    const candidateSpeech = 'We rely on libuv with epoll to process high-throughput network packets.';

    const match = matchSpokenTranscriptToPillars(candidateSpeech, englishPillars);
    expect(match.completedIndices).toContain(0);
    expect(match.activeIndex).toBe(1);
  });

  it('executes matchSpokenTranscriptToPillars in < 1ms locally', () => {
    const candidateSpeech = 'In our architecture, the event loop handles all incoming network requests.';
    const iterations = 500;

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      matchSpokenTranscriptToPillars(candidateSpeech, englishPillars);
    }
    const elapsed = performance.now() - start;
    const avgTimePerCallMs = elapsed / iterations;

    expect(avgTimePerCallMs).toBeLessThan(1.0); // Strict < 1ms requirement
  });

  it('verifies Desktop mirror module exports and behavior match 100%', () => {
    const webAnchors = extractPillarAnchors(englishPillars);
    const desktopAnchors = extractPillarAnchorsDesktop(englishPillars);
    expect(desktopAnchors).toEqual(webAnchors);

    const speech = 'The event loop processes asynchronous tasks non-blockingly.';
    const webMatch = matchSpokenTranscriptToPillars(speech, englishPillars);
    const desktopMatch = matchSpokenTranscriptToPillarsDesktop(speech, englishPillars);
    expect(desktopMatch).toEqual(webMatch);
  });

  it('areTokensMatching handles English and Ukrainian stem variations properly', () => {
    // English
    expect(areTokensMatching('partitioning', 'partition')).toBe(true);
    expect(areTokensMatching('partitions', 'partition')).toBe(true);
    expect(areTokensMatching('blocking', 'block')).toBe(true);
    expect(areTokensMatching('worker', 'workers')).toBe(true);
    expect(areTokensMatching('constant', 'construction')).toBe(false);

    // Ukrainian
    expect(areTokensMatching('блокування', 'блокуванням')).toBe(true);
    expect(areTokensMatching('блокування', 'блокувати')).toBe(true);
    expect(areTokensMatching('оптимістичні', 'оптимістичним')).toBe(true);
    expect(areTokensMatching('індекс', 'індекси')).toBe(true);
  });
});

describe('Speech Intent Gate Module', () => {
  it('correctly filters conversational filler and agreement chatter', async () => {
    const { isFillerOrBanter, isActionableIntent } = await import('../src/lib/speechIntentGate');

    expect(isFillerOrBanter('uh')).toBe(true);
    expect(isFillerOrBanter('yeah okay')).toBe(true);
    expect(isFillerOrBanter('ну так')).toBe(true);
    expect(isActionableIntent('uh yeah')).toBe(false);
  });

  it('detects dangling incomplete thoughts ending in conjunctions', async () => {
    const { isDanglingThought, isActionableIntent } = await import('../src/lib/speechIntentGate');

    expect(isDanglingThought('We were using postgres and')).toBe(true);
    expect(isDanglingThought('ми хотіли зробити це але')).toBe(true);
    expect(isActionableIntent('We were using postgres and')).toBe(false);
  });

  it('identifies actionable technical interview questions and prompts', async () => {
    const { classifySpeechIntent, isActionableIntent } = await import('../src/lib/speechIntentGate');

    expect(isActionableIntent('How does Kafka handle partition rebalancing?')).toBe(true);
    expect(isActionableIntent('Як працює GIL у Python?')).toBe(true);

    const classification = classifySpeechIntent('How does Kafka handle partition rebalancing?');
    expect(classification.isActionable).toBe(true);
    expect(classification.intent).toBe('question');
  });
});

