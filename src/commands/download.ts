import * as p from '@clack/prompts';
import pc from 'picocolors';
import { parseGamePage, downloadFiles, groupAttachments } from '../services/tistory.ts';
import { extractConfigAndManual } from '../services/extractor.ts';
import { parseGameConfig } from '../services/config-parser.ts';
import type { ExecutionOption } from '../services/config-parser.ts';
import { createGame, createDownloadFile, getGameByCode, updateGame } from '../services/database.ts';
import { getGameDir } from '../utils/paths.ts';
import { MultiProgress } from '../ui/multi-progress.ts';
import { checkAndInstall7zip } from '../utils/deps.ts';

// Core download function
async function downloadGameFromUrl(url: string): Promise<boolean> {
  // Check if 7z is available, offer to install if not
  const has7z = await checkAndInstall7zip();
  if (!has7z) {
    return false;
  }

  const s = p.spinner();
  s.start('페이지 분석 중...');

  let gameInfo;
  try {
    gameInfo = await parseGamePage(url);
    s.stop(`${pc.green('✓')} 게임 발견: ${pc.bold(gameInfo.name)}`);
  } catch (error) {
    s.stop('페이지 분석 실패');
    p.log.error(`페이지 분석 중 오류 발생: ${error}`);
    return false;
  }

  // Check if game already exists
  const existingGame = await getGameByCode(gameInfo.code);
  if (existingGame) {
    const overwrite = await p.confirm({
      message: `이미 등록된 게임입니다 (${existingGame.name}). 다시 다운로드하시겠습니까?`,
    });

    if (p.isCancel(overwrite) || !overwrite) return false;
  }

  // Show file summary
  const grouped = groupAttachments(gameInfo.attachments);

  p.log.info(`
${pc.bold('다운로드할 파일:')}
  게임: ${grouped.game.length}개
  설정: ${grouped.config.length}개
  매뉴얼: ${grouped.manual.length}개
  ${pc.dim(`총 ${gameInfo.attachments.length}개 파일`)}
`);

  const confirm = await p.confirm({
    message: '다운로드를 시작하시겠습니까?',
  });

  if (p.isCancel(confirm) || !confirm) return false;

  // Create game directory
  const gameDir = getGameDir(gameInfo.code);

  // Save to database
  let game;
  if (existingGame) {
    game = existingGame;
  } else {
    game = await createGame({
      name: gameInfo.name,
      code: gameInfo.code,
      genre: gameInfo.genre,
      sourceUrl: gameInfo.sourceUrl,
      launcherType: 'dosbox',
      localPath: gameDir,
    });
  }

  // Save download files to database
  for (const attachment of gameInfo.attachments) {
    await createDownloadFile({
      gameId: game.id,
      filename: attachment.filename,
      fileType: attachment.fileType,
      downloadUrl: attachment.downloadUrl,
      downloaded: false,
    });
  }

  // Start download with multi-progress UI
  console.log(pc.bold('\n다운로드 시작:\n'));

  const filenames = gameInfo.attachments.map(a => a.filename);
  const progress = new MultiProgress(filenames);
  progress.start();

  try {
    await downloadFiles(
      gameInfo.attachments,
      gameDir,
      (filename, downloaded, total) => {
        progress.updateProgress(filename, downloaded, total);
      },
      (filename) => {
        progress.setDone(filename);
      },
      (filename) => {
        progress.setError(filename);
      }
    );

    progress.finish();
    console.log(`\n${pc.green('✓')} 다운로드 완료! (${gameInfo.attachments.length}개 파일)`);
  } catch (error) {
    progress.finish();
    p.log.error(`\n다운로드 중 오류 발생: ${error}`);
    return false;
  }

  // Extract config and manual
  const extractSpinner = p.spinner();
  extractSpinner.start('설정 및 매뉴얼 압축 해제 중...');

  try {
    await extractConfigAndManual(gameDir);
    extractSpinner.stop(`${pc.green('✓')} 설정 및 매뉴얼 압축 해제 완료!`);

    // Parse config to get genre, proper game name, and launcher type
    const config = await parseGameConfig(gameDir);

    if (config) {
      // 실행기 이름: edit.conf의 0|0 값, 없으면 기본값 '0.74_Daum'
      const launcherType = config.executerName || '0.74_Daum';

      await updateGame(game.id, {
        name: config.info.name,
        genre: config.info.genreKr || config.info.genre,
        launcherType,
      });
    }
  } catch (error) {
    extractSpinner.stop('압축 해제 실패');
    p.log.error(`압축 해제 중 오류 발생: ${error}`);
  }

  p.log.success(`
${pc.bold(gameInfo.name)} 다운로드 완료!

${pc.dim('게임 목록에서 선택하여 실행할 수 있습니다.')}
${pc.dim('최초 실행 시 게임 파일이 자동으로 압축 해제됩니다.')}
`);

  return true;
}

// Interactive download - prompts for URL, allows adding multiple games
export async function downloadGame(): Promise<void> {
  while (true) {
    const url = await p.text({
      message: '두기의 고전게임 URL을 입력하세요',
      placeholder: 'https://nemo838.tistory.com/XXX',
      validate: (value) => {
        if (!value) return 'URL을 입력해주세요';
        if (!value.includes('tistory.com')) return '티스토리 URL이 아닙니다';
        return undefined;
      },
    });

    if (p.isCancel(url)) return;

    await downloadGameFromUrl(url);

    // Ask if user wants to add more games
    const addMore = await p.confirm({
      message: '다른 게임을 추가하시겠습니까?',
    });

    if (p.isCancel(addMore) || !addMore) {
      return;
    }
  }
}
