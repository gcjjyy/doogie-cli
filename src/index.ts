#!/usr/bin/env bun

import * as p from '@clack/prompts';
import pc from 'picocolors';
import { initDatabase, closeDatabase } from './db/index.ts';
import { listGames } from './commands/list.ts';
import { downloadGame } from './commands/download.ts';
import { searchOnlineGames } from './commands/search.ts';
import { ensureAppDirs } from './utils/paths.ts';

const VERSION = '1.0.0';

async function main(): Promise<void> {
  // Initialize
  await ensureAppDirs();
  await initDatabase();

  // Show intro
  console.clear();
  p.intro(pc.bgCyan(pc.black(` 두기의 고전게임 런처 CLI v${VERSION} `)));

  // Main loop
  let running = true;

  while (running) {
    const action = await p.select({
      message: '무엇을 하시겠습니까?',
      options: [
        { value: 'list', label: '게임 목록', hint: '설치된 게임 보기 및 실행' },
        { value: 'search', label: '온라인 게임 검색', hint: '게임 검색 및 다운로드' },
        { value: 'download', label: 'URL로 다운로드', hint: '티스토리 URL 직접 입력' },
        { value: 'exit', label: '종료' },
      ],
    });

    if (p.isCancel(action)) {
      running = false;
      continue;
    }

    switch (action) {
      case 'list':
        await listGames();
        break;

      case 'search': {
        const downloaded = await searchOnlineGames();
        if (downloaded) {
          await listGames();
        }
        break;
      }

      case 'download':
        await downloadGame();
        break;

      case 'exit':
        running = false;
        break;
    }
  }

  // Cleanup
  closeDatabase();
  p.outro(pc.dim('즐거운 게임 되세요!'));
  process.exit(0);
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  closeDatabase();
  console.log('\n');
  p.outro(pc.dim('종료합니다.'));
  process.exit(0);
});

// Run
main().catch((error) => {
  console.error(pc.red('오류 발생:'), error);
  closeDatabase();
  process.exit(1);
});
