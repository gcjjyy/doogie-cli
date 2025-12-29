import { existsSync } from 'fs';
import { mkdir, readdir, readFile, rm } from 'fs/promises';
import { join, basename } from 'path';
import { getW98krDir, getW95krDir, getTempDir, getWin9xDir, type Win9xLanguage } from '../utils/paths.ts';
import { parseGamePage, downloadFiles, groupAttachments } from './tistory.ts';
import { extractSplitArchive, findFirstSplitFile } from './extractor.ts';
import type { W98krInfo } from '../types/index.ts';
import { WIN9X_IMAGES, type Win9xImageInfo } from './executer-mapping.ts';

/**
 * 이미지 이름에서 언어 코드 추출
 * W95KR_Daum -> 'kr', W98JP_Daum -> 'jp', W95EN_Daum -> 'en'
 */
export function getLanguageFromImageName(imageName: string): Win9xLanguage {
  const upperName = imageName.toUpperCase();
  if (upperName.includes('JP')) return 'jp';
  if (upperName.includes('EN')) return 'en';
  return 'kr'; // default
}

/**
 * 이미지 이름에서 Windows 버전 추출
 * W95KR_Daum -> '95', W98JP_Daum -> '98'
 */
export function getWindowsVersionFromImageName(imageName: string): '95' | '98' {
  const upperName = imageName.toUpperCase();
  if (upperName.includes('W95') || upperName.includes('95')) return '95';
  return '98'; // default
}

/**
 * Win9x 이미지 디렉토리 경로 조회 (이미지 이름 기반)
 */
export function getWin9xImageDir(imageName: string): string {
  const windowsVersion = getWindowsVersionFromImageName(imageName);
  const language = getLanguageFromImageName(imageName);
  return getWin9xDir(windowsVersion, language);
}

/**
 * 설치된 W98KR 이미지 목록 조회
 */
export async function getInstalledW98kr(): Promise<W98krInfo[]> {
  const w98krDir = getW98krDir();
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

/**
 * W98KR 이미지 정보 조회
 */
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

/**
 * 이름으로 W98KR 이미지 찾기
 */
export async function findW98krByName(name: string): Promise<W98krInfo | null> {
  const installed = await getInstalledW98kr();
  return installed.find(w => w.name === name) || null;
}

/**
 * W98KR 이미지 설치 여부 확인
 */
export function isW98krInstalled(name: string): boolean {
  const w98krPath = join(getW98krDir(), name);
  const win98ImgPath = join(w98krPath, 'Win98.img');
  return existsSync(win98ImgPath);
}

/**
 * W98KR 이미지 다운로드 및 설치
 * @param imageName 이미지 이름 (예: 'W98KR_Daum', 'W98KR_Daum_Final')
 * @param onProgress 진행 상황 콜백
 */
export async function downloadW98kr(
  imageName: string,
  onProgress?: (message: string) => void
): Promise<W98krInfo | null> {
  const imageInfo = WIN9X_IMAGES[imageName];
  if (!imageInfo || imageInfo.windowsVersion !== '98') {
    throw new Error(`알 수 없는 W98KR 이미지: ${imageName}`);
  }

  const w98krDir = getW98krDir();
  const tempDir = getTempDir();

  try {
    // Create directories
    await mkdir(w98krDir, { recursive: true });
    await mkdir(tempDir, { recursive: true });

    onProgress?.(`${imageName} 페이지 분석 중...`);

    // Parse the download page
    const gameInfo = await parseGamePage(imageInfo.downloadUrl);
    const grouped = groupAttachments(gameInfo.attachments);

    if (grouped.game.length === 0) {
      throw new Error(`${imageName} 다운로드 파일을 찾을 수 없습니다.`);
    }

    // Download to temp directory
    const downloadDir = join(tempDir, `${imageName}_download`);
    await mkdir(downloadDir, { recursive: true });

    onProgress?.(`${imageName} 이미지 다운로드 중...`);

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

    onProgress?.(`${imageName} 이미지 압축 해제 중...`);

    // Extract to w98kr directory
    await extractSplitArchive(join(downloadDir, firstArchive), w98krDir);

    // Delete downloaded 7z files
    await rm(downloadDir, { recursive: true, force: true });

    // Find the extracted folder
    const extractedDirs = await readdir(w98krDir);
    const extractedFolder = extractedDirs.find(d =>
      d.toLowerCase().includes(imageName.toLowerCase().replace(/_/g, '')) ||
      d.toLowerCase().includes('w98kr')
    );

    if (!extractedFolder) {
      throw new Error(`${imageName} 폴더를 찾을 수 없습니다.`);
    }

    onProgress?.(`${imageName} 설치 완료!`);

    return await getW98krInfo(join(w98krDir, extractedFolder));
  } catch (error) {
    throw error;
  }
}

/**
 * 디스크 지오메트리 파싱
 */
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

/**
 * 설치된 W95KR 이미지 목록 조회
 */
export async function getInstalledW95kr(): Promise<W98krInfo[]> {
  const w95krDir = getW95krDir();
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

/**
 * W95KR 이미지 정보 조회
 */
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

/**
 * 이름으로 W95KR 이미지 찾기
 */
export async function findW95krByName(name: string): Promise<W98krInfo | null> {
  const installed = await getInstalledW95kr();
  return installed.find(w => w.name === name) || null;
}

/**
 * W95KR 이미지 설치 여부 확인
 */
export function isW95krInstalled(name: string): boolean {
  const w95krPath = join(getW95krDir(), name);
  const win95ImgPath = join(w95krPath, 'Win95.img');
  return existsSync(win95ImgPath);
}

/**
 * W95KR 이미지 다운로드 및 설치
 * @param imageName 이미지 이름 (예: 'W95KR_Daum', 'W95KR_Daum_Final')
 * @param onProgress 진행 상황 콜백
 */
export async function downloadW95kr(
  imageName: string,
  onProgress?: (message: string) => void
): Promise<W98krInfo | null> {
  const imageInfo = WIN9X_IMAGES[imageName];
  if (!imageInfo || imageInfo.windowsVersion !== '95') {
    throw new Error(`알 수 없는 W95KR 이미지: ${imageName}`);
  }

  const w95krDir = getW95krDir();
  const tempDir = getTempDir();

  try {
    // Create directories
    await mkdir(w95krDir, { recursive: true });
    await mkdir(tempDir, { recursive: true });

    onProgress?.(`${imageName} 페이지 분석 중...`);

    // Parse the download page
    const gameInfo = await parseGamePage(imageInfo.downloadUrl);
    const grouped = groupAttachments(gameInfo.attachments);

    if (grouped.game.length === 0) {
      throw new Error(`${imageName} 다운로드 파일을 찾을 수 없습니다.`);
    }

    // Download to temp directory
    const downloadDir = join(tempDir, `${imageName}_download`);
    await mkdir(downloadDir, { recursive: true });

    onProgress?.(`${imageName} 이미지 다운로드 중...`);

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

    onProgress?.(`${imageName} 이미지 압축 해제 중...`);

    // Extract to w95kr directory
    await extractSplitArchive(join(downloadDir, firstArchive), w95krDir);

    // Delete downloaded 7z files
    await rm(downloadDir, { recursive: true, force: true });

    // Find the extracted folder
    const extractedDirs = await readdir(w95krDir);
    const extractedFolder = extractedDirs.find(d =>
      d.toLowerCase().includes(imageName.toLowerCase().replace(/_/g, '')) ||
      d.toLowerCase().includes('w95kr')
    );

    if (!extractedFolder) {
      throw new Error(`${imageName} 폴더를 찾을 수 없습니다.`);
    }

    onProgress?.(`${imageName} 설치 완료!`);

    return await getW95krInfo(join(w95krDir, extractedFolder));
  } catch (error) {
    throw error;
  }
}

/**
 * Win9x 이미지 정보 조회 (통합 함수)
 * Win95.img 또는 Win98.img가 있는지 확인
 */
export async function getWin9xImageInfo(imagePath: string): Promise<W98krInfo | null> {
  try {
    const name = basename(imagePath);

    // Win95.img 또는 Win98.img 찾기
    let imgPath = join(imagePath, 'Win95.img');
    if (!existsSync(imgPath)) {
      imgPath = join(imagePath, 'Win98.img');
    }
    if (!existsSync(imgPath)) {
      return null;
    }

    // Read DiskParm.txt
    let diskParams = '512,63,64,520'; // Default
    const diskParmPath = join(imagePath, 'DiskParm.txt');
    if (existsSync(diskParmPath)) {
      const content = await readFile(diskParmPath, 'utf-8');
      diskParams = content.trim();
    }

    // Read Ver.txt
    let version = 'unknown';
    const verPath = join(imagePath, 'Ver.txt');
    if (existsSync(verPath)) {
      const content = await readFile(verPath, 'utf-8');
      version = content.trim();
    }

    return {
      name,
      imagePath: imgPath,
      diskParams,
      version,
    };
  } catch {
    return null;
  }
}

/**
 * 이미지 이름으로 Win9x 이미지 찾기 (통합 함수)
 * @param imageName 이미지 이름 (예: 'W95KR_Daum_Final', 'W98JP_Daum')
 */
export async function findWin9xImageByName(imageName: string): Promise<W98krInfo | null> {
  const imageDir = getWin9xImageDir(imageName);

  try {
    const dirs = await readdir(imageDir);

    // 1. 정확히 일치하는 이름 찾기 (대소문자 무시)
    for (const dir of dirs) {
      const dirPath = join(imageDir, dir);
      if (dir === imageName || dir.toLowerCase() === imageName.toLowerCase()) {
        const info = await getWin9xImageInfo(dirPath);
        if (info) return info;
      }
    }

    // 2. 언더스코어/하이픈 제거 후 정확히 일치하는 이름 찾기
    const normalizedSearchName = imageName.toLowerCase().replace(/[-_]/g, '');
    for (const dir of dirs) {
      const dirPath = join(imageDir, dir);
      const normalizedDirName = dir.toLowerCase().replace(/[-_]/g, '');
      if (normalizedDirName === normalizedSearchName) {
        const info = await getWin9xImageInfo(dirPath);
        if (info) return info;
      }
    }

    // 3. 부분 일치 찾기 - 가장 긴 매칭을 우선 (더 구체적인 이름 우선)
    // 예: W95KR_Daum_Final 검색 시 W95KR_Daum보다 W95KR_Daum_Final을 우선
    const candidates: { dir: string; matchLength: number }[] = [];
    for (const dir of dirs) {
      const normalizedDirName = dir.toLowerCase().replace(/[-_]/g, '');
      // 디렉토리 이름이 검색어에 포함되거나 검색어가 디렉토리 이름에 포함될 때
      if (normalizedDirName.includes(normalizedSearchName) || normalizedSearchName.includes(normalizedDirName)) {
        candidates.push({ dir, matchLength: normalizedDirName.length });
      }
    }

    // 가장 긴 이름(가장 구체적인)을 우선 선택
    candidates.sort((a, b) => b.matchLength - a.matchLength);

    for (const candidate of candidates) {
      const dirPath = join(imageDir, candidate.dir);
      const info = await getWin9xImageInfo(dirPath);
      if (info) return info;
    }
  } catch {
    // Directory doesn't exist
  }

  return null;
}

/**
 * Win9x 이미지 설치 여부 확인 (통합 함수)
 */
export function isWin9xImageInstalledByName(imageName: string): boolean {
  const imageDir = getWin9xImageDir(imageName);
  const windowsVersion = getWindowsVersionFromImageName(imageName);
  const imgFileName = windowsVersion === '95' ? 'Win95.img' : 'Win98.img';

  // 이미지 디렉토리 내에서 이미지 폴더 찾기
  try {
    const dirs = Bun.spawnSync(['ls', imageDir]).stdout.toString().trim().split('\n');
    for (const dir of dirs) {
      if (!dir) continue;
      const imgPath = join(imageDir, dir, imgFileName);
      if (existsSync(imgPath)) {
        return true;
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return false;
}

/**
 * Win9x 이미지 다운로드 (통합 함수)
 * @param imageName 이미지 이름 (예: 'W95KR_Daum', 'W98JP_Daum_Final')
 * @param onProgress 진행 상황 콜백
 */
export async function downloadWin9xImageByName(
  imageName: string,
  onProgress?: (message: string) => void
): Promise<W98krInfo | null> {
  const imageInfo = WIN9X_IMAGES[imageName];
  if (!imageInfo) {
    throw new Error(`알 수 없는 Win9x 이미지: ${imageName}`);
  }

  const imageDir = getWin9xImageDir(imageName);
  const tempDir = getTempDir();
  const windowsVersion = imageInfo.windowsVersion;
  const imgFileName = windowsVersion === '95' ? 'Win95.img' : 'Win98.img';

  try {
    // Create directories
    await mkdir(imageDir, { recursive: true });
    await mkdir(tempDir, { recursive: true });

    onProgress?.(`${imageName} 페이지 분석 중...`);

    // Parse the download page
    const gameInfo = await parseGamePage(imageInfo.downloadUrl);
    const grouped = groupAttachments(gameInfo.attachments);

    if (grouped.game.length === 0) {
      throw new Error(`${imageName} 다운로드 파일을 찾을 수 없습니다.`);
    }

    // Download to temp directory
    const downloadDir = join(tempDir, `${imageName}_download`);
    await mkdir(downloadDir, { recursive: true });

    onProgress?.(`${imageName} 이미지 다운로드 중...`);

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

    onProgress?.(`${imageName} 이미지 압축 해제 중...`);

    // Extract to image directory
    await extractSplitArchive(join(downloadDir, firstArchive), imageDir);

    // Delete downloaded 7z files
    await rm(downloadDir, { recursive: true, force: true });

    // Find the extracted folder
    const extractedDirs = await readdir(imageDir);
    const searchName = imageName.toLowerCase().replace(/_/g, '');
    const extractedFolder = extractedDirs.find(d => {
      const dirLower = d.toLowerCase().replace(/_/g, '');
      return dirLower.includes(searchName) || searchName.includes(dirLower);
    });

    if (!extractedFolder) {
      throw new Error(`${imageName} 폴더를 찾을 수 없습니다.`);
    }

    // Verify the image exists
    const imgPath = join(imageDir, extractedFolder, imgFileName);
    if (!existsSync(imgPath)) {
      throw new Error(`${imgFileName} 파일을 찾을 수 없습니다.`);
    }

    onProgress?.(`${imageName} 설치 완료!`);

    return await getWin9xImageInfo(join(imageDir, extractedFolder));
  } catch (error) {
    throw error;
  }
}

// Legacy compatibility functions

/**
 * Win9x 이미지 다운로드 (통합 함수) - Legacy
 * @param imageInfo 이미지 정보
 * @param onProgress 진행 상황 콜백
 */
export async function downloadWin9xImage(
  imageInfo: Win9xImageInfo,
  onProgress?: (message: string) => void
): Promise<W98krInfo | null> {
  return downloadWin9xImageByName(imageInfo.name, onProgress);
}

/**
 * Win9x 이미지 찾기 (통합 함수) - Legacy
 * @param imageName 이미지 이름
 * @param windowsVersion Windows 버전 ('95' | '98')
 */
export async function findWin9xImage(
  imageName: string,
  windowsVersion: '95' | '98'
): Promise<W98krInfo | null> {
  return findWin9xImageByName(imageName);
}

/**
 * Win9x 이미지 설치 여부 확인 (통합 함수) - Legacy
 */
export function isWin9xImageInstalled(
  imageName: string,
  windowsVersion: '95' | '98'
): boolean {
  return isWin9xImageInstalledByName(imageName);
}
