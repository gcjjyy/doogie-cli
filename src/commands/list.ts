import * as p from '@clack/prompts';
import pc from 'picocolors';
import Table from 'cli-table3';
import { rm } from 'fs/promises';
import { getAllGames, searchGames, getGameByCode, deleteGame, deleteDownloadFilesByGameId } from '../services/database.ts';
import { extractGameArchive, extractConfigAndManual } from '../services/extractor.ts';
import { launchGame, launchGameWithConfig, findGameExecutable, launchW98krGame, launchW95krGame, isW98krInstalled, isW95krInstalled } from '../services/launcher.ts';
import { parseGameConfig, getFirstDosboxOption, requiresW98kr } from '../services/config-parser.ts';
import { downloadW98kr, downloadW95kr } from '../services/w98kr.ts';
import { updateGame } from '../services/database.ts';
import { getGameDir } from '../utils/paths.ts';
import { checkAndInstall7zip, isDosUtilInstalled, downloadDosUtil } from '../utils/deps.ts';
import type { Game } from '../db/schema.ts';
import type { ExecutionOption } from '../services/config-parser.ts';

function formatStatus(game: Game): string {
  if (game.isExtracted) {
    return pc.green('✓ 설치됨');
  }
  return pc.yellow('○ 압축됨');
}

async function displayGamesTable(games: Game[]): Promise<void> {
  if (games.length === 0) {
    p.log.info('등록된 게임이 없습니다.');
    return;
  }

  const table = new Table({
    head: [
      pc.bold('#'),
      pc.bold('게임명'),
      pc.bold('장르'),
      pc.bold('상태'),
      pc.bold('실행기'),
    ],
    style: { head: [], border: [] },
  });

  for (let index = 0; index < games.length; index++) {
    const game = games[index]!;

    // Parse config to get accurate launcher types (Config is extracted before Game)
    const gameDir = getGameDir(game.code);
    const config = await parseGameConfig(gameDir);

    let launcherDisplay: string;
    let genre: string;

    if (config) {
      launcherDisplay = config.executerName || '0.74_Daum';
      genre = config.info.genreKr || config.info.genre || '-';
    } else {
      // DB에 저장된 launcherType 그대로 표시
      launcherDisplay = game.launcherType || '0.74_Daum';
      genre = game.genre || '-';
    }

    table.push([
      String(index + 1),
      game.name,
      genre,
      formatStatus(game),
      launcherDisplay,
    ]);
  }

  console.log(table.toString());
}

export async function listGames(): Promise<void> {
  while (true) {
    const games = await getAllGames();

    if (games.length === 0) {
      p.log.info('등록된 게임이 없습니다. 먼저 게임을 다운로드하세요.');
      return;
    }

    await displayGamesTable(games);

    const action = await p.select({
      message: '무엇을 하시겠습니까?',
      options: [
        { value: 'run', label: '게임 실행' },
        { value: 'search', label: '설치된 게임 검색' },
        { value: 'delete', label: '게임 삭제', hint: '게임 파일 및 데이터 삭제' },
        { value: 'back', label: '뒤로' },
      ],
    });

    if (p.isCancel(action) || action === 'back') return;

    switch (action) {
      case 'search':
        await searchAndSelectGame();
        break;
      case 'run':
        await selectAndRunGame(games);
        break;
      case 'delete':
        await selectAndDeleteGame(games);
        break;
    }
  }
}

async function searchAndSelectGame(): Promise<void> {
  const query = await p.text({
    message: '검색어를 입력하세요',
    placeholder: '게임명...',
  });

  if (p.isCancel(query) || !query) return;

  const games = await searchGames(query);

  if (games.length === 0) {
    p.log.info('검색 결과가 없습니다.');
    return;
  }

  await displayGamesTable(games);
  await selectAndRunGame(games);
}

async function selectAndRunGame(games: Game[]): Promise<void> {
  const options = games.map((game, index) => ({
    value: game.code,
    label: game.name,
    hint: `${game.genre || ''} | ${game.isExtracted ? '설치됨' : '압축됨'}`,
  }));

  options.push({ value: 'back', label: '뒤로', hint: '' });

  const selected = await p.select({
    message: '실행할 게임을 선택하세요',
    options,
  });

  if (p.isCancel(selected) || selected === 'back') return;

  const game = await getGameByCode(selected);
  if (!game) {
    p.log.error('게임을 찾을 수 없습니다.');
    return;
  }

  await runGame(game);
}

async function selectAndDeleteGame(games: Game[]): Promise<void> {
  const options = games.map((game) => ({
    value: game.code,
    label: game.name,
    hint: `${game.genre || ''} | ${game.isExtracted ? '설치됨' : '압축됨'}`,
  }));

  options.push({ value: 'back', label: '뒤로', hint: '' });

  const selected = await p.select({
    message: '삭제할 게임을 선택하세요',
    options,
  });

  if (p.isCancel(selected) || selected === 'back') return;

  const game = await getGameByCode(selected);
  if (!game) {
    p.log.error('게임을 찾을 수 없습니다.');
    return;
  }

  // Confirm deletion
  const confirm = await p.confirm({
    message: `정말 "${game.name}"을(를) 삭제하시겠습니까? 모든 파일이 삭제됩니다.`,
  });

  if (p.isCancel(confirm) || !confirm) return;

  const s = p.spinner();
  s.start('게임 삭제 중...');

  try {
    // Delete game files
    const gameDir = getGameDir(game.code);
    await rm(gameDir, { recursive: true, force: true });

    // Delete from database
    await deleteDownloadFilesByGameId(game.id);
    await deleteGame(game.id);

    s.stop(`${pc.green('✓')} "${game.name}" 삭제 완료!`);
  } catch (error) {
    s.stop('삭제 실패');
    p.log.error(`삭제 중 오류 발생: ${error}`);
  }
}

async function runGame(game: Game): Promise<void> {
  const gameDir = getGameDir(game.code);

  // If not extracted, extract first
  if (!game.isExtracted) {
    // Check if 7z is available for extraction
    const has7z = await checkAndInstall7zip();
    if (!has7z) {
      return;
    }

    const shouldExtract = await p.confirm({
      message: '게임이 아직 압축 해제되지 않았습니다. 압축을 해제하시겠습니까?',
    });

    if (p.isCancel(shouldExtract) || !shouldExtract) return;

    const s = p.spinner();
    s.start('압축 해제 중...');

    try {
      // Extract config and manual first
      await extractConfigAndManual(gameDir);

      // Extract game
      await extractGameArchive(gameDir);

      // Update database
      await updateGame(game.id, { isExtracted: true, localPath: gameDir });

      s.stop('압축 해제 완료!');
    } catch (error) {
      s.stop('압축 해제 실패');
      p.log.error(`압축 해제 중 오류 발생: ${error}`);
      return;
    }
  }

  // Parse game config from Config folder
  const gamePath = game.localPath || gameDir;
  const gameExecDir = `${gamePath}/Game`;
  const gameConfig = await parseGameConfig(gamePath);

  if (gameConfig) {
    // Update launcherType and genre if they don't match (fix for previously downloaded games)
    const correctLauncherType = gameConfig.executerName || '0.74_Daum';
    const correctGenre = gameConfig.info.genreKr || gameConfig.info.genre;
    if (game.launcherType !== correctLauncherType || game.genre !== correctGenre) {
      await updateGame(game.id, {
        launcherType: correctLauncherType,
        genre: correctGenre,
      });
    }
  }

  if (!gameConfig) {
    // Fallback: no config found, use legacy method
    const s = p.spinner();
    s.start('게임 실행 준비 중...');

    try {
      s.stop('게임을 실행합니다...');
      await launchGame(gameExecDir);
    } catch (error) {
      s.stop('게임 실행 실패');
      p.log.error(`게임 실행 중 오류 발생: ${error}`);
    }
    return;
  }

  // Show game info before option selection
  const gameInfoLines = [
    '',
    pc.bold(gameConfig.info.name) + (gameConfig.info.nameEn ? ` (${gameConfig.info.nameEn})` : ''),
    `${pc.dim('장르:')} ${gameConfig.info.genreKr || gameConfig.info.genre}`,
  ];

  if (gameConfig.info.updateLog) {
    gameInfoLines.push('');
    gameInfoLines.push(pc.dim('─'.repeat(40)));
    gameInfoLines.push(gameConfig.info.updateLog);
    gameInfoLines.push(pc.dim('─'.repeat(40)));
  }

  console.log(gameInfoLines.join('\n'));

  // Helper to show menu and get selection
  async function selectFromMenu(
    menuOptions: ExecutionOption[],
    message: string
  ): Promise<ExecutionOption | null> {
    if (menuOptions.length === 0) {
      p.log.error('실행 가능한 게임 옵션이 없습니다.');
      return null;
    }

    // Auto-select if only one option without children
    if (menuOptions.length === 1 && !menuOptions[0]?.children?.length) {
      return menuOptions[0] || null;
    }

    const options = menuOptions.map((opt, index) => {
      const hasChildren = opt.children && opt.children.length > 0;
      const childInfo = hasChildren ? ` →` : '';
      const pcemMark = opt.executer === 'pcem' ? ' [PCem]' : '';
      // Show first command as hint (usually the main executable)
      const hintText = hasChildren ? `${opt.children!.length}개 하위 메뉴` : (opt.commands[0] || '');

      return {
        value: index,
        label: `${opt.title || `옵션 ${index + 1}`}${childInfo}${pcemMark}`,
        hint: hintText,
      };
    });

    options.push({ value: -1, label: '← 뒤로', hint: '' });

    const selected = await p.select({
      message,
      options,
    });

    if (p.isCancel(selected) || selected === -1) return null;

    const chosenOption = menuOptions[selected as number];
    if (!chosenOption) return null;

    // If selected option has children, show sub-menu
    if (chosenOption.children && chosenOption.children.length > 0) {
      return selectFromMenu(chosenOption.children, `${chosenOption.title} >`);
    }

    return chosenOption;
  }

  // Select execution option (with hierarchical menu support)
  const selectedOption = await selectFromMenu(
    gameConfig.executionOptions,
    '실행할 옵션을 선택하세요'
  );

  if (!selectedOption) return;

  // Check if unsupported executer (PCem, Windows)
  if (selectedOption.executer === 'pcem') {
    p.log.error('이 옵션은 PCem이 필요합니다.');
    p.log.info('PCem은 macOS/Linux에서 지원되지 않습니다.');
    return;
  }

  if (selectedOption.executer === 'windows') {
    p.log.error('이 옵션은 네이티브 Windows 프로그램입니다.');
    p.log.info('Windows 전용 프로그램은 macOS/Linux에서 실행할 수 없습니다.');
    return;
  }

  // Check DOS utilities (태백한글, SB16 etc.) only for utility programs
  if (selectedOption.executer === 'dosbox' && game.genre?.includes('유틸리티')) {
    if (!isDosUtilInstalled()) {
      const s = p.spinner();
      s.start('DOS 유틸리티 다운로드 중...');
      try {
        await downloadDosUtil((message) => {
          s.message(message);
        });
        s.stop(`${pc.green('✓')} DOS 유틸리티 설치 완료!`);
      } catch (error) {
        s.stop(`${pc.red('✗')} DOS 유틸리티 설치 실패`);
        p.log.error(`오류: ${error}`);
        return;
      }
    }
  }

  // Check if this option requires W95KR (Windows 95 games)
  if (selectedOption.executer === 'w95kr') {
    const w95krName = 'W95KR-x';
    const downloadSize = '약 50MB';

    if (!isW95krInstalled(w95krName)) {
      p.log.warn('이 게임은 Windows 95 이미지가 필요합니다.');
      p.log.info(`${w95krName}로 실행합니다.`);

      const shouldInstall = await p.confirm({
        message: `${w95krName} 이미지를 다운로드하시겠습니까? (${downloadSize})`,
      });

      if (p.isCancel(shouldInstall) || !shouldInstall) {
        p.log.info('W95KR-x 이미지 없이는 이 게임을 실행할 수 없습니다.');
        return;
      }

      const s = p.spinner();
      s.start(`${w95krName} 이미지 다운로드 중...`);

      try {
        await downloadW95kr((message) => {
          s.message(message);
        });
        s.stop(`${w95krName} 이미지 설치 완료!`);
      } catch (error) {
        s.stop(`${w95krName} 설치 실패`);
        p.log.error(`설치 중 오류 발생: ${error}`);
        return;
      }
    }
  }

  // Check if this option requires W98KR
  if (selectedOption.executer === 'w98kr') {
    // Always use W98KR-x image (DOSBox-X용)
    const w98krName = 'W98KR-x';
    const downloadSize = '약 94MB';
    const originalImage = selectedOption.executerName || 'W98KR';

    if (!isW98krInstalled(w98krName)) {
      p.log.warn(`이 게임은 ${originalImage} 이미지가 필요합니다.`);
      p.log.info(`${w98krName}로 대체하여 실행합니다.`);

      const shouldInstall = await p.confirm({
        message: `${w98krName} 이미지를 다운로드하시겠습니까? (${downloadSize})`,
      });

      if (p.isCancel(shouldInstall) || !shouldInstall) {
        p.log.info('W98KR-x 이미지 없이는 이 게임을 실행할 수 없습니다.');
        return;
      }

      const s = p.spinner();
      s.start(`${w98krName} 이미지 다운로드 중...`);

      try {
        await downloadW98kr((message) => {
          s.message(message);
        }, 'dosbox-x');
        s.stop(`${w98krName} 이미지 설치 완료!`);
      } catch (error) {
        s.stop(`${w98krName} 설치 실패`);
        p.log.error(`설치 중 오류 발생: ${error}`);
        return;
      }
    }
  }

  // Show executer info
  let executerInfo: string;
  if (selectedOption.executer === 'w95kr') {
    executerInfo = `${pc.cyan('Windows 95')} (W95KR-x)`;
  } else if (selectedOption.executer === 'w98kr') {
    const originalImage = selectedOption.executerName || 'W98KR';
    executerInfo = `${pc.cyan('Windows 98')} (${originalImage} → W98KR-x)`;
  } else {
    executerInfo = pc.blue('DOSBox');
  }

  try {
    p.log.step(`${selectedOption.title} 실행 중... [${executerInfo}]`);

    if (selectedOption.executer === 'w95kr') {
      await launchW95krGame(gameExecDir, gameConfig, selectedOption);
    } else if (selectedOption.executer === 'w98kr') {
      await launchW98krGame(gameExecDir, gameConfig, selectedOption);
    } else {
      await launchGameWithConfig(gameExecDir, gameConfig, selectedOption);
    }
  } catch (error) {
    p.log.error(`게임 실행 중 오류 발생: ${error}`);
  }
}
