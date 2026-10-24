import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  GET,
  parseSemver,
  isNewerVersion,
  resolveReleaseAssetUrl,
  UpdateManifestResponse,
} from '../src/app/api/desktop/updates/[target]/[arch]/[version]/route';

describe('Tauri v2 Desktop Release Manifest Endpoint (/api/desktop/updates)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('1. Semver Comparison & Precedence Heuristics', () => {
    it('correctly parses semver strings with or without prefixes and prereleases', () => {
      expect(parseSemver('1.2.3')).toEqual([1, 2, 3]);
      expect(parseSemver('v1.2.0')).toEqual([1, 2, 0]);
      expect(parseSemver('v2.0.0-beta.1')).toEqual([2, 0, 0]);
      expect(parseSemver('0.1.0+build.123')).toEqual([0, 1, 0]);
      expect(parseSemver('')).toEqual([0, 0, 0]);
    });

    it('correctly determines if target version is newer than client version', () => {
      // Patch bump
      expect(isNewerVersion('1.2.0', '1.2.1')).toBe(true);
      // Minor bump
      expect(isNewerVersion('1.2.0', '1.3.0')).toBe(true);
      // Major bump
      expect(isNewerVersion('1.2.0', '2.0.0')).toBe(true);
      // Same version
      expect(isNewerVersion('1.2.0', '1.2.0')).toBe(false);
      // Client ahead (dev/staging)
      expect(isNewerVersion('1.3.0', '1.2.0')).toBe(false);
      expect(isNewerVersion('2.0.0', '1.9.9')).toBe(false);
    });
  });

  describe('2. Platform-Specific Release Asset Resolution', () => {
    const base = 'https://github.com/ghostboard-ai/ghostboard/releases/download';

    it('resolves Windows NSIS setup archive', () => {
      const url = resolveReleaseAssetUrl(base, '1.3.0', 'windows-x86_64', 'x86_64');
      expect(url).toBe(`${base}/v1.3.0/ghostboard_1.3.0_x86_64-setup.nsis.zip`);
    });

    it('resolves macOS tarball bundle', () => {
      const url = resolveReleaseAssetUrl(base, '1.3.0', 'darwin-aarch64', 'aarch64');
      expect(url).toBe(`${base}/v1.3.0/ghostboard_1.3.0_aarch64.app.tar.gz`);
    });

    it('resolves Linux AppImage tarball bundle', () => {
      const url = resolveReleaseAssetUrl(base, '1.3.0', 'linux-x86_64', 'x86_64');
      expect(url).toBe(`${base}/v1.3.0/ghostboard_1.3.0_x86_64.AppImage.tar.gz`);
    });
  });

  describe('3. Dynamic Update Server Route Handler (GET)', () => {
    const createReq = (target: string, arch: string, version: string) => {
      return new NextRequest(
        `https://ghostboard.ai/api/desktop/updates/${target}/${arch}/${version}`
      );
    };

    it('returns 204 No Content when DESKTOP_LATEST_VERSION is not configured', async () => {
      delete process.env.DESKTOP_LATEST_VERSION;

      const req = createReq('linux', 'x86_64', '1.2.0');
      const res = await GET(req, {
        params: Promise.resolve({ target: 'linux', arch: 'x86_64', version: '1.2.0' }),
      });

      expect(res.status).toBe(204);
    });

    it('returns 204 No Content when client version matches the latest release', async () => {
      process.env.DESKTOP_LATEST_VERSION = '1.2.0';

      const req = createReq('windows', 'x86_64', '1.2.0');
      const res = await GET(req, {
        params: Promise.resolve({ target: 'windows', arch: 'x86_64', version: '1.2.0' }),
      });

      expect(res.status).toBe(204);
    });

    it('returns 204 No Content when client version is ahead of latest release', async () => {
      process.env.DESKTOP_LATEST_VERSION = '1.2.0';

      const req = createReq('darwin', 'aarch64', '1.3.0');
      const res = await GET(req, {
        params: Promise.resolve({ target: 'darwin', arch: 'aarch64', version: '1.3.0' }),
      });

      expect(res.status).toBe(204);
    });

    it('returns 200 OK with valid Tauri v2 manifest JSON when an update is available', async () => {
      process.env.DESKTOP_LATEST_VERSION = '1.3.0';
      process.env.DESKTOP_RELEASE_NOTES = 'Critical performance boost & zero latency';
      process.env.DESKTOP_RELEASE_PUB_DATE = '2026-10-25T12:00:00Z';
      process.env.DESKTOP_RELEASE_SIGNATURE = 'mock_minisign_signature_base64';

      const req = createReq('linux-x86_64', 'x86_64', '1.2.0');
      const res = await GET(req, {
        params: Promise.resolve({ target: 'linux-x86_64', arch: 'x86_64', version: '1.2.0' }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/json');

      const data = (await res.json()) as UpdateManifestResponse;
      expect(data.version).toBe('1.3.0');
      expect(data.notes).toBe('Critical performance boost & zero latency');
      expect(data.pub_date).toBe('2026-10-25T12:00:00Z');
      expect(data.signature).toBe('mock_minisign_signature_base64');
      expect(data.url).toContain('ghostboard_1.3.0_x86_64.AppImage.tar.gz');
    });
  });
});
