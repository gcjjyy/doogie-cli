import { platform } from 'os';
import { existsSync } from 'fs';
import type { Platform } from '../types/index.ts';

export function getPlatform(): Platform {
  const p = platform();
  if (p === 'darwin' || p === 'win32' || p === 'linux') {
    return p;
  }
  throw new Error(`Unsupported platform: ${p}`);
}

export function isDarwin(): boolean {
  return getPlatform() === 'darwin';
}

export function isWindows(): boolean {
  return getPlatform() === 'win32';
}

export function isLinux(): boolean {
  return getPlatform() === 'linux';
}

// DOSBox-X paths (preferred)
const DOSBOX_X_PATHS: Record<Platform, string[]> = {
  darwin: [
    '/Applications/DOSBox-X.app/Contents/MacOS/dosbox-x',
    '/opt/homebrew/bin/dosbox-x',
    '/usr/local/bin/dosbox-x',
  ],
  win32: [
    'C:\\Program Files\\DOSBox-X\\dosbox-x.exe',
    'C:\\Program Files (x86)\\DOSBox-X\\dosbox-x.exe',
  ],
  linux: [
    '/usr/bin/dosbox-x',
    '/usr/local/bin/dosbox-x',
    '/snap/bin/dosbox-x',
    '/var/lib/flatpak/exports/bin/com.dosbox_x.DOSBox-X',
  ],
};

// Original DOSBox paths (fallback)
const DOSBOX_PATHS: Record<Platform, string[]> = {
  darwin: [
    '/Applications/DOSBox.app/Contents/MacOS/DOSBox',
    '/opt/homebrew/bin/dosbox',
    '/usr/local/bin/dosbox',
  ],
  win32: [
    'C:\\Program Files\\DOSBox-0.74-3\\DOSBox.exe',
    'C:\\Program Files (x86)\\DOSBox-0.74-3\\DOSBox.exe',
    'C:\\Program Files\\DOSBox\\DOSBox.exe',
    'C:\\Program Files (x86)\\DOSBox\\DOSBox.exe',
  ],
  linux: [
    '/usr/bin/dosbox',
    '/usr/local/bin/dosbox',
    '/snap/bin/dosbox',
    '/var/lib/flatpak/exports/bin/com.dosbox.DOSBox',
  ],
};

export interface DosboxInfo {
  path: string;
  type: 'dosbox-x' | 'dosbox';
}

export function findDosboxPath(): DosboxInfo | null {
  const platform = getPlatform();

  // Try DOSBox-X first (preferred)
  for (const p of DOSBOX_X_PATHS[platform]) {
    if (existsSync(p)) {
      return { path: p, type: 'dosbox-x' };
    }
  }

  // Fallback to original DOSBox
  for (const p of DOSBOX_PATHS[platform]) {
    if (existsSync(p)) {
      return { path: p, type: 'dosbox' };
    }
  }

  return null;
}

export function getDosboxInstallGuide(): string {
  const p = getPlatform();

  switch (p) {
    case 'darwin':
      return `DOSBox 또는 DOSBox-X를 설치해주세요:
  brew install dosbox        # DOSBox (기본)
  brew install dosbox-x      # DOSBox-X (권장)
  또는 https://dosbox-x.com 에서 다운로드`;

    case 'win32':
      return `DOSBox 또는 DOSBox-X를 설치해주세요:
  https://www.dosbox.com 에서 DOSBox 다운로드
  https://dosbox-x.com 에서 DOSBox-X 다운로드 (권장)`;

    case 'linux':
      return `DOSBox 또는 DOSBox-X를 설치해주세요:
  Ubuntu/Debian: sudo apt install dosbox
  Ubuntu/Debian: sudo apt install dosbox-x  # (권장)
  Fedora: sudo dnf install dosbox
  또는 flatpak install flathub com.dosbox_x.DOSBox-X`;
  }
}
