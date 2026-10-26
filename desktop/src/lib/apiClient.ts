/**
 * apiClient.ts
 * Unified Ghostboard Desktop API Client with Auto-detection & Auth Management.
 * 
 * Capabilities:
 * - Smart auto-detection of active backend port (3000 vs 3001 vs production https://ghostboard.ai)
 * - Automatic injection of Authorization: Bearer <token> from OS Keyring / token store
 * - credentials: 'include' & x-ghostboard-client: 'desktop-app' header attachments
 * - Resilient AbortController timeouts for health probing (<600ms)
 * - Methods for auth handshake, user profile, real-time sync, and desktop fleet heartbeat
 */

import { getAccessToken, isTauriEnvironment } from './tauriBridge';

export interface UserProfileData {
  id: string;
  email: string;
  name?: string | null;
  plan: string;
  role?: string | null;
}

export interface AuthMeResponse {
  authenticated: boolean;
  user?: UserProfileData | null;
  error?: string;
}

export interface DesktopHandshakeInitResponse {
  success: boolean;
  handshakeId: string;
  expiresAt: number;
  loginUrl: string;
  signupUrl: string;
  error?: string;
}

export interface DesktopHandshakePollResponse {
  ready: boolean;
  token?: string;
  user?: UserProfileData;
  error?: string;
  code?: string;
}

let activeBaseUrl: string | null = null;
let memoryAuthToken: string | null = null;
let detectionPromise: Promise<string> | null = null;

const STORAGE_URL_KEY = 'ghostboard_backend_url';
const STORAGE_TOKEN_KEY = 'ghostboard_desktop_token';
const PROD_CLOUD_URL = 'https://ghostboard.ai';

/**
 * Fast ping check with timeout
 */
async function probeHealth(url: string, timeoutMs = 600): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const cleanUrl = url.replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/api/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'x-ghostboard-client': 'desktop-app',
      },
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Autodetects the available backend URL:
 * 1. import.meta.env.VITE_API_URL (if explicitly provided)
 * 2. http://localhost:3000/api/health
 * 3. http://localhost:3001/api/health
 * 4. Production cloud (https://ghostboard.ai) or cached URL
 */
export async function detectBackendUrl(forceRefresh = false): Promise<string> {
  if (activeBaseUrl && !forceRefresh) {
    return activeBaseUrl;
  }

  if (detectionPromise && !forceRefresh) {
    return detectionPromise;
  }

  detectionPromise = (async () => {
    const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
    const envUrl = typeof meta !== 'undefined' ? meta.env?.VITE_API_URL : undefined;
    if (envUrl && envUrl.trim()) {
      const clean = envUrl.trim().replace(/\/+$/, '');
      if (await probeHealth(clean, 1000)) {
        activeBaseUrl = clean;
        persistBaseUrl(clean);
        return clean;
      }
    }

    // 2. Local Candidate 1: Next.js default port 3000
    if (await probeHealth('http://localhost:3000', 500)) {
      activeBaseUrl = 'http://localhost:3000';
      persistBaseUrl(activeBaseUrl);
      return activeBaseUrl;
    }

    // 3. Local Candidate 2: Next.js alternate port 3001
    if (await probeHealth('http://localhost:3001', 500)) {
      activeBaseUrl = 'http://localhost:3001';
      persistBaseUrl(activeBaseUrl);
      return activeBaseUrl;
    }

    // 4. In browser Vite dev without Tauri, relative /api proxy works via dev server
    if (typeof window !== 'undefined' && !isTauriEnvironment() && window.location?.hostname === 'localhost') {
      const proxyCandidate = window.location.origin;
      if (proxyCandidate && (await probeHealth(proxyCandidate, 500))) {
        activeBaseUrl = proxyCandidate;
        persistBaseUrl(activeBaseUrl);
        return activeBaseUrl;
      }
    }

    // 5. Check previously saved working URL
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && localStorage) {
      try {
        const cached = localStorage.getItem(STORAGE_URL_KEY);
        if (cached && (await probeHealth(cached, 800))) {
          activeBaseUrl = cached;
          return activeBaseUrl;
        }
      } catch {}
    }

    // 6. Production cloud fallback
    activeBaseUrl = PROD_CLOUD_URL;
    persistBaseUrl(activeBaseUrl);
    return activeBaseUrl;
  })();

  const resolved = await detectionPromise;
  detectionPromise = null;
  return resolved;
}

function persistBaseUrl(url: string) {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && localStorage) {
    try {
      localStorage.setItem(STORAGE_URL_KEY, url);
    } catch {}
  }
}

/**
 * Returns currently resolved base URL synchronously (defaults to cached or localhost:3000)
 */
export function getResolvedBaseUrl(): string {
  if (activeBaseUrl) return activeBaseUrl;
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && localStorage) {
    try {
      const cached = localStorage.getItem(STORAGE_URL_KEY);
      if (cached) return cached;
    } catch {}
  }
  return 'http://localhost:3000';
}

/**
 * Overrides or manually updates the active base URL
 */
export function setBaseUrl(url: string): void {
  activeBaseUrl = url.replace(/\/+$/, '');
  persistBaseUrl(activeBaseUrl);
}

/**
 * Resolves full path against current backend base URL
 */
export function resolveApiUrl(path: string, customBase?: string): string {
  const base = (customBase || getResolvedBaseUrl()).replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

/**
 * Retrieves the active authentication session token
 */
export async function getAuthToken(): Promise<string | null> {
  if (memoryAuthToken) return memoryAuthToken;

  if (isTauriEnvironment()) {
    try {
      const nativeToken = await getAccessToken();
      if (nativeToken) {
        memoryAuthToken = nativeToken;
        return nativeToken;
      }
    } catch (err) {
      console.debug('[apiClient] Native getAccessToken fallback:', err);
    }
  }

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && localStorage) {
    try {
      const stored = localStorage.getItem(STORAGE_TOKEN_KEY);
      if (stored) {
        memoryAuthToken = stored;
        return stored;
      }
    } catch {}
  }

  return null;
}

/**
 * Persists the active session token in memory and local store
 */
export function setAuthToken(token: string | null): void {
  memoryAuthToken = token;
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && localStorage) {
    try {
      if (token) {
        localStorage.setItem(STORAGE_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(STORAGE_TOKEN_KEY);
      }
    } catch {}
  }
}

/**
 * Clears authentication token everywhere
 */
export function clearAuthToken(): void {
  setAuthToken(null);
}

/**
 * Unified fetch wrapper with auto-detected backend URL and authentication headers
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  const baseUrl = await detectBackendUrl();
  const url = resolveApiUrl(path, baseUrl);
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'x-ghostboard-client': 'desktop-app',
    ...(options.headers as Record<string, string> || {}),
  };

  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    let data: T | null = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => '');
      data = text as unknown as T;
    }

    if (!response.ok) {
      const errMsg = (data as { error?: string })?.error || `HTTP ${response.status}: Request failed`;
      return { ok: false, status: response.status, data, error: errMsg };
    }

    return { ok: true, status: response.status, data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network request failed';
    return { ok: false, status: 0, data: null, error: errorMsg };
  }
}

/**
 * Validates the user's session against the real website database (/api/auth/me)
 */
export async function checkAuth(tokenOverride?: string): Promise<AuthMeResponse> {
  const token = tokenOverride || (await getAuthToken());
  if (!token) {
    return { authenticated: false };
  }

  const res = await apiFetch<AuthMeResponse>('/api/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.ok && res.data?.authenticated && res.data.user) {
    return {
      authenticated: true,
      user: res.data.user,
    };
  }

  return {
    authenticated: false,
    error: res.error || 'Authentication verification failed',
  };
}

/**
 * Initializes a new Desktop Handshake session (/api/auth/desktop-init)
 */
export async function initHandshake(): Promise<DesktopHandshakeInitResponse> {
  const res = await apiFetch<DesktopHandshakeInitResponse>('/api/auth/desktop-init', {
    method: 'POST',
    body: JSON.stringify({ client: 'desktop' }),
  });

  if (res.ok && res.data && res.data.handshakeId) {
    return res.data;
  }

  throw new Error(res.error || 'Failed to initialize desktop handshake');
}

/**
 * Polls the Desktop Handshake status (/api/auth/desktop-poll)
 */
export async function pollHandshake(handshakeId: string): Promise<DesktopHandshakePollResponse> {
  const res = await apiFetch<DesktopHandshakePollResponse>(
    `/api/auth/desktop-poll?handshake=${encodeURIComponent(handshakeId)}`,
    {
      method: 'GET',
    }
  );

  if (res.ok && res.data) {
    return res.data;
  }

  return {
    ready: false,
    error: res.error,
    code: res.status === 404 ? 'HANDSHAKE_NOT_FOUND' : undefined,
  };
}

/**
 * Fetches Candidate Profile and CV context from the website (/api/profile/context)
 */
export async function fetchProfileContext(): Promise<{
  resumeContext?: string;
  candidateProfile?: Record<string, unknown> | null;
} | null> {
  const res = await apiFetch<{
    resumeContext?: string;
    candidateProfile?: Record<string, unknown> | null;
  }>('/api/profile/context', {
    method: 'GET',
  });

  if (res.ok && res.data) {
    return res.data;
  }
  return null;
}

/**
 * Sends desktop telemetry heartbeat (/api/desktop/heartbeat)
 */
export async function sendDesktopHeartbeat(payload: {
  nodeId?: string;
  appVersion?: string;
  platform?: string;
  state?: 'launcher' | 'stealth' | 'ticker';
  isCapturing?: boolean;
  sttStatus?: string;
  micStatus?: string;
  audioLatencyMs?: number;
}): Promise<boolean> {
  const token = await getAuthToken();
  const res = await apiFetch('/api/desktop/heartbeat', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      token,
    }),
  });
  return res.ok;
}

/**
 * Fetches ephemeral Deepgram API key from /api/ai/deepgram
 */
export async function fetchDeepgramKey(): Promise<string | null> {
  try {
    const res = await apiFetch<{
      configured?: boolean;
      apiKey?: string | null;
      status?: string;
    }>('/api/ai/deepgram', {
      method: 'GET',
    });

    if (res.ok && res.data?.apiKey) {
      return res.data.apiKey;
    }
    return null;
  } catch (err) {
    console.warn('[apiClient] fetchDeepgramKey failed:', err);
    return null;
  }
}
