import { NextRequest, NextResponse } from 'next/server';
import { callGeminiWithFallback, FLASH_MODELS } from '@/lib/geminiApi';
import { getSessionUser } from '@/lib/serverDb';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(req, 15, 60000, 'mock_interviewer');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Забагато запитів. Зачекайте хвилину.' }, { status: 429 });
    }

    const token = req.cookies.get("ghostboard_session")?.value;
    const user = token ? await getSessionUser(token) : null;
    // Allow guest usage for demo

    const body = await req.json();
    const { action, role, level, language = 'uk', questionHistory, currentQuestion, candidateAnswer } = body;

    const LANG_DIRECTIVES: Record<string, string> = {
      ua: 'Ukrainian (Українською мовою). Все запитання, складності, теми, вердикти та пояснення формулюй українською мовою. Технічні терміни залишай англійською.',
      uk: 'Ukrainian (Українською мовою). Все запитання, складності, теми, вердикти та пояснення формулюй українською мовою. Технічні терміни залишай англійською.',
      en: 'English. All questions, difficulties, topics, verdicts, strengths, and ideal answers must be strictly in clear, natural Technical English at B2/C1 level.',
      pl: 'Polish (Język polski). Wszystkie pytania, poziom trudności, tematy, werdykty i idealne odpowiedzi muszą być w języku polskim.',
      de: 'German (Deutsch). Alle Fragen, Schwierigkeiten, Themen, Urteile und Musterantworten müssen auf Deutsch sein.',
      fr: 'French (Français). Toutes les questions, difficultés, sujets, verdicts et réponses modèles doivent être en français.',
      es: 'Spanish (Español). Todas las preguntas, niveles de dificultad, temas, veredictos y respuestas modelo deben ser en español.',
      pt: 'Portuguese (Português). Todas as perguntas, níveis de dificuldade, tópicos, veredictos e respostas ideais devem ser em português.',
      it: 'Italian (Italiano). Tutte le domande, i livelli di difficoltà, gli argomenti, i verdetti e le risposte modello devono essere in italiano.',
      cs: 'Czech (Čeština). Všechny otázky, obtížnosti, témata, verdikty a vzorové odpovědi musí být v češtině.',
      nl: 'Dutch (Nederlands). Alle vragen, moeilijkheidsgraden, onderwerpen, oordelen en modelantwoorden moeten in het Nederlands zijn.',
    };

    const targetDirective = LANG_DIRECTIVES[language] || LANG_DIRECTIVES['en'];
    
    if (action === 'GENERATE_QUESTION') {
      const systemPrompt = `You are an elite Senior/Staff Software Engineer at a top FAANG company conducting a live technical interview.
Candidate Target Role: ${role} (${level}).
Previous questions asked (DO NOT REPEAT): ${JSON.stringify(questionHistory || [])}

LANGUAGE DIRECTIVE:
${targetDirective}

Your Task: Generate EXACTLY ONE next insightful, realistic, deep technical question for the candidate.
Avoid trivial textbook questions (e.g. "what is OOP?").
If Senior/Staff - ask about real-world architecture, trade-offs, concurrency, data structures, race conditions, resilience, database indexing or memory profiling.

Return ONLY a valid JSON object matching this schema:
{
  "question": "Your single realistic technical question",
  "difficulty": "Medium / Hard / Very Hard",
  "topic": "Concise 2-4 word topic (e.g. Database Indexing, Distributed Locks)",
  "contextHint": "1 sentence hint on what the interviewer is specifically evaluating with this question",
  "keyExpectedPoints": ["Key point 1", "Key point 2", "Key point 3"]
}`;

      const result = await callGeminiWithFallback({
        models: FLASH_MODELS,
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
      });

      if (result.ok && result.text) {
        let jsonStr = result.text.trim();
        if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/^```json\s*/, '');
        if (jsonStr.endsWith('```')) jsonStr = jsonStr.replace(/\s*```$/, '');
        try {
          return NextResponse.json(JSON.parse(jsonStr));
        } catch (parseErr) {
          throw new Error('Некоректний формат згенерованого питання');
        }
      }
      throw new Error(result.error || 'Помилка виклику Gemini API при генерації питання');
    }

    if (action === 'EVALUATE_ANSWER') {
      const systemPrompt = `You are a Senior/Staff Software Engineer evaluating a candidate for the role: ${role} (${level}).
You just asked this question:
"${currentQuestion}"

The candidate replied:
"${candidateAnswer}"

LANGUAGE DIRECTIVE:
${targetDirective}

Evaluate the candidate's answer objectively.
- Score from 1 to 10 (10 = Staff Engineer clarity and depth, 1 = completely incorrect/empty).
- Provide constructive, direct feedback without excessive flattery.

Return ONLY a valid JSON object matching this schema:
{
  "score": 8,
  "verdict": "Clear concise verdict (e.g. Excellent / Pass / Marginal / Fail)",
  "strengths": ["1-2 specific strengths in candidate's answer"],
  "missingKeyConcepts": ["1-3 specific missing concepts or misconceptions"],
  "staffEngineerAnswer": "A concise, master-level answer that a Staff Engineer would give under 60 seconds (pure technical substance, zero fluff)."
}`;

      const result = await callGeminiWithFallback({
        models: FLASH_MODELS,
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
      });

      if (result.ok && result.text) {
        let jsonStr = result.text.trim();
        // Remove markdown formatting if Gemini ignored responseMimeType
        if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/^```json\s*/, '');
        if (jsonStr.endsWith('```')) jsonStr = jsonStr.replace(/\s*```$/, '');
        
        try {
          return NextResponse.json(JSON.parse(jsonStr));
        } catch (parseErr) {
          console.error("Failed to parse Gemini JSON:", jsonStr);
          throw new Error('Некоректний формат відповіді від AI');
        }
      }
      
      if (result.ok && !result.text) {
         // Gemini returned 200 OK but empty text (e.g., safety block on gibberish)
         return NextResponse.json({
           score: 1,
           verdict: "Відповідь не розпізнано",
           strengths: [],
           missingKeyConcepts: ["Відповідь не має сенсу або містить недопустимі символи."],
           staffEngineerAnswer: "Будь ласка, надайте змістовну технічну відповідь."
         });
      }

      throw new Error(result.error || 'Помилка виклику Gemini API');
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch (err: unknown) {
    return NextResponse.json({ error: (err as { message?: string })?.message }, { status: 500 });
  }
}
