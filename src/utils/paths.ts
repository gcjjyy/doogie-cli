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

export function getConfigPath(): string {
  return join(getAppDir(), 'config.json');
}

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
