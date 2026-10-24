import { NextRequest, NextResponse } from 'next/server';

export interface UpdateManifestResponse {
  version: string;
  notes: string;
  pub_date: string;
  url: string;
  signature: string;
}

/**
 * Parses semver string into [major, minor, patch] numeric tuple.
 */
export function parseSemver(v: string): [number, number, number] {
  if (!v) return [0, 0, 0];
  const clean = v.replace(/^v/i, '').trim();
  const main = clean.split('-')[0].split('+')[0];
  const parts = main.split('.').map((p) => {
    const num = parseInt(p, 10);
    return isNaN(num) ? 0 : num;
  });
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

/**
 * Returns true if targetVer is strictly greater than clientVer according to semver precedence.
 */
export function isNewerVersion(clientVer: string, targetVer: string): boolean {
  const [cMajor, cMinor, cPatch] = parseSemver(clientVer);
  const [tMajor, tMinor, tPatch] = parseSemver(targetVer);

  if (tMajor > cMajor) return true;
  if (tMajor < cMajor) return false;
  if (tMinor > cMinor) return true;
  if (tMinor < cMinor) return false;
  return tPatch > cPatch;
}

/**
 * Resolves platform-specific artifact file extension and URL for Tauri v2 Updater.
 */
export function resolveReleaseAssetUrl(
  baseUrl: string,
  version: string,
  target: string,
  arch: string
): string {
  const normalizedTarget = target.toLowerCase();
  let assetName: string;

  if (normalizedTarget.includes('windows') || normalizedTarget.includes('msvc')) {
    assetName = `ghostboard_${version}_${arch}-setup.nsis.zip`;
  } else if (normalizedTarget.includes('darwin') || normalizedTarget.includes('apple') || normalizedTarget.includes('mac')) {
    assetName = `ghostboard_${version}_${arch}.app.tar.gz`;
  } else {
    // Linux default (AppImage or debian tarball)
    assetName = `ghostboard_${version}_${arch}.AppImage.tar.gz`;
  }

  const cleanBase = baseUrl.replace(/\/+$/, '');
  return `${cleanBase}/v${version}/${assetName}`;
}

/**
 * Dynamic Update Server route handler compliant with Tauri v2 Updater specification.
 *
 * Route: GET /api/desktop/updates/[target]/[arch]/[version]
 *
 * Returns:
 * - 204 No Content: When client version is up-to-date or DESKTOP_LATEST_VERSION is not configured.
 * - 200 OK: When a newer version is available, returning JSON update manifest with signature and URL.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ target: string; arch: string; version: string }> }
): Promise<NextResponse> {
  const { target, arch, version: clientVersion } = await context.params;

  const latestVersion = process.env.DESKTOP_LATEST_VERSION;

  // If no release version is configured on the server, or client is already up-to-date
  if (!latestVersion || !isNewerVersion(clientVersion, latestVersion)) {
    return new NextResponse(null, { status: 204 });
  }

  const baseUrl =
    process.env.DESKTOP_RELEASE_BASE_URL ||
    'https://github.com/ghostboard-ai/ghostboard/releases/download';

  const downloadUrl =
    process.env.DESKTOP_RELEASE_URL ||
    resolveReleaseAssetUrl(baseUrl, latestVersion, target, arch);

  const notes =
    process.env.DESKTOP_RELEASE_NOTES ||
    `Ghostboard Desktop v${latestVersion}: High-frequency STT enhancements, screen share stealth upgrades, and sub-second copilot performance.`;

  const pubDate = process.env.DESKTOP_RELEASE_PUB_DATE || '2026-10-25T00:00:00Z';

  const signature =
    process.env.DESKTOP_RELEASE_SIGNATURE ||
    'dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkKV1NCa0FRMEQ1RDVCRDFBN0tSV1JCWHVvQjZrS0RHdzVoK09wbnJPMXozdXdDVUJLbXMwY3VrWVh1RE96SlY0a0J6dS93V0tFaQo=';

  const payload: UpdateManifestResponse = {
    version: latestVersion,
    notes,
    pub_date: pubDate,
    url: downloadUrl,
    signature,
  };

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Type': 'application/json',
    },
  });
}
