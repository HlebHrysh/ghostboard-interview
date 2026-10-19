import { NextRequest, NextResponse } from 'next/server';

interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface GitHubRelease {
  tag_name: string;
  assets: GitHubReleaseAsset[];
}

const GITHUB_REPO = 'HlebHrysh/ghostboard-interview';
let cachedRelease: { data: GitHubRelease; expiry: number } | null = null;

async function getLatestRelease(): Promise<GitHubRelease | null> {
  const now = Date.now();
  if (cachedRelease && cachedRelease.expiry > now) {
    return cachedRelease.data;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Ghostboard-Download-Bridge',
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
      next: { revalidate: 300 }, // Cache 5 minutes
    });

    if (!res.ok) return null;
    const data: GitHubRelease = await res.json();
    cachedRelease = { data, expiry: now + 300 * 1000 };
    return data;
  } catch (err) {
    console.error('[/api/download] GitHub API error:', err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userAgent = req.headers.get('user-agent') || '';
  
  let os = searchParams.get('os')?.toLowerCase();

  // Intelligent User-Agent OS inference if query param omitted
  if (!os) {
    const ua = userAgent.toLowerCase();
    if (ua.includes('macintosh') || ua.includes('mac os')) {
      os = 'mac-arm64'; // Default modern Mac to Apple Silicon
    } else if (ua.includes('windows')) {
      os = 'win';
    } else if (ua.includes('linux')) {
      os = 'linux';
    } else {
      os = 'win';
    }
  }

  const release = await getLatestRelease();

  // Fallback direct URL if release API is rate-limited
  const fallbackBase = `https://github.com/${GITHUB_REPO}/releases/latest/download`;

  if (!release || !release.assets || release.assets.length === 0) {
    switch (os) {
      case 'mac-arm64':
        return NextResponse.redirect(`${fallbackBase}/Ghostboard-1.2.0-arm64.dmg`, 302);
      case 'mac-intel':
      case 'mac-x64':
        return NextResponse.redirect(`${fallbackBase}/Ghostboard-1.2.0-x64.dmg`, 302);
      case 'mac-universal':
        return NextResponse.redirect(`${fallbackBase}/Ghostboard-1.2.0-universal.dmg`, 302);
      case 'win':
      case 'win-setup':
        return NextResponse.redirect(`${fallbackBase}/Ghostboard-Setup-1.2.0.exe`, 302);
      case 'win-portable':
        return NextResponse.redirect(`${fallbackBase}/Ghostboard-Portable-1.2.0.exe`, 302);
      case 'linux-deb':
        return NextResponse.redirect(`${fallbackBase}/Ghostboard-1.2.0-x64.deb`, 302);
      case 'linux':
      default:
        return NextResponse.redirect(`${fallbackBase}/Ghostboard-1.2.0-x64.AppImage`, 302);
    }
  }

  const assets = release.assets;
  let targetAsset: GitHubReleaseAsset | undefined;

  switch (os) {
    case 'mac-arm64':
      targetAsset = assets.find((a) => a.name.endsWith('-arm64.dmg')) ||
                    assets.find((a) => a.name.endsWith('.dmg') && !a.name.includes('-x64'));
      break;

    case 'mac-intel':
    case 'mac-x64':
      targetAsset = assets.find((a) => a.name.endsWith('-x64.dmg')) ||
                    assets.find((a) => a.name.endsWith('.dmg'));
      break;

    case 'mac-universal':
      targetAsset = assets.find((a) => a.name.includes('universal.dmg')) ||
                    assets.find((a) => a.name.endsWith('.dmg'));
      break;

    case 'win':
    case 'win-setup':
      targetAsset = assets.find((a) => a.name.startsWith('Ghostboard-Setup-') && a.name.endsWith('.exe')) ||
                    assets.find((a) => a.name.endsWith('.exe') && !a.name.includes('Portable'));
      break;

    case 'win-portable':
      targetAsset = assets.find((a) => a.name.includes('Portable') && a.name.endsWith('.exe'));
      break;

    case 'linux-deb':
      targetAsset = assets.find((a) => a.name.endsWith('.deb'));
      break;

    case 'linux':
    case 'linux-appimage':
    default:
      targetAsset = assets.find((a) => a.name.endsWith('.AppImage'));
      break;
  }

  if (targetAsset) {
    return NextResponse.redirect(targetAsset.browser_download_url, 302);
  }

  // Graceful fallback to GitHub Releases web view
  return NextResponse.redirect(`https://github.com/${GITHUB_REPO}/releases/latest`, 302);
}
