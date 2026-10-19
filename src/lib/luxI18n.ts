import type { SupportedLocale } from './geoLang';

export interface LuxTranslations {
  status: {
    listening: string;
    paused: string;
    idle: string;
    reconnecting: string;
    offline: string;
    thinking: string;
  };
  collapse: string;
  expand: string;
  hook: string;
  points: string;
  translation: string;
  panic: string;
  opacity: string;
  kbd: {
    pause: string;
    screenshot: string;
    opacity: string;
    panic: string;
  };
  disguise: {
    notes: string;
    calc: string;
    placeholder: string;
    exitHint: string;
  };
}

export const LUX_I18N: Record<SupportedLocale, LuxTranslations> = {
  ua: {
    status: { listening: 'Слухаю', paused: 'Пауза', idle: 'Готово', reconnecting: 'Перепідключення', offline: 'Офлайн', thinking: 'Думаю' },
    collapse: 'Згорнути',
    expand: 'Розгорнути',
    hook: 'Скажи першим',
    points: 'Ключові тези',
    translation: 'Переклад',
    panic: 'Маскування',
    opacity: 'Прозорість',
    kbd: { pause: 'Пауза', screenshot: 'Розв’язати код', opacity: 'Прозорість 10–95%', panic: 'Маска' },
    disguise: { notes: 'Нотатки', calc: 'Калькулятор', placeholder: 'Введіть нотатку…', exitHint: 'Натисніть Esc, щоб повернутися' },
  },
  en: {
    status: { listening: 'Listening', paused: 'Paused', idle: 'Ready', reconnecting: 'Reconnecting', offline: 'Offline', thinking: 'Thinking' },
    collapse: 'Collapse',
    expand: 'Expand',
    hook: 'Say first',
    points: 'Key points',
    translation: 'Translation',
    panic: 'Panic mask',
    opacity: 'Opacity',
    kbd: { pause: 'Pause', screenshot: 'Solve code', opacity: 'Opacity 10–95%', panic: 'Mask' },
    disguise: { notes: 'Notes', calc: 'Calculator', placeholder: 'Type a note…', exitHint: 'Press Esc to return' },
  },
  pl: {
    status: { listening: 'Słucham', paused: 'Pauza', idle: 'Gotowe', reconnecting: 'Łączenie', offline: 'Offline', thinking: 'Myślę' },
    collapse: 'Zwiń',
    expand: 'Rozwiń',
    hook: 'Powiedz najpierw',
    points: 'Kluczowe punkty',
    translation: 'Tłumaczenie',
    panic: 'Maska',
    opacity: 'Przezroczystość',
    kbd: { pause: 'Pauza', screenshot: 'Rozwiąż kod', opacity: 'Przezroczystość 10–95%', panic: 'Maska' },
    disguise: { notes: 'Notatki', calc: 'Kalkulator', placeholder: 'Wpisz notatkę…', exitHint: 'Naciśnij Esc, aby wrócić' },
  },
  de: {
    status: { listening: 'Hört zu', paused: 'Pausiert', idle: 'Bereit', reconnecting: 'Verbinde neu', offline: 'Offline', thinking: 'Denkt nach' },
    collapse: 'Einklappen',
    expand: 'Ausklappen',
    hook: 'Zuerst sagen',
    points: 'Kernpunkte',
    translation: 'Übersetzung',
    panic: 'Tarnmodus',
    opacity: 'Transparenz',
    kbd: { pause: 'Pause', screenshot: 'Code lösen', opacity: 'Transparenz 10–95 %', panic: 'Tarnen' },
    disguise: { notes: 'Notizen', calc: 'Rechner', placeholder: 'Notiz eingeben…', exitHint: 'Esc drücken, um zurückzukehren' },
  },
  fr: {
    status: { listening: 'À l’écoute', paused: 'En pause', idle: 'Prêt', reconnecting: 'Reconnexion', offline: 'Hors ligne', thinking: 'Réflexion' },
    collapse: 'Réduire',
    expand: 'Développer',
    hook: 'À dire d’abord',
    points: 'Points clés',
    translation: 'Traduction',
    panic: 'Masque panique',
    opacity: 'Opacité',
    kbd: { pause: 'Pause', screenshot: 'Résoudre le code', opacity: 'Opacité 10–95 %', panic: 'Masque' },
    disguise: { notes: 'Notes', calc: 'Calculatrice', placeholder: 'Saisir une note…', exitHint: 'Appuyez sur Échap pour revenir' },
  },
  es: {
    status: { listening: 'Escuchando', paused: 'En pausa', idle: 'Listo', reconnecting: 'Reconectando', offline: 'Sin conexión', thinking: 'Pensando' },
    collapse: 'Contraer',
    expand: 'Expandir',
    hook: 'Di primero',
    points: 'Puntos clave',
    translation: 'Traducción',
    panic: 'Máscara de pánico',
    opacity: 'Opacidad',
    kbd: { pause: 'Pausa', screenshot: 'Resolver código', opacity: 'Opacidad 10–95 %', panic: 'Máscara' },
    disguise: { notes: 'Notas', calc: 'Calculadora', placeholder: 'Escribe una nota…', exitHint: 'Pulsa Esc para volver' },
  },
  pt: {
    status: { listening: 'Ouvindo', paused: 'Pausado', idle: 'Pronto', reconnecting: 'Reconectando', offline: 'Offline', thinking: 'Pensando' },
    collapse: 'Recolher',
    expand: 'Expandir',
    hook: 'Diga primeiro',
    points: 'Pontos-chave',
    translation: 'Tradução',
    panic: 'Máscara de pânico',
    opacity: 'Opacidade',
    kbd: { pause: 'Pausa', screenshot: 'Resolver código', opacity: 'Opacidade 10–95%', panic: 'Máscara' },
    disguise: { notes: 'Notas', calc: 'Calculadora', placeholder: 'Digite uma nota…', exitHint: 'Pressione Esc para voltar' },
  },
  it: {
    status: { listening: 'In ascolto', paused: 'In pausa', idle: 'Pronto', reconnecting: 'Riconnessione', offline: 'Offline', thinking: 'Penso' },
    collapse: 'Comprimi',
    expand: 'Espandi',
    hook: 'Dì prima',
    points: 'Punti chiave',
    translation: 'Traduzione',
    panic: 'Maschera panico',
    opacity: 'Opacità',
    kbd: { pause: 'Pausa', screenshot: 'Risolvi codice', opacity: 'Opacità 10–95%', panic: 'Maschera' },
    disguise: { notes: 'Note', calc: 'Calcolatrice', placeholder: 'Scrivi una nota…', exitHint: 'Premi Esc per tornare' },
  },
  cs: {
    status: { listening: 'Poslouchám', paused: 'Pozastaveno', idle: 'Připraveno', reconnecting: 'Připojuji', offline: 'Offline', thinking: 'Přemýšlím' },
    collapse: 'Sbalit',
    expand: 'Rozbalit',
    hook: 'Řekni nejdřív',
    points: 'Klíčové body',
    translation: 'Překlad',
    panic: 'Maskování',
    opacity: 'Průhlednost',
    kbd: { pause: 'Pauza', screenshot: 'Vyřešit kód', opacity: 'Průhlednost 10–95 %', panic: 'Maska' },
    disguise: { notes: 'Poznámky', calc: 'Kalkulačka', placeholder: 'Napište poznámku…', exitHint: 'Stiskněte Esc pro návrat' },
  },
  nl: {
    status: { listening: 'Luistert', paused: 'Gepauzeerd', idle: 'Klaar', reconnecting: 'Opnieuw verbinden', offline: 'Offline', thinking: 'Denkt na' },
    collapse: 'Inklappen',
    expand: 'Uitklappen',
    hook: 'Zeg eerst',
    points: 'Kernpunten',
    translation: 'Vertaling',
    panic: 'Paniekmasker',
    opacity: 'Transparantie',
    kbd: { pause: 'Pauze', screenshot: 'Code oplossen', opacity: 'Transparantie 10–95%', panic: 'Masker' },
    disguise: { notes: 'Notities', calc: 'Rekenmachine', placeholder: 'Typ een notitie…', exitHint: 'Druk op Esc om terug te keren' },
  },
};

export function getLuxTranslations(locale: SupportedLocale): LuxTranslations {
  return LUX_I18N[locale] || LUX_I18N.en;
}
