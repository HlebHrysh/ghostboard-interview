import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as registerPost } from '../src/app/api/auth/register/route';
import { POST as loginPost } from '../src/app/api/auth/login/route';
import { POST as passwordPost } from '../src/app/api/auth/password/route';
import { GET as devicesGet, POST as devicesPost } from '../src/app/api/sessions/devices/route';
import { getUserByEmail, createUser, setUserPassword, hashPassword, verifyPassword, createSession, listUserSessions, revokeUserSession } from '../src/lib/serverDb';

describe('Auth & Device Session Flow', () => {
  const testEmail = `test_${Date.now()}@ghostboard.ai`;
  const testPassword = 'StrongPassword123!';

  let ipCounter = 10;
  function headers() {
    ipCounter++;
    return {
      'Content-Type': 'application/json',
      'host': 'localhost:3000',
      'origin': 'http://localhost:3000',
      'x-forwarded-for': `192.168.12.${ipCounter}`,
    };
  }

  it('rejects registration with weak password (< 8 chars)', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        email: 'weak@ghostboard.ai',
        password: '123',
      }),
    });

    const res = await registerPost(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.code).toBe('WEAK_PASSWORD');
  });

  it('registers a new user with scrypt-hashed password', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        role: 'Fullstack Engineer',
      }),
    });

    const res = await registerPost(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.email).toBe(testEmail);

    // Verify stored password in serverDb
    const dbUser = await getUserByEmail(testEmail);
    expect(dbUser).toBeDefined();
    expect(dbUser?.passwordHash).toBeDefined();
    expect(verifyPassword(testPassword, dbUser?.passwordHash)).toBe(true);
  }, 15000);

  it('rejects duplicate email registration with EMAIL_TAKEN (409)', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    const res = await registerPost(req);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.code).toBe('EMAIL_TAKEN');
  });

  it('returns USER_NOT_FOUND (404) for unknown email so frontend prompts registration', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        email: 'unknown_candidate_404@ghostboard.ai',
        password: 'AnyPassword123!',
      }),
    });

    const res = await loginPost(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.code).toBe('USER_NOT_FOUND');
  });

  it('rejects wrong password with WRONG_PASSWORD (401)', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword999!',
      }),
    });

    const res = await loginPost(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.code).toBe('WRONG_PASSWORD');
  });

  it('logs in successfully and returns session token for desktop client', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        client: 'desktop',
      }),
    });

    const res = await loginPost(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.token).toBeDefined();
    expect(typeof data.token).toBe('string');
  });

  it('manages device sessions: lists sessions and allows revocation', async () => {
    const user = await getUserByEmail(testEmail);
    expect(user).toBeDefined();

    // Create a web session and a desktop session
    const webSession = await createSession(user!.id, 'web');
    const desktopSession = await createSession(user!.id, 'desktop');

    // List sessions using webSession token
    const list = await listUserSessions(user!.id, webSession.token);
    expect(list.length).toBeGreaterThanOrEqual(2);

    const currentWeb = list.find((s) => s.isCurrent);
    expect(currentWeb).toBeDefined();
    expect(currentWeb?.deviceType).toBe('web');

    const desktopEntry = list.find((s) => s.deviceType === 'desktop');
    expect(desktopEntry).toBeDefined();

    // Revoke desktop session
    const revoked = await revokeUserSession(user!.id, desktopEntry!.publicId);
    expect(revoked).toBe(true);

    // Verify desktop session is revoked
    const afterList = await listUserSessions(user!.id, webSession.token);
    const revokedCheck = afterList.find((s) => s.publicId === desktopEntry!.publicId);
    expect(revokedCheck).toBeUndefined();
  });
});
