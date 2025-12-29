import * as cheerio from 'cheerio';
import pLimit from 'p-limit';
import { mkdir } from 'fs/promises';
import { join, basename } from 'path';
import type { TistoryAttachment, GameInfo } from '../types/index.ts';

const CONCURRENT_DOWNLOADS = 5;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

function classifyFileType(filename: string): 'game' | 'config' | 'manual' {
  const lowerFilename = filename.toLowerCase();
  if (lowerFilename.includes('_config')) return 'config';
  if (lowerFilename.includes('_manual')) return 'manual';
  return 'game';
}

function extractGameCode(filename: string): string | null {
  // Extract game code from filename like:
  // - "SamHero_241212.7z.001" -> "SamHero_241212"
  // - "KoumeiK_Win95_230601.7z.001" -> "KoumeiK_Win95_230601"
  // - "SamHero_241212_Config.7z" -> "SamHero_241212"
  // - "GRZ_Config.7z" -> "GRZ" (no date)
  // - "GRZ.7z.001" -> "GRZ" (no date)

  // Match with date: {GameCode}_{Date}_Config/Manual
  const configWithDateMatch = filename.match(/^(.+_\d{6})_(?:Config|Manual)/i);
  if (configWithDateMatch && configWithDateMatch[1]) {
    return configWithDateMatch[1];
  }

  // Match with date: {GameCode}_{Date}.7z
  const standardWithDateMatch = filename.match(/^(.+_\d{6})\.7z/i);
  if (standardWithDateMatch && standardWithDateMatch[1]) {
    return standardWithDateMatch[1];
  }

  // Match without date: {GameCode}_Config.7z or {GameCode}_Manual.7z
  const configNoDateMatch = filename.match(/^([A-Za-z0-9]+)_(?:Config|Manual)\.7z/i);
  if (configNoDateMatch && configNoDateMatch[1]) {
    return configNoDateMatch[1];
  }

  // Match without date: {GameCode}.7z or {GameCode}.7z.001
  const standardNoDateMatch = filename.match(/^([A-Za-z0-9]+)\.7z/i);
  if (standardNoDateMatch && standardNoDateMatch[1]) {
    return standardNoDateMatch[1];
  }

  return null;
}

function cleanFilename(text: string): string {
  // Clean filename from link text that may include size info
  // Examples: "ED1_221010_Config.7z 53.6 kB" -> "ED1_221010_Config.7z"
  //           "ED1_221010.7z.001 5.4 MB" -> "ED1_221010.7z.001"
  //           "SFLIU200_Config.7z 79.4 kB" -> "SFLIU200_Config.7z"

  // Try to extract .7z filename pattern (with optional split number like .001)
  const match = text.match(/([A-Za-z0-9_-]+\.7z(?:\.\d+)?)/i);
  if (match && match[1]) {
    return match[1];
  }

  // Fallback: split by size pattern (number + space + KB/MB/GB)
  const sizePattern = /\s+\d+(?:\.\d+)?\s*[KMG]B/i;
  const cleaned = text.split(sizePattern)[0];
  if (cleaned) {
    return cleaned.trim();
  }

  // Last fallback: split by newline or tab and take the first part
  const firstPart = text.split(/[\n\r\t]/)[0];
  return firstPart?.trim() || text.trim();
}

export async function parseGamePage(url: string): Promise<GameInfo> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Extract game title
  let title = $('h1.tit_post, .article-header h1, .entry-title').first().text().trim()
    || $('meta[property="og:title"]').attr('content')
    || 'Unknown Game';

  // Extract genre from title like "{롤플레잉 , RPG}"
  let genre: string | null = null;
  const genreMatch = title.match(/\{([^,]+)\s*,\s*([^}]+)\}/);
  if (genreMatch && genreMatch[2]) {
    genre = genreMatch[2].trim().toUpperCase();
    // Remove genre from title
    title = title.replace(/\s*\{[^}]+\}\s*$/, '').trim();
  }

  // Fallback: Extract genre from category or tags
  if (!genre) {
    const categoryText = $('.category, .cat-item, .tag').first().text().trim();
    if (categoryText) {
      const catGenreMatch = categoryText.match(/RPG|SLG|ACT|ADV|STG|PZL|SPT|ETC/i);
      genre = catGenreMatch ? catGenreMatch[0].toUpperCase() : null;
    }
  }

  // Find all attachment links
  const attachments: TistoryAttachment[] = [];
  let gameCode: string | null = null;

  // Tistory attachment links are usually in the article body
  $('a[href*="blog.kakaocdn.net"], a[href*="tistory.com/attachment"]').each((_, element) => {
    const $el = $(element);
    const href = $el.attr('href');
    if (!href) return;

    // Get filename from the link text or the URL
    let rawFilename = $el.text().trim();
    let filename: string;
    if (!rawFilename || rawFilename.length > 100) {
      filename = basename(new URL(href).pathname);
    } else {
      filename = cleanFilename(rawFilename);
    }

    // Try to extract file size
    const sizeText = $el.next().text() || $el.parent().text();
    const sizeMatch = sizeText.match(/(\d+(?:\.\d+)?)\s*(KB|MB|GB)/i);
    let size = 0;
    if (sizeMatch && sizeMatch[1] && sizeMatch[2]) {
      const num = sizeMatch[1];
      const unit = sizeMatch[2];
      const multipliers: Record<string, number> = { KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
      size = parseFloat(num) * (multipliers[unit.toUpperCase()] || 1);
    }

    const fileType = classifyFileType(filename);
    if (!gameCode) {
      gameCode = extractGameCode(filename);
    }

    attachments.push({
      filename,
      downloadUrl: href,
      fileType,
      size,
    });
  });

  // If no attachments found with standard selectors, try alternative approach
  if (attachments.length === 0) {
    $('a').each((_, element) => {
      const $el = $(element);
      const href = $el.attr('href');
      if (!href) return;

      // Check if it's a file download link
      if (href.includes('.7z') || href.includes('attachment')) {
        const rawFilename = $el.text().trim() || basename(href);
        const filename = cleanFilename(rawFilename);
        if (filename.endsWith('.7z') || filename.match(/\.7z\.\d+$/)) {
          const fileType = classifyFileType(filename);
          if (!gameCode) {
            gameCode = extractGameCode(filename);
          }

          attachments.push({
            filename,
            downloadUrl: href,
            fileType,
            size: 0,
          });
        }
      }
    });
  }

  if (attachments.length === 0) {
    throw new Error('No attachments found on the page');
  }

  // If gameCode wasn't extracted during parsing, try again from Config files first
  if (!gameCode) {
    // Prioritize Config files for code extraction (they have cleaner names)
    const configFile = attachments.find(a => a.fileType === 'config');
    if (configFile) {
      gameCode = extractGameCode(configFile.filename);
    }
    // Then try any file
    if (!gameCode) {
      for (const attachment of attachments) {
        gameCode = extractGameCode(attachment.filename);
        if (gameCode) break;
      }
    }
  }

  return {
    name: title,
    code: gameCode || `GAME_${Date.now()}`,
    genre,
    sourceUrl: url,
    attachments,
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadFileWithRetry(
  url: string,
  destPath: string,
  onProgress?: (downloaded: number, total: number) => void
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const chunks: Uint8Array[] = [];
      let downloaded = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        downloaded += value.length;

        if (onProgress && contentLength > 0) {
          onProgress(downloaded, contentLength);
        }
      }

      // Combine chunks and write to file
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      await Bun.write(destPath, combined);
      return;
    } catch (error) {
      lastError = error as Error;
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY * attempt);
      }
    }
  }

  throw lastError || new Error('Download failed');
}

export async function downloadFiles(
  attachments: TistoryAttachment[],
  destDir: string,
  onFileProgress?: (filename: string, downloaded: number, total: number) => void,
  onFileComplete?: (filename: string) => void,
  onFileError?: (filename: string, error: Error) => void
): Promise<void> {
  await mkdir(destDir, { recursive: true });

  const limit = pLimit(CONCURRENT_DOWNLOADS);

  const downloadTasks = attachments.map((attachment) =>
    limit(async () => {
      const destPath = join(destDir, attachment.filename);

      try {
        await downloadFileWithRetry(
          attachment.downloadUrl,
          destPath,
          (downloaded, total) => {
            if (onFileProgress) {
              onFileProgress(attachment.filename, downloaded, total);
            }
          }
        );

        if (onFileComplete) {
          onFileComplete(attachment.filename);
        }
      } catch (error) {
        if (onFileError) {
          onFileError(attachment.filename, error as Error);
        }
        throw error;
      }
    })
  );

  await Promise.all(downloadTasks);
}

export function groupAttachments(attachments: TistoryAttachment[]): {
  game: TistoryAttachment[];
  config: TistoryAttachment[];
  manual: TistoryAttachment[];
} {
  return {
    game: attachments.filter((a) => a.fileType === 'game'),
    config: attachments.filter((a) => a.fileType === 'config'),
    manual: attachments.filter((a) => a.fileType === 'manual'),
  };
}

// DOS Utility download URL
const DOS_UTIL_URL = 'https://nemo838.tistory.com/2221';

export async function parseDosUtilPage(): Promise<TistoryAttachment[]> {
  const response = await fetch(DOS_UTIL_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch DOS utility page: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const attachments: TistoryAttachment[] = [];

  // Find Dos.7z.001, Dos.7z.002 files
  $('a[href*="blog.kakaocdn.net"], a[href*="tistory.com/attachment"]').each((_, element) => {
    const $el = $(element);
    const href = $el.attr('href');
    if (!href) return;

    const rawFilename = $el.text().trim();
    let filename: string;
    if (!rawFilename || rawFilename.length > 100) {
      filename = basename(new URL(href).pathname);
    } else {
      filename = cleanFilename(rawFilename);
    }

    // Only include Dos.7z files
    if (filename.toLowerCase().startsWith('dos.7z')) {
      attachments.push({
        filename,
        downloadUrl: href,
        fileType: 'game',  // Using 'game' type for utility files
        size: 0,
      });
    }
  });

  if (attachments.length === 0) {
    throw new Error('DOS utility files not found on the page');
  }

  return attachments;
}
