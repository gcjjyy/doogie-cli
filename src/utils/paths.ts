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

export function getExecutersDir(): string {
  return join(getAppDir(), 'executers');
}

export function getConfigPath(): string {
  return join(getAppDir(), 'config.json');
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

export function getMapperDir(): string {
  return join(getAppDir(), 'mapper');
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
