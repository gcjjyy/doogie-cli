import * as p from '@clack/prompts';
import pc from 'picocolors';
import Table from 'cli-table3';
import { rm } from 'fs/promises';
import { getAllGames, searchGames, getGameByCode, deleteGame, deleteDownloadFilesByGameId } from '../services/database.ts';
import { extractGameArchive, extractConfigAndManual } from '../services/extractor.ts';
import { launchGame, launchGameWithConfig, findGameExecutable } from '../services/launcher.ts';
import { parseGameConfig, getFirstDosboxOption } from '../services/config-parser.ts';
import { updateGame } from '../services/database.ts';
import { getGameDir } from '../utils/paths.ts';
import { checkAndInstallDosbox, checkAndInstall7zip } from '../utils/deps.ts';
import type { Game } from '../db/schema.ts';
import type { ExecutionOption } from '../services/config-parser.ts';

function formatStatus(game: Game): string {
  if (game.isExtracted) {
    return pc.green('✓ 설치됨');
  }
  return pc.yellow('○ 압축됨');
}

function displayGamesTable(games: Game[]): void {
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

  games.forEach((game, index) => {
    // Format launcher type for display
    const launcherDisplay = game.launcherType === 'dosbox' ? 'DOSBox'
      : game.launcherType === 'windows' ? 'Windows'
      : game.launcherType;

    table.push([
      String(index + 1),
      game.name,
      game.genre || '-',
      formatStatus(game),
      launcherDisplay,
    ]);
  });

  console.log(table.toString());
}

export async function listGames(): Promise<void> {
  while (true) {
    const games = await getAllGames();

    if (games.length === 0) {
      p.log.info('등록된 게임이 없습니다. 먼저 게임을 다운로드하세요.');
      return;
    }

    displayGamesTable(games);

    const action = await p.select({
      message: '무엇을 하시겠습니까?',
      options: [
        { value: 'search', label: '설치된 게임 검색' },
        { value: 'run', label: '게임 실행' },
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

  displayGamesTable(games);
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
  // Check if DOSBox is available, offer to install if not
  const hasDosbox = await checkAndInstallDosbox();
  if (!hasDosbox) {
    return;
  }

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

  // Filter DOSBox execution options only
  const dosboxOptions = gameConfig.executionOptions.filter(opt => opt.executer !== 'windows');

  if (dosboxOptions.length === 0) {
    p.log.error('실행 가능한 DOSBox 게임 옵션이 없습니다.');
    return;
  }

  // Select execution option
  let selectedOption: ExecutionOption;

  if (dosboxOptions.length === 1) {
    const firstOption = dosboxOptions[0];
    if (!firstOption) {
      p.log.error('실행 옵션을 찾을 수 없습니다.');
      return;
    }
    selectedOption = firstOption;
  } else {
    // Show selection menu for multiple options
    const options = dosboxOptions.map((opt, index) => ({
      value: index,
      label: opt.title || `옵션 ${index + 1}`,
      hint: opt.executable,
    }));

    const selected = await p.select({
      message: '실행할 옵션을 선택하세요',
      options,
    });

    if (p.isCancel(selected)) return;

    const chosenOption = dosboxOptions[selected as number];
    if (!chosenOption) {
      p.log.error('선택한 옵션을 찾을 수 없습니다.');
      return;
    }
    selectedOption = chosenOption;
  }

  // Show game info
  p.log.info(`
${pc.bold(gameConfig.info.name)}${gameConfig.info.nameEn ? ` (${gameConfig.info.nameEn})` : ''}
${pc.dim('장르:')} ${gameConfig.info.genreKr || gameConfig.info.genre}
${gameConfig.info.developer ? `${pc.dim('개발사:')} ${gameConfig.info.developer}` : ''}
${gameConfig.cpuCycles ? `${pc.dim('CPU Cycles:')} ${gameConfig.cpuCycles}` : ''}
`);

  try {
    p.log.step(`${selectedOption.title} 실행 중...`);
    await launchGameWithConfig(gameExecDir, gameConfig, selectedOption);
  } catch (error) {
    p.log.error(`게임 실행 중 오류 발생: ${error}`);
  }
}
