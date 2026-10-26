import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as desktopInitPost } from '../src/app/api/auth/desktop-init/route';
import { GET as desktopPollGet } from '../src/app/api/auth/desktop-poll/route';
import { POST as desktopBindPost } from '../src/app/api/auth/desktop-bind/route';
import { createUser, createSession, getUserByEmail } from '../src/lib/serverDb';
import { desktopHandshakeStore } from '../src/lib/desktopHandshakeStore';

describe('Desktop Auth Handshake & Pairing Pipeline', () => {
  let ipCounter = 200;
  function getHeaders(extraHeaders: Record<string, string> = {}) {
    ipCounter++;
    return {
      'Content-Type': 'application/json',
      'host': 'localhost:3000',
      'origin': 'http://localhost:3000',
      'x-forwarded-for': `10.0.0.${ipCounter}`,
      ...extraHeaders,
    };
  }

  it('generates a new pairing handshake with login and signup URLs via /api/auth/desktop-init', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/desktop-init', {
      method: 'POST',
      headers: getHeaders(),
    });

    const res = await desktopInitPost(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.handshakeId).toBeDefined();
    expect(typeof data.handshakeId).toBe('string');
    expect(data.handshakeId.length).toBeGreaterThan(10);
    expect(data.loginUrl).toContain(`handshake=${data.handshakeId}`);
    expect(data.signupUrl).toContain(`handshake=${data.handshakeId}`);
    expect(data.expiresAt).toBeGreaterThan(Date.now());
  });

  it('rejects /api/auth/desktop-poll without handshake query parameter with 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/desktop-poll', {
      method: 'GET',
      headers: getHeaders(),
    });

    const res = await desktopPollGet(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('returns 404 for non-existent handshakeId on /api/auth/desktop-poll', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/desktop-poll?handshake=non-existent-id-99999', {
      method: 'GET',
      headers: getHeaders(),
    });

    const res = await desktopPollGet(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.code).toBe('HANDSHAKE_NOT_FOUND');
  });

  it('polls pending state ({ ready: false }) for an initialized unbound handshake', async () => {
    const initReq = new NextRequest('http://localhost:3000/api/auth/desktop-init', {
      method: 'POST',
      headers: getHeaders(),
    });
    const initRes = await desktopInitPost(initReq);
    const { handshakeId } = await initRes.json();

    const pollReq = new NextRequest(`http://localhost:3000/api/auth/desktop-poll?handshake=${handshakeId}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const pollRes = await desktopPollGet(pollReq);
    expect(pollRes.status).toBe(200);

    const pollData = await pollRes.json();
    expect(pollData.ready).toBe(false);
  });

  it('rejects /api/auth/desktop-bind if unauthenticated (401)', async () => {
    const initReq = new NextRequest('http://localhost:3000/api/auth/desktop-init', {
      method: 'POST',
      headers: getHeaders(),
    });
    const initRes = await desktopInitPost(initReq);
    const { handshakeId } = await initRes.json();

    const bindReq = new NextRequest('http://localhost:3000/api/auth/desktop-bind', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ handshakeId }),
    });

    const bindRes = await desktopBindPost(bindReq);
    expect(bindRes.status).toBe(401);
    const bindData = await bindRes.json();
    expect(bindData.code).toBe('AUTH_REQUIRED');
  });

  it('completes the full loop: init -> bind with user session -> poll ready with token and user', async () => {
    // 1. Create a verified test user and session in database
    const email = `desktop_tester_${Date.now()}@ghostboard.ai`;
    let user = await getUserByEmail(email);
    if (!user) {
      user = await createUser(email, 'Desktop Pilot', 'pro', 'Staff Architect');
    }
    const session = await createSession(user.id);
    const sessionToken = session.token;

    // 2. Desktop initializes handshake
    const initReq = new NextRequest('http://localhost:3000/api/auth/desktop-init', {
      method: 'POST',
      headers: getHeaders(),
    });
    const initRes = await desktopInitPost(initReq);
    const { handshakeId } = await initRes.json();

    // 3. Web browser binds session to the handshake
    const bindReq = new NextRequest('http://localhost:3000/api/auth/desktop-bind', {
      method: 'POST',
      headers: getHeaders({
        'Authorization': `Bearer ${sessionToken}`,
      }),
      body: JSON.stringify({ handshakeId }),
    });
    const bindRes = await desktopBindPost(bindReq);
    expect(bindRes.status).toBe(200);

    const bindData = await bindRes.json();
    expect(bindData.success).toBe(true);
    expect(bindData.deepLink).toContain('ghostboard://auth?token=');

    // 4. Desktop polls and retrieves verified token + profile
    const pollReq = new NextRequest(`http://localhost:3000/api/auth/desktop-poll?handshake=${handshakeId}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const pollRes = await desktopPollGet(pollReq);
    expect(pollRes.status).toBe(200);

    const pollData = await pollRes.json();
    expect(pollData.ready).toBe(true);
    expect(pollData.token).toBeDefined();
    expect(typeof pollData.token).toBe('string');
    expect(bindData.deepLink).toContain(pollData.token);
    expect(pollData.user).toBeDefined();
    expect(pollData.user.email).toBe(email);
    expect(pollData.user.name).toBe('Desktop Pilot');
  });
});
