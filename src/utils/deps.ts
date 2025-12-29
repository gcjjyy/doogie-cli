import * as p from '@clack/prompts';
import pc from 'picocolors';
import { $ } from 'bun';
import { platform } from 'os';

function isMac(): boolean {
  return platform() === 'darwin';
}

async function isBrewInstalled(): Promise<boolean> {
  try {
    await $`which brew`.quiet();
    return true;
  } catch {
    return false;
  }
}

async function installBrew(): Promise<boolean> {
  const install = await p.confirm({
    message: 'Homebrew가 설치되어 있지 않습니다. 설치하시겠습니까?',
  });

  if (p.isCancel(install) || !install) {
    p.log.info('Homebrew 없이는 필요한 프로그램을 자동 설치할 수 없습니다.');
    p.log.info('수동 설치: https://brew.sh');
    return false;
  }

  p.log.info('Homebrew 설치를 시작합니다. 관리자 비밀번호가 필요할 수 있습니다.');

  try {
    const proc = Bun.spawn(['bash', '-c', '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'], {
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
    });
    const exitCode = await proc.exited;

    if (exitCode === 0) {
      p.log.success('Homebrew 설치 완료!');
      return true;
    } else {
      p.log.error('Homebrew 설치 실패');
      return false;
    }
  } catch (error) {
    p.log.error(`Homebrew 설치 중 오류: ${error}`);
    return false;
  }
}

async function ensureBrew(): Promise<boolean> {
  if (await isBrewInstalled()) {
    return true;
  }
  return await installBrew();
}

async function isPackageInstalled(packageName: string): Promise<boolean> {
  try {
    await $`brew list ${packageName}`.quiet();
    return true;
  } catch {
    return false;
  }
}

async function installPackage(packageName: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(['brew', 'install', packageName], {
      stdout: 'inherit',
      stderr: 'inherit',
    });
    const exitCode = await proc.exited;
    return exitCode === 0;
  } catch {
    return false;
  }
}

export async function checkAndInstall7zip(): Promise<boolean> {
  // Check if 7z is available
  try {
    await $`which 7z`.quiet();
    return true;
  } catch {
    // Not in PATH
  }

  try {
    await $`which 7za`.quiet();
    return true;
  } catch {
    // Not in PATH
  }

  // Not installed, offer to install on Mac
  if (!isMac()) {
    p.log.error('7-Zip이 설치되어 있지 않습니다. 수동으로 설치해주세요.');
    return false;
  }

  if (!(await ensureBrew())) {
    p.log.info('`brew install p7zip` 명령으로 7-Zip을 설치해주세요.');
    return false;
  }

  // Check if already installed via brew
  if (await isPackageInstalled('p7zip')) {
    return true;
  }

  // Install silently
  const s = p.spinner();
  s.start('p7zip 설치 중...');

  const success = await installPackage('p7zip');
  if (success) {
    s.stop(`${pc.green('✓')} p7zip 설치 완료!`);
    return true;
  } else {
    s.stop(`${pc.red('✗')} p7zip 설치 실패`);
    return false;
  }
}

import { existsSync } from 'fs';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { getUtilDir, getDosUtilDir, getTempDir } from './paths.ts';
import { parseDosUtilPage, downloadFiles } from '../services/tistory.ts';

const ARCHIVE_PASSWORD = 'http://nemo838.tistory.com/';

export function isDosUtilInstalled(): boolean {
  const utilDir = getDosUtilDir();
  // Check if T_HANGUL/TB.EXE exists (main utility file)
  return existsSync(join(utilDir, 'T_HANGUL', 'TB.EXE'));
}

export async function downloadDosUtil(onProgress?: (message: string) => void): Promise<void> {
  const tempDir = getTempDir();
  const utilDir = getUtilDir();

  await mkdir(tempDir, { recursive: true });
  await mkdir(utilDir, { recursive: true });

  // Parse and download utility files
  onProgress?.('유틸리티 다운로드 정보 확인 중...');
  const attachments = await parseDosUtilPage();

  onProgress?.(`${attachments.length}개 파일 다운로드 중...`);
  await downloadFiles(attachments, tempDir);

  // Extract the archive
  onProgress?.('압축 해제 중...');
  const firstFile = attachments.find(a => a.filename.toLowerCase() === 'dos.7z.001');
  if (!firstFile) {
    throw new Error('Dos.7z.001 파일을 찾을 수 없습니다.');
  }

  const archivePath = join(tempDir, firstFile.filename);
  const proc = Bun.spawn(['7z', 'x', `-p${ARCHIVE_PASSWORD}`, '-y', `-o${utilDir}`, archivePath], {
    stdout: 'ignore',
    stderr: 'pipe',
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`압축 해제 실패: ${stderr}`);
  }

  // Clean up temp files
  for (const attachment of attachments) {
    try {
      await rm(join(tempDir, attachment.filename));
    } catch {
      // Ignore cleanup errors
    }
  }

  onProgress?.('DOS 유틸리티 설치 완료!');
}

export async function checkAndInstallDosUtil(): Promise<boolean> {
  if (isDosUtilInstalled()) {
    return true;
  }

  const install = await p.confirm({
    message: 'DOS 유틸리티(태백한글 등)가 설치되어 있지 않습니다. 다운로드하시겠습니까? (약 27MB)',
  });

  if (p.isCancel(install) || !install) {
    p.log.warn('유틸리티 없이는 일부 게임이 정상 실행되지 않을 수 있습니다.');
    return false;
  }

  const s = p.spinner();
  s.start('DOS 유틸리티 다운로드 중...');

  try {
    await downloadDosUtil((message) => {
      s.message(message);
    });
    s.stop(`${pc.green('✓')} DOS 유틸리티 설치 완료!`);
    return true;
  } catch (error) {
    s.stop(`${pc.red('✗')} DOS 유틸리티 설치 실패`);
    p.log.error(`설치 중 오류 발생: ${error}`);
    return false;
  }
}
