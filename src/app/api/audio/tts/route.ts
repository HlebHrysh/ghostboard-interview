import { NextRequest, NextResponse } from 'next/server';

// In-memory audio cache for instant replays & zero latency (max 100 entries)
const audioCache = new Map<string, Buffer>();
const MAX_CACHE_SIZE = 100;

function getCachedAudio(key: string): Buffer | undefined {
  return audioCache.get(key);
}

function setCachedAudio(key: string, buffer: Buffer): void {
  if (audioCache.size >= MAX_CACHE_SIZE) {
    const firstKey = audioCache.keys().next().value;
    if (firstKey) audioCache.delete(firstKey);
  }
  audioCache.set(key, buffer);
}

// ElevenLabs Voice IDs
const ELEVENLABS_VOICES: Record<string, string> = {
  rachel: '21m00Tcm4TlvDq8ikWAM',
  adam: 'pNInz6obpgDQGcFmaJgB',
  antoni: 'ErXwobaYiN019PkySvjV',
  bella: 'EXAVITQu4vr4xnSDxMaL',
  josh: 'VR6AewLTigWG4xSOukaG',
  domi: 'AZnzlk1XvdvUeBnXmlld',
};

// Deepgram Aura Voices
const DEEPGRAM_VOICES: Record<string, string> = {
  asteria: 'aura-asteria-en',
  orion: 'aura-orion-en',
  luna: 'aura-luna-en',
  arcas: 'aura-arcas-en',
  stella: 'aura-stella-en',
  perseus: 'aura-perseus-en',
  athena: 'aura-athena-en',
  angus: 'aura-angus-en',
  helios: 'aura-helios-en',
  zeus: 'aura-zeus-en',
};

function splitTextIntoChunks(text: string, maxLen = 170): string[] {
  const clean = text.replace(/[\r\n\t]+/g, ' ').trim();
  if (clean.length <= maxLen) return [clean];

  const chunks: string[] = [];
  const sentences = clean.split(/(?<=[.?!;:,])\s+/);
  let current = '';

  for (const sentence of sentences) {
    if ((current + ' ' + sentence).trim().length <= maxLen) {
      current = (current + ' ' + sentence).trim();
    } else {
      if (current) chunks.push(current);
      if (sentence.length <= maxLen) {
        current = sentence;
      } else {
        const words = sentence.split(' ');
        let wordChunk = '';
        for (const w of words) {
          if ((wordChunk + ' ' + w).trim().length <= maxLen) {
            wordChunk = (wordChunk + ' ' + w).trim();
          } else {
            if (wordChunk) chunks.push(wordChunk);
            wordChunk = w;
          }
        }
        current = wordChunk;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks.filter(c => c.length > 0);
}

async function fetchGoogleTTSFallback(text: string, lang: string): Promise<Buffer> {
  const validLangs = ['uk', 'ua', 'en', 'pl', 'de', 'fr', 'es', 'pt', 'it', 'cs', 'nl'];
  const targetLang = lang === 'ua' ? 'uk' : (validLangs.includes(lang) ? lang : 'en');
  const chunks = splitTextIntoChunks(text);
  const audioBuffers: Buffer[] = [];

  for (const chunk of chunks) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${targetLang}&client=tw-ob&q=${encodeURIComponent(chunk)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://translate.google.com/',
      },
    });

    if (!res.ok) {
      throw new Error(`Google TTS error: ${res.status}`);
    }

    const arrBuf = await res.arrayBuffer();
    audioBuffers.push(Buffer.from(arrBuf));
  }

  return Buffer.concat(audioBuffers);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get('text')?.trim();
  const rawVoice = searchParams.get('voice')?.trim().toLowerCase() || 'aura-asteria-en';
  const provider = searchParams.get('provider')?.trim().toLowerCase() || 'auto';
  const lang = searchParams.get('lang')?.trim() || 'en';

  const clientElevenKey = req.headers.get('x-elevenlabs-key') || searchParams.get('elevenlabsApiKey')?.trim();
  const elevenKey = clientElevenKey || process.env.ELEVENLABS_API_KEY;
  const deepgramKey = process.env.DEEPGRAM_API_KEY;

  if (!text) {
    return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 });
  }

  const cacheKey = `${provider}:${rawVoice}:${lang}:${text.slice(0, 80)}:${text.length}`;
  const cached = getCachedAudio(cacheKey);
  if (cached) {
    return new NextResponse(new Uint8Array(cached), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400, immutable',
        'X-TTS-Source': 'cache',
      },
    });
  }

  // 1. ElevenLabs TTS branch
  const isElevenRequested = provider === 'elevenlabs' || (provider === 'auto' && rawVoice in ELEVENLABS_VOICES);
  if (isElevenRequested && elevenKey) {
    const voiceId = ELEVENLABS_VOICES[rawVoice] || rawVoice;
    try {
      const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
        method: 'POST',
        headers: {
          'xi-api-key': elevenKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      });

      if (elRes.ok) {
        const audioBuf = Buffer.from(await elRes.arrayBuffer());
        setCachedAudio(cacheKey, audioBuf);
        return new NextResponse(new Uint8Array(audioBuf), {
          status: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=86400, immutable',
            'X-TTS-Source': 'elevenlabs',
          },
        });
      } else {
        console.warn(`ElevenLabs error ${elRes.status}, falling back to Deepgram Aura`);
      }
    } catch (elErr) {
      console.warn('ElevenLabs request failed, falling back:', elErr);
    }
  }

  // 2. Deepgram Aura TTS branch
  if (deepgramKey) {
    const dgVoiceModel = DEEPGRAM_VOICES[rawVoice] || (rawVoice.startsWith('aura-') ? rawVoice : 'aura-asteria-en');
    try {
      const dgRes = await fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(dgVoiceModel)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${deepgramKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (dgRes.ok) {
        const audioBuf = Buffer.from(await dgRes.arrayBuffer());
        setCachedAudio(cacheKey, audioBuf);
        return new NextResponse(new Uint8Array(audioBuf), {
          status: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=86400, immutable',
            'X-TTS-Source': 'deepgram-aura',
          },
        });
      } else {
        console.warn(`Deepgram speak error ${dgRes.status}, falling back`);
      }
    } catch (dgErr) {
      console.warn('Deepgram speak failed, falling back:', dgErr);
    }
  }

  // 3. Fallback to Google Translate TTS
  try {
    const fallbackBuf = await fetchGoogleTTSFallback(text, lang);
    setCachedAudio(cacheKey, fallbackBuf);
    return new NextResponse(new Uint8Array(fallbackBuf), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400, immutable',
        'X-TTS-Source': 'google-fallback',
      },
    });
  } catch (error: any) {
    console.error('[TTS API Error]', error);
    return NextResponse.json({ error: error.message || 'TTS generation failed' }, { status: 500 });
  }
}
