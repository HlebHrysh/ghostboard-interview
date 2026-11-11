import { describe, it, expect } from 'vitest';
import { buildDeepgramWebSocketUrl, getDeepgramFallbackUrl, TECH_KEYTERMS } from '../src/lib/deepgramLive';

describe('Deepgram Live WebSocket URL Builder & Fallback Cascade', () => {
  it('builds canonical nova-3 URL with 16kHz, endpointing=350, utterance_end_ms=1000 and keyterms', () => {
    const url = buildDeepgramWebSocketUrl('nova-3', 'multi', 16000);
    expect(url).toContain('model=nova-3');
    expect(url).toContain('language=multi');
    expect(url).toContain('sample_rate=16000');
    expect(url).toContain('endpointing=350');
    expect(url).toContain('utterance_end_ms=1000');
    expect(url).toContain('keyterm=Python');
    expect(url).toContain('keyterm=TypeScript');
  });

  it('cascades rejected nova-3 to nova-2 with language fallback', () => {
    const initialUrl = buildDeepgramWebSocketUrl('nova-3', 'multi', 16000);
    const fallback1 = getDeepgramFallbackUrl(initialUrl);

    expect(fallback1).toContain('model=nova-2');
    expect(fallback1).toContain('language=uk'); // nova-2 multi fallback to uk
    expect(fallback1).toContain('keywords=Python');

    // Fallback step 2: strips keywords
    const fallback2 = getDeepgramFallbackUrl(fallback1);
    expect(fallback2).toContain('model=nova-2');
    expect(fallback2).not.toContain('keywords=');

    // Fallback step 3: minimal nova-3
    const fallback3 = getDeepgramFallbackUrl(fallback2);
    expect(fallback3).toContain('model=nova-3');
    expect(fallback3).not.toContain('keyterm=');
  });
});
