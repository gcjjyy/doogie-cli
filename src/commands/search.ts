import * as p from '@clack/prompts';
import pc from 'picocolors';
import { searchGames as searchTistory } from '../services/tistory.ts';
import { downloadGameFromUrl } from './download.ts';

export async function searchOnlineGames(): Promise<boolean> {
  const query = await p.text({
    message: '검색어를 입력하세요',
    placeholder: '게임명...',
    validate: (value) => {
      if (!value || value.length < 2) return '2글자 이상 입력해주세요';
      return undefined;
    },
  });

  if (p.isCancel(query)) return false;

  let currentPage = 1;
  let searchQuery = query;

  while (true) {
    const s = p.spinner();
    s.start(`검색 중... (페이지 ${currentPage})`);

    let searchResponse;
    try {
      searchResponse = await searchTistory(searchQuery, currentPage);
      s.stop(`${pc.green('✓')} ${searchResponse.totalCount}건 검색됨`);
    } catch (error) {
      s.stop('검색 실패');
      p.log.error(`검색 중 오류 발생: ${error}`);
      return false;
    }

    if (searchResponse.results.length === 0) {
      p.log.info('검색 결과가 없습니다.');
      return false;
    }

    // Display results
    p.log.info(`\n${pc.bold(`검색 결과 (페이지 ${currentPage})`)} - 총 ${searchResponse.totalCount}건\n`);

    searchResponse.results.forEach((result, index) => {
      const num = pc.dim(`${index + 1}.`);
      const title = result.title.length > 40 ? result.title.slice(0, 37) + '...' : result.title;
      const genre = result.genreEn ? pc.cyan(`[${result.genreEn}]`) : '';
      const date = result.date ? pc.dim(` ${result.date}`) : '';
      console.log(`  ${num} ${title} ${genre}${date}`);
    });

    console.log('');

    // Build options
    const options: { value: string; label: string; hint?: string }[] = searchResponse.results.map((result, index) => ({
      value: `download:${index}`,
      label: result.title.length > 40 ? result.title.slice(0, 37) + '...' : result.title,
      hint: [result.genreEn, result.date].filter(Boolean).join(' | '),
    }));

    // Add navigation options
    if (searchResponse.hasPrevPage) {
      options.push({ value: 'prev', label: '◀ 이전 페이지' });
    }
    if (searchResponse.hasNextPage) {
      options.push({ value: 'next', label: '다음 페이지 ▶' });
    }
    options.push({ value: 'new', label: '🔍 새로 검색' });
    options.push({ value: 'back', label: '뒤로' });

    const selected = await p.select({
      message: '다운로드할 게임을 선택하세요',
      options,
    });

    if (p.isCancel(selected) || selected === 'back') return false;

    if (selected === 'prev') {
      currentPage--;
      continue;
    }

    if (selected === 'next') {
      currentPage++;
      continue;
    }

    if (selected === 'new') {
      const newQuery = await p.text({
        message: '검색어를 입력하세요',
        placeholder: '게임명...',
        validate: (value) => {
          if (!value || value.length < 2) return '2글자 이상 입력해주세요';
          return undefined;
        },
      });

      if (p.isCancel(newQuery)) return false;

      searchQuery = newQuery;
      currentPage = 1;
      continue;
    }

    // Download selected game
    if (typeof selected === 'string' && selected.startsWith('download:')) {
      const index = parseInt(selected.split(':')[1] || '0', 10);
      const result = searchResponse.results[index];
      if (result) {
        const success = await downloadGameFromUrl(result.url);
        if (success) {
          return true; // Download succeeded, go to game list
        }
      }
    }
  }
}
