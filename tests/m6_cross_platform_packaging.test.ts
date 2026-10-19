import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Milestone 6: Cross-Platform Packaging & Tauri v2 CI/CD Verification', () => {
  const rootDir = path.resolve(__dirname, '..');
  const tauriConfPath = path.join(rootDir, 'desktop/src-tauri/tauri.conf.json');
  const infoPlistPath = path.join(rootDir, 'desktop/src-tauri/Info.plist');
  const desktopPkgPath = path.join(rootDir, 'desktop/package.json');
  const rootPkgPath = path.join(rootDir, 'package.json');
  const releaseWfPath = path.join(rootDir, '.github/workflows/release.yml');
  const desktopWfPath = path.join(rootDir, '.github/workflows/desktop.yml');

  describe('1. tauri.conf.json Multi-Target Bundle Specification', () => {
    it('contains bundle configuration with all required targets', () => {
      expect(fs.existsSync(tauriConfPath)).toBe(true);
      const conf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));

      expect(conf.bundle).toBeDefined();
      expect(conf.bundle.active).toBe(true);

      const targets = conf.bundle.targets;
      expect(targets).toContain('appimage');
      expect(targets).toContain('deb');
      expect(targets).toContain('nsis');
      expect(targets).toContain('dmg');
    });

    it('specifies complete Linux deb system package dependencies', () => {
      const conf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
      const debDepends = conf.bundle?.linux?.deb?.depends;

      expect(debDepends).toBeDefined();
      expect(Array.isArray(debDepends)).toBe(true);

      expect(debDepends).toContain('libwebkit2gtk-4.1-0');
      expect(debDepends).toContain('libgtk-3-0');
      expect(debDepends).toContain('libasound2');
      expect(debDepends).toContain('libpipewire-0.3-0 | libpulse0');
    });

    it('configures Windows NSIS installer', () => {
      const conf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
      const nsis = conf.bundle?.windows?.nsis;

      expect(nsis).toBeDefined();
      expect(nsis.installerIcon).toBe('icons/icon.ico');
      expect(nsis.installMode).toBe('currentUser');
      expect(nsis.languages).toContain('en-US');
    });

    it('configures macOS DMG and links Info.plist with LSUIElement = 1', () => {
      const conf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
      const macOS = conf.bundle?.macOS;

      expect(macOS).toBeDefined();
      expect(macOS.infoPlist).toBe('Info.plist');
      expect(macOS.dmg).toBeDefined();
      expect(macOS.dmg.windowSize).toBeDefined();
      expect(macOS.dmg.windowPosition).toBeDefined();

      // Check Info.plist content
      expect(fs.existsSync(infoPlistPath)).toBe(true);
      const plistContent = fs.readFileSync(infoPlistPath, 'utf8');
      expect(plistContent).toMatch(/<key>LSUIElement<\/key>\s*<string>1<\/string>/);
    });
  });

  describe('2. CI/CD Workflow Tauri v2 Migration', () => {
    it('release.yml uses Tauri v2 build commands and targets instead of electron-builder', () => {
      expect(fs.existsSync(releaseWfPath)).toBe(true);
      const releaseWf = fs.readFileSync(releaseWfPath, 'utf8');

      expect(releaseWf).not.toContain('electron-builder');
      expect(releaseWf).not.toContain('npx electron');
      expect(releaseWf).toContain('Tauri v2');
      expect(releaseWf).toMatch(/npm run build:(linux|win|mac)/);
      expect(releaseWf).toContain('actions/upload-artifact');
    });

    it('desktop.yml validates Tauri backend & frontend in CI', () => {
      expect(fs.existsSync(desktopWfPath)).toBe(true);
      const desktopWf = fs.readFileSync(desktopWfPath, 'utf8');

      expect(desktopWf).toContain('npm run typecheck');
      expect(desktopWf).toContain('npm run build:renderer');
      expect(desktopWf).toContain('cargo check');
      expect(desktopWf).toContain('cargo check --release');
      expect(desktopWf).toContain('cargo test');
    });
  });

  describe('3. Legacy Electron Eradication Verification', () => {
    const legacyFiles = [
      'desktop/main.js',
      'desktop/preload.js',
      'desktop/electron-builder.yml',
      'desktop/pkce-loopback.js',
      'desktop/secure-store.js',
      'desktop/ghostboard-app.sh',
      'desktop/scripts/dev-runner.mjs',
      'run-desktop.sh',
    ];

    it.each(legacyFiles)('confirms %s has been deleted', (relPath) => {
      const fullPath = path.join(rootDir, relPath);
      expect(fs.existsSync(fullPath)).toBe(false);
    });

    it('confirms no electron dependencies remain in desktop/package.json or package.json', () => {
      const desktopPkg = JSON.parse(fs.readFileSync(desktopPkgPath, 'utf8'));
      const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));

      const forbiddenDeps = ['electron', 'electron-builder', 'electron-updater', 'electron-log'];

      for (const dep of forbiddenDeps) {
        expect(desktopPkg.dependencies?.[dep]).toBeUndefined();
        expect(desktopPkg.devDependencies?.[dep]).toBeUndefined();
        expect(rootPkg.dependencies?.[dep]).toBeUndefined();
        expect(rootPkg.devDependencies?.[dep]).toBeUndefined();
      }
    });
  });
});
