import type { SupportedLocale } from '@/lib/geoLang';

export interface OnboardingTranslations {
  title: string;
  subtitle: string;
  step1Title: string;
  step1Browser: string;
  step1App: string;
  step1Phone: string;
  step2Title: string;
  step2InstructionBrowser: string;
  step2InstructionApp: string;
  step3Title: string;
  testBtn: string;
  testingBtn: string;
  successTitle: string;
  successDesc: string;
  errorTitle: string;
  errorDesc: string;
  skipBtn: string;
  startBtn: string;
}

export const ONBOARDING_I18N: Record<SupportedLocale, OnboardingTranslations> = {
  en: {
    title: 'Audio Setup',
    subtitle: 'Ghostboard needs to hear your interviewer. Let\'s set it up in 30 seconds.',
    step1Title: 'Step 1: Where is the interview taking place?',
    step1Browser: 'Browser (Meet, Zoom Web)',
    step1App: 'Desktop App (Zoom, Teams)',
    step1Phone: 'Companion Phone',
    step2Title: 'Step 2: Configuration',
    step2InstructionBrowser: 'When you start capturing, select the tab where your meeting is running and check "Share tab audio".',
    step2InstructionApp: 'For desktop apps, you must install a virtual audio cable (like VB-Cable or BlackHole) and set it as your meeting speaker.',
    step3Title: 'Step 3: Sound Check',
    testBtn: 'Play Test Audio',
    testingBtn: 'Listening...',
    successTitle: 'Audio Captured!',
    successDesc: 'Perfect! The system clearly hears the interviewer.',
    errorTitle: 'No Audio Detected',
    errorDesc: 'Make sure you shared tab audio or set up your virtual cable correctly.',
    skipBtn: 'Skip Setup',
    startBtn: 'Complete Setup'
  },
  ua: {
    title: 'Налаштування звуку',
    subtitle: 'Ghostboard повинен чути вашого співбесідника. Налаштуємо це за 30 секунд.',
    step1Title: 'Крок 1: Де проходить співбесіда?',
    step1Browser: 'Браузер (Meet, Zoom Web)',
    step1App: 'Додаток (Zoom, Teams)',
    step1Phone: 'Смартфон-компаньйон',
    step2Title: 'Крок 2: Конфігурація',
    step2InstructionBrowser: 'При запуску захоплення виберіть вкладку зустрічі та обов\'язково поставте галочку "Надати доступ до аудіо вкладки".',
    step2InstructionApp: 'Для додатків вам потрібно встановити віртуальний кабель (VB-Cable або BlackHole) і вибрати його як динамік у налаштуваннях Zoom.',
    step3Title: 'Крок 3: Перевірка',
    testBtn: 'Тестовий звук',
    testingBtn: 'Слухаю...',
    successTitle: 'Звук успішно захоплено!',
    successDesc: 'Супер! Система чітко чує співбесідника.',
    errorTitle: 'Звук не виявлено',
    errorDesc: 'Переконайтеся, що ви поділилися аудіо вкладки або налаштували кабель.',
    skipBtn: 'Пропустити',
    startBtn: 'Завершити'
  },
  pl: {
    title: 'Konfiguracja Dźwięku',
    subtitle: 'Ghostboard musi słyszeć rozmówcę. Skonfigurujmy to w 30 sekund.',
    step1Title: 'Krok 1: Gdzie odbywa się rozmowa?',
    step1Browser: 'Przeglądarka (Meet, Zoom Web)',
    step1App: 'Aplikacja (Zoom, Teams)',
    step1Phone: 'Telefon Companion',
    step2Title: 'Krok 2: Konfiguracja',
    step2InstructionBrowser: 'Wybierz zakładkę spotkania i zaznacz "Udostępnij dźwięk z karty".',
    step2InstructionApp: 'Zainstaluj wirtualny kabel audio (VB-Cable lub BlackHole) i ustaw go jako głośnik w Zoom.',
    step3Title: 'Krok 3: Test dźwięku',
    testBtn: 'Odtwórz test',
    testingBtn: 'Nasłuchuję...',
    successTitle: 'Dźwięk przechwycony!',
    successDesc: 'Idealnie! System wyraźnie słyszy rozmówcę.',
    errorTitle: 'Nie wykryto dźwięku',
    errorDesc: 'Upewnij się, że udostępniono dźwięk lub poprawnie ustawiono kabel.',
    skipBtn: 'Pomiń',
    startBtn: 'Zakończ'
  },
  de: {
    title: 'Audio-Setup',
    subtitle: 'Ghostboard muss deinen Gesprächspartner hören.',
    step1Title: 'Schritt 1: Wo findet das Interview statt?',
    step1Browser: 'Browser (Meet, Zoom Web)',
    step1App: 'App (Zoom, Teams)',
    step1Phone: 'Telefon Companion',
    step2Title: 'Schritt 2: Konfiguration',
    step2InstructionBrowser: 'Wählen Sie den Tab aus und aktivieren Sie "Tab-Audio teilen".',
    step2InstructionApp: 'Installieren Sie ein virtuelles Kabel (VB-Cable) und setzen Sie es als Lautsprecher in Zoom.',
    step3Title: 'Schritt 3: Soundcheck',
    testBtn: 'Test-Audio abspielen',
    testingBtn: 'Höre zu...',
    successTitle: 'Audio erfasst!',
    successDesc: 'Perfekt! Das System hört alles klar und deutlich.',
    errorTitle: 'Kein Audio erkannt',
    errorDesc: 'Bitte überprüfe das Tab-Audio oder das virtuelle Kabel.',
    skipBtn: 'Überspringen',
    startBtn: 'Abschließen'
  },
  fr: {
    title: 'Configuration Audio',
    subtitle: 'Ghostboard a besoin d\'entendre votre interlocuteur.',
    step1Title: 'Étape 1 : Où se déroule l\'entretien ?',
    step1Browser: 'Navigateur (Meet, Zoom Web)',
    step1App: 'App Bureau (Zoom, Teams)',
    step1Phone: 'Téléphone Companion',
    step2Title: 'Étape 2 : Configuration',
    step2InstructionBrowser: 'Sélectionnez l\'onglet et cochez "Partager l\'audio de l\'onglet".',
    step2InstructionApp: 'Installez un câble audio virtuel (VB-Cable) et configurez-le comme haut-parleur.',
    step3Title: 'Étape 3 : Test Audio',
    testBtn: 'Lancer le test',
    testingBtn: 'Écoute en cours...',
    successTitle: 'Audio capturé !',
    successDesc: 'Parfait ! Le système entend clairement.',
    errorTitle: 'Aucun son détecté',
    errorDesc: 'Vérifiez le partage audio ou votre câble virtuel.',
    skipBtn: 'Ignorer',
    startBtn: 'Terminer'
  },
  es: {
    title: 'Configuración de Audio',
    subtitle: 'Ghostboard necesita escuchar a tu entrevistador.',
    step1Title: 'Paso 1: ¿Dónde es la entrevista?',
    step1Browser: 'Navegador (Meet, Zoom Web)',
    step1App: 'App Escritorio (Zoom, Teams)',
    step1Phone: 'Teléfono Companion',
    step2Title: 'Paso 2: Configuración',
    step2InstructionBrowser: 'Selecciona la pestaña y marca "Compartir audio de la pestaña".',
    step2InstructionApp: 'Instala un cable de audio virtual (VB-Cable) y úsalo como altavoz.',
    step3Title: 'Paso 3: Prueba de sonido',
    testBtn: 'Reproducir prueba',
    testingBtn: 'Escuchando...',
    successTitle: '¡Audio capturado!',
    successDesc: '¡Perfecto! El sistema escucha claramente.',
    errorTitle: 'No se detectó audio',
    errorDesc: 'Verifica la opción de compartir audio o tu cable virtual.',
    skipBtn: 'Omitir',
    startBtn: 'Completar'
  },
  pt: {
    title: 'Configuração de Áudio',
    subtitle: 'O Ghostboard precisa ouvir o entrevistador.',
    step1Title: 'Passo 1: Onde é a entrevista?',
    step1Browser: 'Navegador (Meet, Zoom Web)',
    step1App: 'App Desktop (Zoom, Teams)',
    step1Phone: 'Celular Companion',
    step2Title: 'Passo 2: Configuração',
    step2InstructionBrowser: 'Selecione a aba e marque "Compartilhar áudio da aba".',
    step2InstructionApp: 'Instale um cabo virtual (VB-Cable) e defina-o como alto-falante.',
    step3Title: 'Passo 3: Teste de som',
    testBtn: 'Tocar Teste',
    testingBtn: 'Ouvindo...',
    successTitle: 'Áudio Capturado!',
    successDesc: 'Perfeito! O sistema está ouvindo claramente.',
    errorTitle: 'Nenhum áudio detectado',
    errorDesc: 'Verifique o áudio da aba ou seu cabo virtual.',
    skipBtn: 'Pular',
    startBtn: 'Concluir'
  },
  it: {
    title: 'Configurazione Audio',
    subtitle: 'Ghostboard deve sentire il tuo interlocutore.',
    step1Title: 'Passo 1: Dove si svolge il colloquio?',
    step1Browser: 'Browser (Meet, Zoom Web)',
    step1App: 'App Desktop (Zoom, Teams)',
    step1Phone: 'Telefono Companion',
    step2Title: 'Passo 2: Configurazione',
    step2InstructionBrowser: 'Seleziona la scheda e spunta "Condividi audio della scheda".',
    step2InstructionApp: 'Installa un cavo virtuale (VB-Cable) e impostalo come altoparlante.',
    step3Title: 'Passo 3: Test Audio',
    testBtn: 'Riproduci Test',
    testingBtn: 'In ascolto...',
    successTitle: 'Audio Catturato!',
    successDesc: 'Perfetto! Il sistema sente chiaramente.',
    errorTitle: 'Nessun audio rilevato',
    errorDesc: 'Verifica la condivisione audio o il cavo virtuale.',
    skipBtn: 'Salta',
    startBtn: 'Completa'
  },
  cs: {
    title: 'Nastavení Zvuku',
    subtitle: 'Ghostboard potřebuje slyšet vašeho partnera.',
    step1Title: 'Krok 1: Kde probíhá pohovor?',
    step1Browser: 'Prohlížeč (Meet, Zoom Web)',
    step1App: 'Aplikace (Zoom, Teams)',
    step1Phone: 'Telefon Companion',
    step2Title: 'Krok 2: Konfigurace',
    step2InstructionBrowser: 'Vyberte kartu a zaškrtněte "Sdílet zvuk karty".',
    step2InstructionApp: 'Nainstalujte virtuální kabel (VB-Cable) a nastavte ho jako reproduktor.',
    step3Title: 'Krok 3: Zkouška zvuku',
    testBtn: 'Přehrát Test',
    testingBtn: 'Poslouchám...',
    successTitle: 'Zvuk zachycen!',
    successDesc: 'Perfektní! Systém slyší čistě a zřetelně.',
    errorTitle: 'Nezjištěn žádný zvuk',
    errorDesc: 'Zkontrolujte sdílení zvuku karty nebo virtuální kabel.',
    skipBtn: 'Přeskočit',
    startBtn: 'Dokončit'
  },
  nl: {
    title: 'Audio-installatie',
    subtitle: 'Ghostboard moet je gesprekspartner kunnen horen.',
    step1Title: 'Stap 1: Waar vindt het interview plaats?',
    step1Browser: 'Browser (Meet, Zoom Web)',
    step1App: 'Desktop App (Zoom, Teams)',
    step1Phone: 'Telefoon Companion',
    step2Title: 'Stap 2: Configuratie',
    step2InstructionBrowser: 'Selecteer het tabblad en vink "Tabbladaudio delen" aan.',
    step2InstructionApp: 'Installeer een virtuele audiokabel (VB-Cable) en stel deze in als luidspreker.',
    step3Title: 'Stap 3: Geluidstest',
    testBtn: 'Speel test',
    testingBtn: 'Luisteren...',
    successTitle: 'Audio opgevangen!',
    successDesc: 'Perfect! Het systeem hoort alles duidelijk.',
    errorTitle: 'Geen audio gedetecteerd',
    errorDesc: 'Controleer je tabbladaudio of de virtuele kabel.',
    skipBtn: 'Overslaan',
    startBtn: 'Voltooien'
  }
};

export function getOnboardingTranslations(locale: SupportedLocale): OnboardingTranslations {
  return ONBOARDING_I18N[locale] || ONBOARDING_I18N.en;
}
