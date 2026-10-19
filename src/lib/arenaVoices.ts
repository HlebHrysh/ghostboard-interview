export interface ArenaVoice {
  id: string;
  name: string;
  provider: 'deepgram' | 'elevenlabs';
  gender: 'female' | 'male';
  title: string;
  avatar: string;
  tag: string;
  accent: string;
  recommendedFor: string;
}

export const ARENA_VOICES: ArenaVoice[] = [
  {
    id: 'aura-asteria-en',
    name: 'Asteria',
    provider: 'deepgram',
    gender: 'female',
    title: 'Staff Frontend & Core Lead',
    avatar: '👩‍💼',
    tag: 'FAANG Staff',
    accent: 'US / Clear & Confident',
    recommendedFor: 'Frontend, Web Vitals, Design Systems',
  },
  {
    id: 'aura-orion-en',
    name: 'Orion',
    provider: 'deepgram',
    gender: 'male',
    title: 'Principal Systems Architect',
    avatar: '👨‍💻',
    tag: 'Bar Raiser',
    accent: 'US / Natural & Calm',
    recommendedFor: 'Backend, Distributed Systems, High-Load',
  },
  {
    id: 'aura-luna-en',
    name: 'Luna',
    provider: 'deepgram',
    gender: 'female',
    title: 'Senior Engineering Manager',
    avatar: '👩‍🔬',
    tag: 'Culture & Comm',
    accent: 'US / Warm & Thoughtful',
    recommendedFor: 'Fullstack, System Design, Architecture',
  },
  {
    id: 'aura-arcas-en',
    name: 'Arcas',
    provider: 'deepgram',
    gender: 'male',
    title: 'VP of Infrastructure',
    avatar: '🧔‍♂️',
    tag: 'Strict Architect',
    accent: 'US / Deep & Authoritative',
    recommendedFor: 'Database Internals, Concurrency, Hard Cases',
  },
  {
    id: 'aura-stella-en',
    name: 'Stella',
    provider: 'deepgram',
    gender: 'female',
    title: 'Director of Platform Engineering',
    avatar: '👩‍🎓',
    tag: 'FAANG Director',
    accent: 'US / Crisp & Structured',
    recommendedFor: 'DevOps, Cloud Reliability, Scalability',
  },
  {
    id: 'aura-perseus-en',
    name: 'Perseus',
    provider: 'deepgram',
    gender: 'male',
    title: 'Staff Performance Engineer',
    avatar: '👨‍🏫',
    tag: 'Analytical Lead',
    accent: 'US / Fast & Analytical',
    recommendedFor: 'Blitz Questions, Code Optimization, Algorithms',
  },
  // ElevenLabs Curated Profiles
  {
    id: 'rachel',
    name: 'Rachel (ElevenLabs)',
    provider: 'elevenlabs',
    gender: 'female',
    title: 'Executive Tech Recruiter',
    avatar: '🎙️',
    tag: 'ElevenLabs Studio',
    accent: 'Studio / Dynamic',
    recommendedFor: 'Universal, Multilingual, Behavioral',
  },
  {
    id: 'adam',
    name: 'Adam (ElevenLabs)',
    provider: 'elevenlabs',
    gender: 'male',
    title: 'Principal Cloud Architect',
    avatar: '🎙️',
    tag: 'ElevenLabs Studio',
    accent: 'Studio / Deep Narrative',
    recommendedFor: 'Deep Tech & System Design',
  },
  {
    id: 'antoni',
    name: 'Antoni (ElevenLabs)',
    provider: 'elevenlabs',
    gender: 'male',
    title: 'Lead Software Architect',
    avatar: '🎙️',
    tag: 'ElevenLabs Studio',
    accent: 'Studio / Crisp',
    recommendedFor: 'Microservices & Enterprise',
  },
  {
    id: 'bella',
    name: 'Bella (ElevenLabs)',
    provider: 'elevenlabs',
    gender: 'female',
    title: 'Head of Product Engineering',
    avatar: '🎙️',
    tag: 'ElevenLabs Studio',
    accent: 'Studio / Energetic',
    recommendedFor: 'Product, Agile & Fullstack',
  },
];

export const VOICE_SAMPLE_TEXTS: Record<string, string> = {
  ua: 'Вітаю в Ghostboard Arena. Сьогодні ми перевіримо твій технічний стек та системне мислення.',
  en: 'Welcome to Ghostboard Arena. Today we will assess your core engineering depth and architectural vision.',
  pl: 'Witamy w Ghostboard Arena. Dzisiaj sprawdzimy Twoją wiedzę techniczną i myślenie systemowe.',
  de: 'Willkommen in der Ghostboard Arena. Heute testen wir Ihre technische Tiefe und Systemarchitektur.',
  fr: 'Bienvenue dans Ghostboard Arena. Aujourd\'hui, nous allons évaluer votre vision architecturale.',
  es: 'Bienvenido a Ghostboard Arena. Hoy evaluaremos tu profundidad técnica y visión arquitectónica.',
  pt: 'Bem-vindo ao Ghostboard Arena. Hoje vamos avaliar sua visão arquitetônica e técnica.',
  it: 'Benvenuto in Ghostboard Arena. Oggi valuteremo la tua visione architetturale e tecnica.',
  cs: 'Vítejte v Ghostboard Arena. Dnes prověříme vaše technické znalosti a systémové myšlení.',
  nl: 'Welkom bij Ghostboard Arena. Vandaag testen we jouw technische diepgang en systeemarchitectuur.',
};
