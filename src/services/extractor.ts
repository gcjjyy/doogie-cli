import { spawn } from 'bun';
import { existsSync } from 'fs';
import { readdir, mkdir, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { getPlatform } from '../utils/platform.ts';

const PASSWORD = 'http://nemo838.tistory.com/';

function get7zCommand(): string {
  const platform = getPlatform();

  // Try common 7z paths
  const paths: string[] = [];

  switch (platform) {
    case 'darwin':
      paths.push('/opt/homebrew/bin/7z', '/usr/local/bin/7z', '/opt/homebrew/bin/7zz', '/usr/local/bin/7zz');
      break;
    case 'win32':
      paths.push(
        'C:\\Program Files\\7-Zip\\7z.exe',
        'C:\\Program Files (x86)\\7-Zip\\7z.exe'
      );
      break;
    case 'linux':
      paths.push('/usr/bin/7z', '/usr/bin/7za', '/usr/local/bin/7z');
      break;
  }

  for (const p of paths) {
    if (existsSync(p)) {
      return p;
    }
  }

  // Fall back to just '7z' and hope it's in PATH
  return '7z';
}

export function get7zInstallGuide(): string {
  const platform = getPlatform();

  switch (platform) {
    case 'darwin':
      return `7-Zip을 설치해주세요:
  brew install p7zip
  또는 brew install sevenzip`;

    case 'win32':
      return `7-Zip을 설치해주세요:
  https://www.7-zip.org 에서 다운로드`;

    case 'linux':
      return `7-Zip을 설치해주세요:
  Ubuntu/Debian: sudo apt install p7zip-full
  Fedora: sudo dnf install p7zip p7zip-plugins`;
  }
}

async function run7z(args: string[], cwd?: string, timeoutMs: number = 300000): Promise<{ success: boolean; output: string }> {
  const cmd = get7zCommand();

  try {
    const proc = spawn([cmd, ...args], {
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
      stdin: 'ignore', // Don't wait for input
    });

    // Set up timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        proc.kill();
        reject(new Error('7z command timed out'));
      }, timeoutMs);
    });

    // Race between process completion and timeout
    const [stdout, stderr, exitCode] = await Promise.race([
      Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]),
      timeoutPromise,
    ]) as [string, string, number];

    return {
      success: exitCode === 0,
      output: stdout + stderr,
    };
  } catch (error) {
    return {
      success: false,
      output: String(error),
    };
  }
}

export async function check7zAvailable(): Promise<boolean> {
  const result = await run7z(['--help']);
  return result.success || result.output.includes('7-Zip');
}

export async function extract7z(
  archivePath: string,
  destDir: string
): Promise<void> {
  await mkdir(destDir, { recursive: true });

  // Always use password since most archives are password-protected
  const args = ['x', archivePath, `-o${destDir}`, '-y', `-p${PASSWORD}`];

  const result = await run7z(args);

  if (!result.success) {
    throw new Error(`Failed to extract archive: ${result.output}`);
  }
}

export async function extractSplitArchive(
  firstPartPath: string,
  destDir: string
): Promise<void> {
  // 7z automatically handles split archives when you specify the first part
  return extract7z(firstPartPath, destDir);
}

export function findFirstSplitFile(files: string[]): string | null {
  // Find the .7z.001 file which is the first part of a split archive
  const sortedFiles = [...files].sort();

  for (const file of sortedFiles) {
    if (file.match(/\.7z\.001$/i)) {
      return file;
    }
  }

  // If no .001 file, look for standalone .7z file
  for (const file of sortedFiles) {
    if (file.match(/\.7z$/i) && !file.match(/\.7z\.\d+$/i)) {
      return file;
    }
  }

  return null;
}

async function delete7zFiles(gameDir: string, pattern: string): Promise<void> {
  const files = await readdir(gameDir);
  const matchingFiles = files.filter((f) => f.toLowerCase().includes(pattern.toLowerCase()));

  for (const file of matchingFiles) {
    if (file.match(/\.7z$/i) || file.match(/\.7z\.\d+$/i)) {
      await unlink(join(gameDir, file)).catch(() => {});
    }
  }
}

export async function extractConfigAndManual(gameDir: string): Promise<void> {
  const files = await readdir(gameDir);

  // Extract Config files
  const configFiles = files.filter((f) => f.toLowerCase().includes('_config'));
  for (const configFile of configFiles) {
    const configPath = join(gameDir, configFile);
    const configDestDir = join(gameDir, 'Config');
    await extract7z(configPath, configDestDir);
  }
  // Delete Config 7z files after extraction
  await delete7zFiles(gameDir, '_config');

  // Extract Manual files
  const manualFiles = files.filter((f) => f.toLowerCase().includes('_manual'));
  for (const manualFile of manualFiles) {
    const manualPath = join(gameDir, manualFile);
    const manualDestDir = join(gameDir, 'Manual');

    // Check if it's a split archive
    if (manualFile.match(/\.7z\.001$/i)) {
      await extractSplitArchive(manualPath, manualDestDir);
    } else if (manualFile.match(/\.7z$/i) && !manualFile.match(/\.7z\.\d+$/i)) {
      await extract7z(manualPath, manualDestDir);
    }
  }
  // Delete Manual 7z files after extraction
  await delete7zFiles(gameDir, '_manual');
}

export async function extractGameArchive(gameDir: string): Promise<string> {
  const files = await readdir(gameDir);

  // Find game archive files (not Config, not Manual)
  const gameFiles = files.filter(
    (f) =>
      (f.match(/\.7z$/i) || f.match(/\.7z\.\d+$/i)) &&
      !f.toLowerCase().includes('_config') &&
      !f.toLowerCase().includes('_manual')
  );

  if (gameFiles.length === 0) {
    throw new Error('No game archive files found');
  }

  const firstFile = findFirstSplitFile(gameFiles);
  if (!firstFile) {
    throw new Error('Could not find the first archive file');
  }

  const archivePath = join(gameDir, firstFile);
  const gameDestDir = join(gameDir, 'Game');

  await extract7z(archivePath, gameDestDir);

  // Delete game 7z files after extraction
  for (const file of gameFiles) {
    await unlink(join(gameDir, file)).catch(() => {});
  }

  return gameDestDir;
}

export async function listArchiveContents(archivePath: string): Promise<string[]> {
  const args = ['l', archivePath];
  const result = await run7z(args);

  if (!result.success) {
    // Try with password
    const argsWithPassword = ['l', archivePath, `-p${PASSWORD}`];
    const resultWithPassword = await run7z(argsWithPassword);

    if (!resultWithPassword.success) {
      throw new Error(`Failed to list archive contents: ${resultWithPassword.output}`);
    }

    return parseArchiveListing(resultWithPassword.output);
  }

  return parseArchiveListing(result.output);
}

function parseArchiveListing(output: string): string[] {
  const lines = output.split('\n');
  const files: string[] = [];

  // 7z list output has a specific format, parse the file names
  let inFileList = false;
  for (const line of lines) {
    if (line.includes('-------------------')) {
      inFileList = !inFileList;
      continue;
    }

    if (inFileList && line.trim()) {
      // The filename is typically the last column
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5) {
        const filename = parts.slice(5).join(' ');
        if (filename) {
          files.push(filename);
        }
      }
    }
  }

  return files;
}
