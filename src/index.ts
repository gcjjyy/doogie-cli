#!/usr/bin/env bun

import * as p from '@clack/prompts';
import pc from 'picocolors';
import { initDatabase, closeDatabase } from './db/index.ts';
import { listGames } from './commands/list.ts';
import { downloadGame } from './commands/download.ts';
import { ensureAppDirs } from './utils/paths.ts';
import { getPlatform } from './utils/platform.ts';
import packageJson from '../package.json';

const VERSION = packageJson.version;
const DOOGIE_HOMEPAGE = 'https://nemo838.tistory.com';

async function openInBrowser(url: string): Promise<void> {
  const platform = getPlatform();
  const command = platform === 'darwin' ? 'open' : 'xdg-open';
  Bun.spawn([command, url]);
}

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
        { value: 'download', label: '게임 추가', hint: '티스토리 URL로 게임 다운로드' },
        { value: 'homepage', label: '두기의 고전게임 시즌2 홈페이지', hint: '브라우저에서 열기' },
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

      case 'download':
        await downloadGame();
        break;

      case 'homepage':
        p.log.info(`${pc.cyan(DOOGIE_HOMEPAGE)} 열기...`);
        await openInBrowser(DOOGIE_HOMEPAGE);
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
