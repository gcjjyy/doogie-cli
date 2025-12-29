import { homedir } from 'os';
import { join } from 'path';
import { mkdir } from 'fs/promises';

const APP_DIR = '.doogie-cli';

export function getAppDir(): string {
  return join(homedir(), APP_DIR);
}

export function getGamesDir(): string {
  return join(getAppDir(), 'games');
}

export function getDbPath(): string {
  return join(getAppDir(), 'doogie.db');
}

export function getTempDir(): string {
  return join(getAppDir(), 'temp');
}

export function getLogsDir(): string {
  return join(getAppDir(), 'logs');
}

export function getConfigPath(): string {
  return join(getAppDir(), 'config.json');
}

// Win9x 이미지 디렉토리
// 언어 코드: 'kr' (한국어), 'jp' (일본어), 'en' (영어)
export type Win9xLanguage = 'kr' | 'jp' | 'en';

/**
 * Win9x 이미지 디렉토리 경로 조회 (일반화된 함수)
 * @param windowsVersion '95' 또는 '98'
 * @param language 'kr', 'jp', 'en'
 */
export function getWin9xDir(windowsVersion: '95' | '98', language: Win9xLanguage): string {
  return join(getAppDir(), `w${windowsVersion}${language}`);
}

// Windows 95 Korean
export function getW95krDir(): string {
  return getWin9xDir('95', 'kr');
}

// Windows 95 Japanese
export function getW95jpDir(): string {
  return getWin9xDir('95', 'jp');
}

// Windows 95 English
export function getW95enDir(): string {
  return getWin9xDir('95', 'en');
}

// Windows 98 Korean
export function getW98krDir(): string {
  return getWin9xDir('98', 'kr');
}

// Windows 98 Japanese
export function getW98jpDir(): string {
  return getWin9xDir('98', 'jp');
}

// Windows 98 English
export function getW98enDir(): string {
  return getWin9xDir('98', 'en');
}

// Legacy: DOSBox-X 전용 이미지 디렉토리 (하위 호환성)
export function getW98krXDir(): string {
  return join(getAppDir(), 'w98kr-x');
}

export function getW98krXImagePath(imageName: string): string {
  return join(getW98krXDir(), imageName);
}

export function getW95krXDir(): string {
  return join(getAppDir(), 'w95kr-x');
}

export function getW95krXImagePath(imageName: string): string {
  return join(getW95krXDir(), imageName);
}

export function getUtilDir(): string {
  return join(getAppDir(), 'util');
}

export function getDosUtilDir(): string {
  return join(getUtilDir(), 'Dos', 'Util');
}

export function getGusDir(): string {
  return join(getUtilDir(), 'Dos', 'GUS');
}

export function getDataDir(): string {
  return join(getAppDir(), 'data');
}

export function getDefaultConfPath(): string {
  return join(getDataDir(), 'Default.conf');
}

export function getOptionsDir(): string {
  return join(getDataDir(), 'Options');
}

export function getTemplateConfPath(executerName: string): string {
  return join(getOptionsDir(), `${executerName}.conf`);
}

export function getGameDir(gameCode: string): string {
  return join(getGamesDir(), gameCode);
}

export async function ensureAppDirs(): Promise<void> {
  const dirs = [
    getAppDir(),
    getGamesDir(),
    getTempDir(),
  ];

  for (const dir of dirs) {
    await mkdir(dir, { recursive: true });
  }
}
