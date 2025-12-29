import { platform, arch } from 'os';
import { existsSync, realpathSync } from 'fs';
import { dirname, join } from 'path';
import type { Platform } from '../types/index.ts';

// 번들된 DOSBox-X 실행파일 경로 (빌드 시 import.meta.dir 기준)
// 개발 모드에서는 src/data/executers/, 빌드 후에는 실행파일과 같은 경로
function getBundledExecutersDir(): string {
  // import.meta.dir은 현재 파일의 디렉토리
  // 빌드 후: /path/to/doogie-cli (실행파일 위치)
  // 개발 중: /path/to/doogie-cli/src/utils
  let currentDir = import.meta.dir;

  // 개발 모드 체크 (src/utils 경로인 경우)
  if (currentDir.includes('/src/utils')) {
    return join(dirname(dirname(currentDir)), 'src', 'data', 'executers');
  }

  // Homebrew symlink 해결 (bin/doogie -> libexec/doogie-cli-macos-arm64)
  // process.execPath가 실제 바이너리 위치를 알려줌
  try {
    const realExecPath = realpathSync(process.execPath);
    currentDir = dirname(realExecPath);
  } catch {
    // realpathSync 실패 시 원래 경로 사용
  }

  // 빌드된 실행파일인 경우, 같은 디렉토리에 executers 폴더
  return join(currentDir, 'executers');
}

/**
 * 현재 아키텍처에 맞는 디렉토리명 반환
 */
function getArchDir(): string {
  const currentArch = arch(); // 'arm64' or 'x64'
  return currentArch === 'arm64' ? 'arm64' : 'x86_64';
}

/**
 * 번들된 DOSBox-X 실행파일 경로 반환
 */
export function getBundledDosboxXPath(): string | null {
  const plat = getPlatform();
  if (plat !== 'darwin') {
    return null; // 현재 macOS만 지원
  }

  const archDir = getArchDir();
  const execPath = join(getBundledExecutersDir(), 'macos', archDir, 'dosbox-x');
  if (existsSync(execPath)) {
    return execPath;
  }
  return null;
}

/**
 * 번들된 DOSBox-X의 dylib 디렉토리 경로 반환
 */
export function getBundledDosboxXLibDir(): string | null {
  const plat = getPlatform();
  if (plat !== 'darwin') {
    return null;
  }

  const archDir = getArchDir();
  // dylib은 실행파일과 같은 아키텍처 디렉토리 내의 서브디렉토리에 있음
  const libDir = join(getBundledExecutersDir(), 'macos', archDir, archDir);

  if (existsSync(libDir)) {
    return libDir;
  }
  return null;
}

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

// DOSBox-X paths
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

export function findDosboxXPath(): string | null {
  // 번들된 DOSBox-X 우선 사용
  const bundledPath = getBundledDosboxXPath();
  if (bundledPath) {
    return bundledPath;
  }

  // 시스템 설치된 DOSBox-X 탐색
  const plat = getPlatform();
  for (const p of DOSBOX_X_PATHS[plat]) {
    if (existsSync(p)) {
      return p;
    }
  }

  return null;
}

