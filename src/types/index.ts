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

// W98KR (Windows 98 Korean) image types
export type ExecuterType = 'dosbox' | 'w98kr' | 'pcem' | 'windows';

export interface W98krInfo {
  name: string;           // e.g., 'W98KR_Daum_Final'
  imagePath: string;      // Path to Win98.img
  diskParams: string;     // e.g., '512,63,64,520'
  version: string;        // From Ver.txt
}

export interface DiskGeometry {
  sectorSize: number;     // 512
  sectorsPerTrack: number; // 63
  heads: number;          // 64
  cylinders: number;      // varies
}
