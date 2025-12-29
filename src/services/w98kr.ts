import { existsSync } from 'fs';
import { mkdir, readdir, readFile, rm } from 'fs/promises';
import { join, basename } from 'path';
import { getW98krXDir, getW95krXDir, getTempDir } from '../utils/paths.ts';
import { parseGamePage, downloadFiles, groupAttachments } from './tistory.ts';
import { extractSplitArchive, findFirstSplitFile } from './extractor.ts';
import type { W98krInfo } from '../types/index.ts';

// DOSBox Daum용 W98KR 이미지
const W98KR_DAUM_URL = 'https://nemo838.tistory.com/6556';
// DOSBox-X용 W98KR 이미지
const W98KR_X_URL = 'https://nemo838.tistory.com/6566';
// DOSBox-X용 W95KR 이미지
const W95KR_X_URL = 'https://nemo838.tistory.com/6530';

export async function getInstalledW98kr(): Promise<W98krInfo[]> {
  const w98krDir = getW98krXDir();
  const installed: W98krInfo[] = [];

  try {
    const dirs = await readdir(w98krDir);

    for (const dir of dirs) {
      const dirPath = join(w98krDir, dir);
      const info = await getW98krInfo(dirPath);
      if (info) {
        installed.push(info);
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return installed;
}

export async function getW98krInfo(w98krPath: string): Promise<W98krInfo | null> {
  try {
    const win98ImgPath = join(w98krPath, 'Win98.img');
    if (!existsSync(win98ImgPath)) {
      return null;
    }

    const name = basename(w98krPath);

    // Read DiskParm.txt
    let diskParams = '512,63,64,520'; // Default
    const diskParmPath = join(w98krPath, 'DiskParm.txt');
    if (existsSync(diskParmPath)) {
      const content = await readFile(diskParmPath, 'utf-8');
      diskParams = content.trim();
    }

    // Read Ver.txt
    let version = 'unknown';
    const verPath = join(w98krPath, 'Ver.txt');
    if (existsSync(verPath)) {
      const content = await readFile(verPath, 'utf-8');
      version = content.trim();
    }

    return {
      name,
      imagePath: win98ImgPath,
      diskParams,
      version,
    };
  } catch {
    return null;
  }
}

export async function findW98krByName(name: string): Promise<W98krInfo | null> {
  const installed = await getInstalledW98kr();
  return installed.find(w => w.name === name) || null;
}

export function isW98krInstalled(name: string): boolean {
  const w98krPath = join(getW98krXDir(), name);
  const win98ImgPath = join(w98krPath, 'Win98.img');
  return existsSync(win98ImgPath);
}

export type DosboxType = 'dosbox' | 'dosbox-x';

export async function downloadW98kr(
  onProgress?: (message: string) => void,
  dosboxType: DosboxType = 'dosbox-x'
): Promise<W98krInfo | null> {
  const w98krDir = getW98krXDir();
  const tempDir = getTempDir();

  // Select appropriate W98KR image based on DOSBox type
  const downloadUrl = dosboxType === 'dosbox-x' ? W98KR_X_URL : W98KR_DAUM_URL;
  const imageName = dosboxType === 'dosbox-x' ? 'W98KR-x' : 'W98KR_Daum_Final';

  try {
    // Create directories
    await mkdir(w98krDir, { recursive: true });
    await mkdir(tempDir, { recursive: true });

    onProgress?.(`${imageName} 페이지 분석 중...`);

    // Parse the download page
    const gameInfo = await parseGamePage(downloadUrl);
    const grouped = groupAttachments(gameInfo.attachments);

    if (grouped.game.length === 0) {
      throw new Error('W98KR 다운로드 파일을 찾을 수 없습니다.');
    }

    // Download to temp directory
    const downloadDir = join(tempDir, 'w98kr_download');
    await mkdir(downloadDir, { recursive: true });

    onProgress?.('W98KR 이미지 다운로드 중...');

    await downloadFiles(
      grouped.game,
      downloadDir,
      undefined,
      (filename) => onProgress?.(`다운로드 완료: ${filename}`)
    );

    // Find the first .7z file for extraction
    const files = await readdir(downloadDir);
    const firstArchive = findFirstSplitFile(files) || files.find(f => f.endsWith('.7z'));

    if (!firstArchive) {
      throw new Error('압축 파일을 찾을 수 없습니다.');
    }

    onProgress?.('W98KR 이미지 압축 해제 중...');

    // Extract to w98kr directory
    await extractSplitArchive(join(downloadDir, firstArchive), w98krDir);

    // Delete downloaded 7z files
    await rm(downloadDir, { recursive: true, force: true });

    // Find the extracted W98KR directory
    const extractedDirs = await readdir(w98krDir);
    const w98krFolder = extractedDirs.find(d => d.toLowerCase().includes('w98kr'));

    if (!w98krFolder) {
      throw new Error('W98KR 폴더를 찾을 수 없습니다.');
    }

    onProgress?.('W98KR 설치 완료!');

    return await getW98krInfo(join(w98krDir, w98krFolder));
  } catch (error) {
    throw error;
  }
}

export function parseDiskGeometry(geometry: string): { sectorSize: number; sectorsPerTrack: number; heads: number; cylinders: number } {
  const parts = geometry.split(',').map(p => parseInt(p.trim(), 10));
  return {
    sectorSize: parts[0] || 512,
    sectorsPerTrack: parts[1] || 63,
    heads: parts[2] || 64,
    cylinders: parts[3] || 520,
  };
}

// W95KR (Windows 95) support functions

export async function getInstalledW95kr(): Promise<W98krInfo[]> {
  const w95krDir = getW95krXDir();
  const installed: W98krInfo[] = [];

  try {
    const dirs = await readdir(w95krDir);

    for (const dir of dirs) {
      const dirPath = join(w95krDir, dir);
      const info = await getW95krInfo(dirPath);
      if (info) {
        installed.push(info);
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return installed;
}

export async function getW95krInfo(w95krPath: string): Promise<W98krInfo | null> {
  try {
    const win95ImgPath = join(w95krPath, 'Win95.img');
    if (!existsSync(win95ImgPath)) {
      return null;
    }

    const name = basename(w95krPath);

    // Read DiskParm.txt
    let diskParams = '512,63,16,520'; // Default for Win95
    const diskParmPath = join(w95krPath, 'DiskParm.txt');
    if (existsSync(diskParmPath)) {
      const content = await readFile(diskParmPath, 'utf-8');
      diskParams = content.trim();
    }

    // Read Ver.txt
    let version = 'unknown';
    const verPath = join(w95krPath, 'Ver.txt');
    if (existsSync(verPath)) {
      const content = await readFile(verPath, 'utf-8');
      version = content.trim();
    }

    return {
      name,
      imagePath: win95ImgPath,
      diskParams,
      version,
    };
  } catch {
    return null;
  }
}

export async function findW95krByName(name: string): Promise<W98krInfo | null> {
  const installed = await getInstalledW95kr();
  return installed.find(w => w.name === name) || null;
}

export function isW95krInstalled(name: string): boolean {
  const w95krPath = join(getW95krXDir(), name);
  const win95ImgPath = join(w95krPath, 'Win95.img');
  return existsSync(win95ImgPath);
}

export async function downloadW95kr(
  onProgress?: (message: string) => void
): Promise<W98krInfo | null> {
  const w95krDir = getW95krXDir();
  const tempDir = getTempDir();
  const imageName = 'W95KR-x';

  try {
    // Create directories
    await mkdir(w95krDir, { recursive: true });
    await mkdir(tempDir, { recursive: true });

    onProgress?.(`${imageName} 페이지 분석 중...`);

    // Parse the download page
    const gameInfo = await parseGamePage(W95KR_X_URL);
    const grouped = groupAttachments(gameInfo.attachments);

    if (grouped.game.length === 0) {
      throw new Error('W95KR 다운로드 파일을 찾을 수 없습니다.');
    }

    // Download to temp directory
    const downloadDir = join(tempDir, 'w95kr_download');
    await mkdir(downloadDir, { recursive: true });

    onProgress?.('W95KR 이미지 다운로드 중...');

    await downloadFiles(
      grouped.game,
      downloadDir,
      undefined,
      (filename) => onProgress?.(`다운로드 완료: ${filename}`)
    );

    // Find the first .7z file for extraction
    const files = await readdir(downloadDir);
    const firstArchive = findFirstSplitFile(files) || files.find(f => f.endsWith('.7z'));

    if (!firstArchive) {
      throw new Error('압축 파일을 찾을 수 없습니다.');
    }

    onProgress?.('W95KR 이미지 압축 해제 중...');

    // Extract to w95kr directory
    await extractSplitArchive(join(downloadDir, firstArchive), w95krDir);

    // Delete downloaded 7z files
    await rm(downloadDir, { recursive: true, force: true });

    // Find the extracted W95KR directory
    const extractedDirs = await readdir(w95krDir);
    const w95krFolder = extractedDirs.find(d => d.toLowerCase().includes('w95kr'));

    if (!w95krFolder) {
      throw new Error('W95KR 폴더를 찾을 수 없습니다.');
    }

    onProgress?.('W95KR 설치 완료!');

    return await getW95krInfo(join(w95krDir, w95krFolder));
  } catch (error) {
    throw error;
  }
}
