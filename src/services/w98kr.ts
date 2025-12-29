import { existsSync } from 'fs';
import { mkdir, readdir, readFile, rm } from 'fs/promises';
import { join, basename } from 'path';
import { getTempDir, getExecutersDir } from '../utils/paths.ts';
import { parseGamePage, downloadFiles, groupAttachments } from './tistory.ts';
import { extractSplitArchive, findFirstSplitFile } from './extractor.ts';
import type { W98krInfo } from '../types/index.ts';
import { WIN9X_IMAGES } from './executer-mapping.ts';

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
 * Win9x 이미지 디렉토리 경로 조회
 * 모든 이미지는 ~/.doogie-cli/executers/ 폴더에 저장
 */
export function getWin9xImageDir(_imageName: string): string {
  return getExecutersDir();
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

/**
 * Win9x 이미지 정보 조회
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
 * 이미지 이름으로 Win9x 이미지 찾기
 * @param imageName 이미지 이름 (예: 'W95KR-x', 'W98EN-x')
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
    const candidates: { dir: string; matchLength: number }[] = [];
    for (const dir of dirs) {
      const normalizedDirName = dir.toLowerCase().replace(/[-_]/g, '');
      if (normalizedDirName.includes(normalizedSearchName) || normalizedSearchName.includes(normalizedDirName)) {
        candidates.push({ dir, matchLength: normalizedDirName.length });
      }
    }

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
 * Win9x 이미지 다운로드
 * @param imageName 이미지 이름 (예: 'W95KR-x', 'W98EN-x')
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
