// Game-related types
export interface Game {
  id: number;
  name: string;
  code: string;
  genre: string | null;
  sourceUrl: string;
  launcherType: string;
  isExtracted: boolean;
  localPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DownloadFile {
  id: number;
  gameId: number;
  filename: string;
  fileType: 'game' | 'config' | 'manual';
  downloadUrl: string | null;
  downloaded: boolean;
}

// Tistory-related types
export interface TistoryAttachment {
  filename: string;
  downloadUrl: string;
  fileType: 'game' | 'config' | 'manual';
  size: number;
}

export interface GameInfo {
  name: string;
  code: string;
  genre: string | null;
  sourceUrl: string;
  attachments: TistoryAttachment[];
}

// Launcher-related types
export interface LauncherConfig {
  executable: string;
  mountPath: string;
  additionalArgs?: string[];
}

export type Platform = 'darwin' | 'win32' | 'linux';

export interface AppConfig {
  gamesPath: string;
  dbPath: string;
  tempPath: string;
  dosboxPath?: string;
}
