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
  // Pattern: {GameCode}_{Date} where Date is 6 digits (YYMMDD), GameCode can have underscores

  // Match everything before _Config or _Manual suffix
  const configMatch = filename.match(/^(.+_\d{6})_(?:Config|Manual)/i);
  if (configMatch && configMatch[1]) {
    return configMatch[1];
  }

  // Match everything before .7z (standard game files)
  const standardMatch = filename.match(/^(.+_\d{6})\.7z/i);
  if (standardMatch && standardMatch[1]) {
    return standardMatch[1];
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

// Search types
export interface SearchResult {
  title: string;
  url: string;
  date: string;
  genreKr?: string;
  genreEn?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const TISTORY_BASE_URL = 'https://nemo838.tistory.com';

export async function searchGames(query: string, page: number = 1): Promise<SearchResponse> {
  const encodedQuery = encodeURIComponent(query);
  const url = `${TISTORY_BASE_URL}/search/${encodedQuery}${page > 1 ? `?page=${page}` : ''}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch search results: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const results: SearchResult[] = [];

  // Parse search results - look for article links
  $('.post-item, .search-item, article, .area_list li, #mArticle .list_content li').each((_, element) => {
    const $el = $(element);
    const $link = $el.find('a').first();
    const href = $link.attr('href');

    if (!href) return;

    // Get title - try multiple selectors
    let title = $el.find('.tit_post, .title, h2, h3').first().text().trim();
    if (!title) {
      title = $link.text().trim();
    }

    // Clean title - remove comment counts like [2]
    title = title.replace(/\s*\[\d+\]\s*$/, '').trim();

    if (!title || title.length < 2) return;

    // Extract genre from title like "{롤플레잉 , RPG}"
    let genreKr: string | undefined;
    let genreEn: string | undefined;
    const genreMatch = title.match(/\{([^,]+)\s*,\s*([^}]+)\}/);
    if (genreMatch) {
      genreKr = genreMatch[1]?.trim();
      genreEn = genreMatch[2]?.trim();
      // Remove genre from title
      title = title.replace(/\s*\{[^}]+\}\s*$/, '').trim();
    }

    // Get date
    const date = $el.find('.date, .txt_date, time, .info_post span').first().text().trim()
      || $el.find('span').last().text().trim().match(/\d{4}\.\d{2}\.\d{2}/)?.[0]
      || '';

    // Build full URL
    const fullUrl = href.startsWith('http') ? href : `${TISTORY_BASE_URL}${href}`;

    results.push({ title, url: fullUrl, date, genreKr, genreEn });
  });

  // Alternative parsing if no results found
  if (results.length === 0) {
    // Only search in main content area, exclude sidebar
    const mainContent = $('#mArticle, .area_view, #content, main, .container_post').first();
    const searchArea = mainContent.length > 0 ? mainContent : $('body');

    searchArea.find('a[href^="/"]').each((_, element) => {
      const $el = $(element);
      const href = $el.attr('href');

      if (!href || !href.match(/^\/\d+$/)) return; // Only match /123 format

      // Skip if inside sidebar or aside elements
      if ($el.closest('#mEtc, .area_aside, aside, .sidebar, .widget').length > 0) return;

      // Get title from <strong> tag to avoid "Loading.." placeholder
      let title = $el.find('strong').text().trim();
      if (!title) {
        title = $el.text().trim();
      }

      // Remove "Loading.." prefix if present
      title = title.replace(/^Loading\.\.\s*/i, '').trim();
      // Remove comment count suffix like [2]
      title = title.replace(/\s*\[\d+\]\s*$/, '').trim();

      if (!title || title.length < 2) return;

      // Skip W98KR items (these are from sidebar/widget areas)
      if (title.startsWith('W98KR')) return;

      // Extract genre from title
      let genreKr: string | undefined;
      let genreEn: string | undefined;
      const genreMatch = title.match(/\{([^,]+)\s*,\s*([^}]+)\}/);
      if (genreMatch) {
        genreKr = genreMatch[1]?.trim();
        genreEn = genreMatch[2]?.trim();
        title = title.replace(/\s*\{[^}]+\}\s*$/, '').trim();
      }

      const fullUrl = `${TISTORY_BASE_URL}${href}`;

      // Avoid duplicates
      if (!results.find(r => r.url === fullUrl)) {
        results.push({ title, url: fullUrl, date: '', genreKr, genreEn });
      }
    });
  }

  // Parse total count
  let totalCount = results.length;
  const countMatch = $('body').text().match(/(\d+)\s*건/);
  if (countMatch && countMatch[1]) {
    totalCount = parseInt(countMatch[1], 10);
  }

  // Parse pagination
  const hasNextPage = $('a:contains("NEXT"), a:contains("다음"), .next').length > 0
    || $(`a[href*="page=${page + 1}"]`).length > 0;
  const hasPrevPage = page > 1;

  return {
    results,
    totalCount,
    currentPage: page,
    hasNextPage,
    hasPrevPage,
  };
}
