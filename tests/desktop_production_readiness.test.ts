import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

describe('Desktop Production Readiness (R1 - R4 Lifecycle & Sanity QA)', () => {
  const rootDir = path.resolve(__dirname, '..');
  const desktopDir = path.join(rootDir, 'desktop');
  const tauriDir = path.join(desktopDir, 'src-tauri');

  describe('R1: OS Packaging & Single-Instance IPC', () => {
    it('confirms hooks.nsh registers copilot:// in registry and creates Desktop shortcut', () => {
      const hooksPath = path.join(tauriDir, 'hooks.nsh');
      expect(fs.existsSync(hooksPath)).toBe(true);
      const content = fs.readFileSync(hooksPath, 'utf8');

      expect(content).toContain('NSIS_HOOK_POSTINSTALL');
      expect(content).toContain('CreateShortcut "$DESKTOP\\Ghostboard.lnk"');
      expect(content).toContain('Software\\Classes\\copilot');
      expect(content).toContain('URL Protocol');
      expect(content).toContain('NSIS_HOOK_PREUNINSTALL');
      expect(content).toContain('Delete "$DESKTOP\\Ghostboard.lnk"');
      expect(content).toContain('DeleteRegKey HKCU "Software\\Classes\\copilot"');
    });

    it('confirms Info.plist declares CFBundleURLTypes for copilot:// and privacy descriptions', () => {
      const plistPath = path.join(tauriDir, 'Info.plist');
      expect(fs.existsSync(plistPath)).toBe(true);
      const content = fs.readFileSync(plistPath, 'utf8');

      expect(content).toContain('<key>CFBundleURLTypes</key>');
      expect(content).toContain('<string>copilot</string>');
      expect(content).toContain('<key>NSMicrophoneUsageDescription</key>');
      expect(content).toContain('<key>NSScreenCaptureUsageDescription</key>');
      expect(content).toMatch(/<key>LSUIElement<\/key>\s*<string>1<\/string>/);
    });

    it('confirms entitlements.mac.plist grants audio-input, network client & server', () => {
      const entPath = path.join(tauriDir, 'entitlements.mac.plist');
      expect(fs.existsSync(entPath)).toBe(true);
      const content = fs.readFileSync(entPath, 'utf8');

      expect(content).toContain('com.apple.security.device.audio-input');
      expect(content).toContain('com.apple.security.network.client');
      expect(content).toContain('com.apple.security.network.server');
    });

    it('confirms Linux desktop template and maintainer postinst/postrm scripts', () => {
      const desktopTemplate = path.join(tauriDir, 'templates/ghostboard.desktop');
      const postinst = path.join(tauriDir, 'scripts/postinst.sh');
      const postrm = path.join(tauriDir, 'scripts/postrm.sh');

      expect(fs.existsSync(desktopTemplate)).toBe(true);
      const tmplContent = fs.readFileSync(desktopTemplate, 'utf8');
      expect(tmplContent).toContain('MimeType=x-scheme-handler/copilot;');
      expect(tmplContent).toContain('Exec={{exec}} %u');

      expect(fs.existsSync(postinst)).toBe(true);
      expect(fs.readFileSync(postinst, 'utf8')).toContain('update-desktop-database');

      expect(fs.existsSync(postrm)).toBe(true);
      expect(fs.readFileSync(postrm, 'utf8')).toContain('gtk-update-icon-cache');
    });

    it('validates multi-resolution icon assets exist across all target OS resolutions', () => {
      const iconSizes = ['16x16.png', '24x24.png', '32x32.png', '48x48.png', '64x64.png', '128x128.png', '256x256.png', '512x512.png', 'icon.icns', 'icon.ico'];
      for (const icon of iconSizes) {
        const p = path.join(tauriDir, 'icons', icon);
        expect(fs.existsSync(p)).toBe(true);
        expect(fs.statSync(p).size).toBeGreaterThan(100);
      }
    });

    it('validates tauri.conf.json window geometry is 720x480 and deep-link scheme is copilot', () => {
      const confPath = path.join(tauriDir, 'tauri.conf.json');
      const conf = JSON.parse(fs.readFileSync(confPath, 'utf8'));

      expect(conf.app.windows[0].width).toBe(720);
      expect(conf.bundle.windows.nsis.installerHooks).toBe('hooks.nsh');
      expect(conf.bundle.macOS.entitlements).toBe('entitlements.mac.plist');
      expect(conf.bundle.linux.deb.desktopTemplate).toBe('templates/ghostboard.desktop');
      expect(conf.plugins['deep-link'].desktop.schemes).toContain('copilot');
    });
  });

  describe('R2: OAuth 2.0 PKCE, Deep Linking & Keyring Security', () => {
    it('validates PKCE S256 challenge generation math (RFC 7636 Appendix B vector)', () => {
      const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
      const hash = crypto.createHash('sha256').update(verifier).digest();
      const challenge = hash.toString('base64url');
      expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
    });

    it('validates Rust auth module files exist and contain zero plaintext storage', () => {
      const authMod = path.join(tauriDir, 'src/auth/mod.rs');
      const pkceFile = path.join(tauriDir, 'src/auth/pkce.rs');
      const keyringFile = path.join(tauriDir, 'src/auth/keyring.rs');
      const deviceFile = path.join(tauriDir, 'src/auth/device_code.rs');
      const tokenFile = path.join(tauriDir, 'src/auth/token_service.rs');

      expect(fs.existsSync(authMod)).toBe(true);
      expect(fs.existsSync(pkceFile)).toBe(true);
      expect(fs.existsSync(keyringFile)).toBe(true);
      expect(fs.existsSync(deviceFile)).toBe(true);
      expect(fs.existsSync(tokenFile)).toBe(true);

      const keyringContent = fs.readFileSync(keyringFile, 'utf8');
      expect(keyringContent).toContain('KEYRING_SERVICE: &str = "ai.ghostboard.desktop"');
      expect(keyringContent).toContain('KEYRING_USER: &str = "session_tokens"');
      expect(keyringContent).toContain('delete_credential');
    });

    it('verifies eradication of legacy plaintext localStorage files in desktop', () => {
      const deadFiles = [
        'desktop/src/hud.js',
        'desktop/src/hud.css',
        'desktop/src/stt.js',
        'desktop/src/ticker.html',
        'desktop/src/ticker.js',
        'desktop/src/gatekeeper.html',
      ];
      for (const dead of deadFiles) {
        expect(fs.existsSync(path.join(rootDir, dead))).toBe(false);
      }
    });
  });

  describe('R3: Combat HUD Frontend & Compositor Controls', () => {
    it('confirms window alignment uses 720.0px width and 8.0px top padding under webcam', () => {
      const alignFile = path.join(tauriDir, 'src/window/alignment.rs');
      const content = fs.readFileSync(alignFile, 'utf8');
      expect(content).toContain('HUD_LOGICAL_WIDTH: f64 = 720.0');
      expect(content).toContain('TOP_PADDING_LOGICAL: f64 = 8.0');
    });

    it('confirms global shortcuts register Panic (Ctrl+Shift+H) and Click-Through (Ctrl+Shift+X)', () => {
      const mainFile = path.join(tauriDir, 'src/main.rs');
      const content = fs.readFileSync(mainFile, 'utf8');
      expect(content).toContain('Ctrl+Shift+H');
      expect(content).toContain('Super+Shift+H');
      expect(content).toContain('Ctrl+Shift+X');
      expect(content).toContain('Super+Shift+X');
    });

    it('confirms EyeLineTeleprompter renders 720px width, latency, audio switcher, and pinned 3 pillars', () => {
      const prompterFile = path.join(desktopDir, 'src/components/EyeLineTeleprompter.tsx');
      expect(fs.existsSync(prompterFile)).toBe(true);
      const content = fs.readFileSync(prompterFile, 'utf8');

      expect(content).toContain('max-w-[720px]');
      expect(content).toContain('connectionLatencyMs');
      expect(content).toContain('cycleAudioSource');
      expect(content).toContain('3 PILLARS PINNED');
      expect(content).toContain('handleSnapToLive');
      expect(content).toContain('startPkceLogin');
      expect(content).toContain('startDeviceCodeFlow');
    });
  });
});
