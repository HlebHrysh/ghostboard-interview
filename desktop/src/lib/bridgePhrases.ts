/**
 * Canonical Bridge Phrases for buying time during technical interviews.
 * Used across Web and Desktop to offer natural conversational bridges while AI generates answers.
 */

export const BRIDGE_PHRASES: Record<string, string[]> = {
  uk: [
    "Це ключовий архітектурний компроміс. У нашому продакшн-стеку ми зазвичай підходили до цього з двох ракурсів...",
    "Дуже практичне запитання. Тут важливо розділити рівень протоколу та рівень внутрішньої пам'яті...",
    "У моєму досвіді рішення завжди залежить від профілю навантаження — чи оптимізуємо затримку (latency), чи пропускну здатність...",
    "Гарне питання щодо відмовостійкості. Перш ніж обрати конкретну бібліотеку, ми аналізували сайд-ефекти та узгодженість...",
  ],
  en: [
    "That's a fundamental architectural trade-off. In our production environment, we approached this from two core perspectives...",
    "Great practical question. The key here is separating the protocol layer from the runtime memory mechanics...",
    "In my experience, the optimal approach strictly depends on whether we prioritize tail latency or high throughput...",
    "Interesting problem around distributed consensus. Before choosing a concrete pattern, we evaluated failure modes...",
  ],
  ru: [
    "Это ключевой архитектурный компромисс. В нашем продакшн-стеке мы обычно подходили к этому с двух ракурсов...",
    "Очень практичный вопрос. Здесь важно разделить уровень протокола и уровень работы с памятью...",
  ],
};

export function getRandomBridgePhrase(lang?: string): string {
  const normalized = lang === 'bilingual_ru' || lang === 'ru' ? 'ru' : lang === 'en' ? 'en' : 'uk';
  const list = BRIDGE_PHRASES[normalized] || BRIDGE_PHRASES.uk;
  return list[Math.floor(Math.random() * list.length)];
}
