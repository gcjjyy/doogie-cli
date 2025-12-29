import { existsSync } from 'fs';
import { readdir, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { findDosboxXPath, getBundledDosboxXLibDir } from '../utils/platform.ts';
import { getDosUtilDir, getGusDir, getLogsDir, getMapperDir } from '../utils/paths.ts';
import {
  parseDiskGeometry,
  findWin9xImageByName,
} from './w98kr.ts';
import {
  getDefaultWin9xSettings,
  getDefaultDosboxSettings,
  mergeSettings,
  generateDosboxConf,
  parseEditConf,
  parseEditConfVersion,
  isLegacyVersion,
  convertEditConfToSettings,
  getWin9xSettingsWithPreset,
  type DosboxSettings,
} from './dosbox-settings.ts';
import { getExecuterMapping, type Win9xImageInfo } from './executer-mapping.ts';
import type { GameConfig, ExecutionOption } from './config-parser.ts';
import { getMapperFile } from '../data/mapper/index.ts';

import type { LauncherConfig, W98krInfo } from '../types/index.ts';

const EXECUTABLE_EXTENSIONS = ['.exe', '.com', '.bat'];

/**
 * DOSBox-X 실행
 */
async function launchDosboxX(dosboxXPath: string, configPath: string): Promise<void> {
  const libDir = getBundledDosboxXLibDir();

  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  if (libDir) {
    env.DYLD_LIBRARY_PATH = libDir;
  }

  // 로그 디렉토리 생성 및 로그 파일 경로
  const logsDir = getLogsDir();
  await mkdir(logsDir, { recursive: true });
  const logPath = join(logsDir, 'dosbox-x.log');
  const logFile = Bun.file(logPath);
  const logWriter = logFile.writer();

  const proc = Bun.spawn([dosboxXPath, '-conf', configPath], {
    stdout: 'pipe',
    stderr: 'pipe',
    env,
  });

  // stdout/stderr를 로그 파일로 기록
  const writeStream = async (stream: ReadableStream<Uint8Array> | null) => {
    if (!stream) return;
    const reader = stream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) logWriter.write(value);
      }
    } catch {
      // 스트림 종료
    }
  };

  // 병렬로 stdout/stderr 처리
  await Promise.all([
    writeStream(proc.stdout),
    writeStream(proc.stderr),
    proc.exited,
  ]);

  logWriter.end();
}

export async function findGameExecutable(gameDir: string): Promise<string | null> {
  const files = await readdir(gameDir, { recursive: true });

  // Priority: INSTALL.EXE/GAME.EXE/MAIN.EXE, then any .EXE, then .COM, then .BAT
  const priorityNames = ['game', 'main', 'start', 'run', 'play'];

  for (const ext of EXECUTABLE_EXTENSIONS) {
    // First, look for priority executables
    for (const name of priorityNames) {
      const found = files.find(
        (f) => f.toLowerCase() === `${name}${ext}` || f.toLowerCase().endsWith(`/${name}${ext}`)
      );
      if (found) {
        return typeof found === 'string' ? found : found;
      }
    }

    // Then look for any file with the extension
    const found = files.find(
      (f) => typeof f === 'string' && f.toLowerCase().endsWith(ext)
    );
    if (found) {
      return typeof found === 'string' ? found : found;
    }
  }

  return null;
}

export async function generateDosboxConfig(
  gameDir: string,
  executable: string
): Promise<string> {
  const configPath = join(gameDir, 'dosbox.conf');

  const config = `
[sdl]
fullscreen=false
fulldouble=false
output=opengl

[dosbox]
machine=svga_s3

[cpu]
core=auto
cputype=auto
cycles=auto

[mixer]
nosound=false
rate=44100

[midi]
mpu401=intelligent
mididevice=default

[sblaster]
sbtype=sb16
sbbase=220
irq=7
dma=1
hdma=5
sbmixer=true

[gus]
gus=false

[speaker]
pcspeaker=true
pcrate=44100
tandy=auto

[autoexec]
@echo off
mount c "${gameDir}"
c:
${executable}
exit
`;

  await writeFile(configPath, config.trim());
  return configPath;
}

export async function launchGame(
  gameDir: string,
  executable?: string
): Promise<void> {
  const dosboxXPath = findDosboxXPath();

  if (!dosboxXPath) {
    throw new Error('DOSBox-X 실행파일을 찾을 수 없습니다.');
  }


  // Find executable if not provided
  let executablePath = executable;
  if (!executablePath) {
    const found = await findGameExecutable(gameDir);
    if (!found) {
      throw new Error('No executable found in game directory');
    }
    executablePath = found;
  }

  // Generate DOSBox config
  const configPath = await generateDosboxConfig(gameDir, executablePath);

  // Launch DOSBox-X
  await launchDosboxX(dosboxXPath, configPath);
}

export async function launchWithCustomConfig(
  configPath: string
): Promise<void> {
  const dosboxXPath = findDosboxXPath();

  if (!dosboxXPath) {
    throw new Error('DOSBox-X 실행파일을 찾을 수 없습니다.');
  }

  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  await launchDosboxX(dosboxXPath, configPath);
}

async function findCdImage(gameDir: string): Promise<string | null> {
  // CD images are in DosBox/CD/ (gameDir already includes Game/)
  const cdDir = join(gameDir, 'DosBox', 'CD');
  try {
    const files = await readdir(cdDir);
    // Look for .cue file first, then .iso, then .bin
    for (const ext of ['.cue', '.iso', '.bin']) {
      const found = files.find(f => f.toLowerCase().endsWith(ext));
      if (found) {
        return join(cdDir, found);
      }
    }
  } catch {
    // CD directory doesn't exist
  }
  return null;
}

export async function generateDosboxConfigWithOptions(
  gameDir: string,
  option: ExecutionOption,
  editConfContent?: string
): Promise<string> {
  const configPath = join(gameDir, 'dosbox.conf');

  // Check for CD image
  const cdImagePath = await findCdImage(gameDir);

  // Build autoexec section
  let autoexec = '@echo off\n';

  // Mount game folder as C:
  autoexec += `mount c "${gameDir}" > nul\n`;
  autoexec += 'c:\n';

  // Mount DOS utilities as X:
  const dosUtilDir = getDosUtilDir();
  if (existsSync(dosUtilDir)) {
    autoexec += `mount x "${dosUtilDir}" > nul\n`;
    autoexec += 'CALL X:\\PATH.BAT > nul\n';
  }

  // Mount GUS folder as Y:
  const gusDir = getGusDir();
  if (existsSync(gusDir)) {
    autoexec += `mount y "${gusDir}" > nul\n`;
    autoexec += 'SET PROPATS=Y:\\PPL161 > nul\n';
  }

  // Sound settings
  if (existsSync(dosUtilDir)) {
    autoexec += 'SET SOUND=X:\\SB16 > nul\n';
    autoexec += 'SET MIDI=SYNTH:1 MAP:E > nul\n';
    autoexec += 'X:\\SB16\\DIAGNOSE /S > nul\n';
    autoexec += 'X:\\SB16\\MIXERSET /P /Q > nul\n';
  }

  // Mixer settings
  autoexec += 'MIXER MASTER 100 SPKR 100 GUS 100 SB 60 FM 60 MT32 100 CDAUDIO 100 > nul\n';

  // Mount CD image if found
  if (cdImagePath) {
    autoexec += `imgmount d "${cdImagePath}" -t cdrom > nul\n`;
  }

  // Add addkey commands
  if (option.addkeyCommands && option.addkeyCommands.length > 0) {
    for (const addkeyCmd of option.addkeyCommands) {
      autoexec += `${addkeyCmd}\n`;
    }
  }

  // Add all commands
  for (const cmd of option.commands) {
    autoexec += `${cmd}\n`;
  }

  autoexec += 'exit\n';

  // Get default DOSBox settings
  let settings = getDefaultDosboxSettings();

  // Apply edit.conf overrides if present
  if (editConfContent) {
    const version = parseEditConfVersion(editConfContent);
    const isLegacy = isLegacyVersion(version);
    const entries = parseEditConf(editConfContent);
    const overrideSettings = convertEditConfToSettings(entries, isLegacy);
    settings = mergeSettings(settings, overrideSettings);
  }

  // Generate DOSBox-X config
  const config = generateDosboxConf(
    settings,
    autoexec,
    '# DOSBox-X configuration for DOS game\n# Auto-generated by doogie-cli'
  );

  await writeFile(configPath, config);
  return configPath;
}

export async function launchGameWithConfig(
  gameDir: string,
  gameConfig: GameConfig,
  selectedOption: ExecutionOption
): Promise<void> {
  const dosboxXPath = findDosboxXPath();

  if (!dosboxXPath) {
    throw new Error('DOSBox-X 실행파일을 찾을 수 없습니다.');
  }

  // Read edit.conf if exists
  // gameDir is the Game folder, edit.conf is in ../Config/DosBox/
  let editConfContent: string | undefined;
  const editConfPath = join(gameDir, '..', 'Config', 'DosBox', 'edit.conf');
  if (existsSync(editConfPath)) {
    editConfContent = await Bun.file(editConfPath).text();
  }

  // Generate DOSBox-X config with parsed settings
  const configPath = await generateDosboxConfigWithOptions(
    gameDir,
    selectedOption,
    editConfContent
  );

  // Launch DOSBox-X
  await launchDosboxX(dosboxXPath, configPath);
}

export async function parseConfigFile(configDir: string): Promise<LauncherConfig | null> {
  // Look for .conf files in the Config directory
  const files = await readdir(configDir).catch(() => []);

  for (const file of files) {
    if (file.toLowerCase().endsWith('.conf')) {
      const configPath = join(configDir, file);
      const content = await Bun.file(configPath).text();

      // Parse autoexec section to find executable
      const autoexecMatch = content.match(/\[autoexec\]([\s\S]*?)(?:\[|$)/i);
      if (autoexecMatch && autoexecMatch[1]) {
        const autoexec = autoexecMatch[1];
        const lines = autoexec.split('\n').filter((l) => l.trim() && !l.startsWith('@') && !l.startsWith('echo'));

        // Find the executable command
        for (const line of lines) {
          const trimmed = line.trim().toLowerCase();
          if (
            trimmed.endsWith('.exe') ||
            trimmed.endsWith('.com') ||
            trimmed.endsWith('.bat')
          ) {
            return {
              executable: line.trim(),
              mountPath: '',
            };
          }
        }
      }
    }
  }

  // Look for .bat files
  for (const file of files) {
    if (file.toLowerCase().endsWith('.bat')) {
      const batPath = join(configDir, file);
      const content = await Bun.file(batPath).text();

      // Parse bat file to find executable
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim().toLowerCase();
        if (
          trimmed.endsWith('.exe') ||
          trimmed.endsWith('.com')
        ) {
          return {
            executable: line.trim(),
            mountPath: '',
          };
        }
      }
    }
  }

  return null;
}

// W98KR (Windows 98) support functions

export async function generateW98krConfig(
  gameDir: string,
  option: ExecutionOption,
  w98krInfo: W98krInfo,
  resolution: { width: number; height: number; bitsPerPixel: number },
  editConfContent?: string
): Promise<string> {
  // Write config to logs directory (always exists) instead of gameDir which may not exist
  const logsDir = getLogsDir();
  if (!existsSync(logsDir)) {
    await mkdir(logsDir, { recursive: true });
  }
  const configPath = join(logsDir, 'dosbox-w98kr.conf');

  // Parse W98KR disk geometry
  const w98krGeometry = parseDiskGeometry(w98krInfo.diskParams);

  // Check for CD image
  const cdImagePath = await findCdImage(gameDir);

  // Determine host directory for Game.txt
  const hostDir = option.optionPath
    ? join(gameDir, 'DG_9xOpt', option.optionPath)
    : join(gameDir, 'DG_9xOpt', '000');

  // Build autoexec section for booting Windows 98
  // 공식 두기 런처 방식과 동일하게 구현
  let autoexec = '@echo off\n';

  // Mount CD-ROM on IDE secondary master (to avoid PnP detection issues on newer DOSBox-X)
  if (cdImagePath) {
    autoexec += `imgmount E "${cdImagePath}" -t cdrom -ide 2m > nul\n`;
  }

  // Set DOSBox mixer volumes (두기 런처 기본값)
  autoexec += 'MIXER MASTER 100 SPKR 100 GUS 100 SB 60 FM 60 MT32 100 CDAUDIO 100 > nul\n';

  // Mount Windows 98 as C: drive on IDE primary master
  autoexec += `imgmount C "${w98krInfo.imagePath}" -t hdd -fs fat -size ${w98krGeometry.sectorSize},${w98krGeometry.sectorsPerTrack},${w98krGeometry.heads},${w98krGeometry.cylinders} -ide 1m > nul\n`;

  // Mount game disk (image or folder) on IDE primary slave
  // Find .img file in commands for disk image based games
  const imgCommand = option.commands.find(cmd => cmd.toLowerCase().endsWith('.img'));
  if (option.diskGeometry && imgCommand) {
    // Disk image based game (e.g., W98KR games like 서풍의 광시곡)
    const gameGeometry = parseDiskGeometry(option.diskGeometry);
    const gameImagePath = join(gameDir, imgCommand);
    autoexec += `imgmount D "${gameImagePath}" -t hdd -fs fat -size ${gameGeometry.sectorSize},${gameGeometry.sectorsPerTrack},${gameGeometry.heads},${gameGeometry.cylinders} -ide 1s > nul\n`;
  } else {
    // Folder-based game (e.g., [WIN] options like 포가튼사가 에디터)
    autoexec += `MOUNT D "${gameDir}" > nul\n`;
  }

  // Delete old registry files (공식 런처 방식)
  autoexec += 'del C:\\DX.REG > nul\n';
  autoexec += 'del C:\\GAME.REG > nul\n';

  // Build DX.REG using C:\DGGL\ registry files (공식 런처 방식)
  // Resolution format: {width}x{bitsPerPixel} (e.g., 640x8, 800x16)
  const resolutionFile = `${resolution.width}x${resolution.bitsPerPixel}`;

  autoexec += 'copy C:\\DGGL\\BLANK.REG C:\\DX.REG > nul\n';
  autoexec += `if not exist C:\\DGGL\\Res\\${resolutionFile}.reg goto 9xres\n`;
  autoexec += `type C:\\DGGL\\Res\\${resolutionFile}.reg >> C:\\DX.REG\n`;
  autoexec += ':9xres\n';
  autoexec += 'if not exist C:\\DGGL\\DDRAW\\true.reg goto 9xddraw\n';
  autoexec += 'type C:\\DGGL\\DDRAW\\true.reg >> C:\\DX.REG\n';
  autoexec += ':9xddraw\n';
  autoexec += 'if not exist C:\\DGGL\\D3D\\true.reg goto 9xd3d\n';
  autoexec += 'type C:\\DGGL\\D3D\\true.reg >> C:\\DX.REG\n';
  autoexec += ':9xd3d\n';
  autoexec += 'if not exist C:\\DGGL\\3DFX\\true.reg goto 9x3dfx\n';
  autoexec += 'type C:\\DGGL\\3DFX\\true.reg >> C:\\DX.REG\n';
  autoexec += ':9x3dfx\n';
  autoexec += 'if not exist C:\\DGGL\\MPU\\SBFM.reg goto 9xmpu\n';
  autoexec += 'type C:\\DGGL\\MPU\\SBFM.reg >> C:\\DX.REG\n';
  autoexec += ':9xmpu\n';

  // Volume settings (공식 런처 방식)
  // Master Volume
  autoexec += 'if not exist C:\\DGGL\\Volume\\Master.reg goto master1\n';
  autoexec += 'type C:\\DGGL\\Volume\\Master.reg >> C:\\DX.REG\n';
  autoexec += 'echo ff,ff,ff,ff >> C:\\DX.REG\n';
  autoexec += ':master1\n';
  autoexec += 'if not exist C:\\DGGL\\Volume\\Master1.reg goto master2\n';
  autoexec += 'type C:\\DGGL\\Volume\\Master1.reg >> C:\\DX.REG\n';
  autoexec += 'echo ffff >> C:\\DX.REG\n';
  autoexec += 'type C:\\DGGL\\Volume\\Master2.reg >> C:\\DX.REG\n';
  autoexec += 'echo ffff >> C:\\DX.REG\n';
  autoexec += ':master2\n';
  autoexec += 'if not exist C:\\DGGL\\Volume\\Master3.reg goto master3\n';
  autoexec += 'type C:\\DGGL\\Volume\\Master3.reg >> C:\\DX.REG\n';
  autoexec += 'echo ff,ff,ff,ff >> C:\\DX.REG\n';
  autoexec += 'type C:\\DGGL\\Volume\\Master4.reg >> C:\\DX.REG\n';
  autoexec += 'echo ff,ff,ff,ff >> C:\\DX.REG\n';
  autoexec += ':master3\n';
  // Wave Volume
  autoexec += 'if not exist C:\\DGGL\\Volume\\Wave.reg goto wave1\n';
  autoexec += 'type C:\\DGGL\\Volume\\Wave.reg >> C:\\DX.REG\n';
  autoexec += 'echo ff,ff,ff,ff >> C:\\DX.REG\n';
  autoexec += ':wave1\n';
  autoexec += 'if not exist C:\\DGGL\\Volume\\Wave1.reg goto wave2\n';
  autoexec += 'type C:\\DGGL\\Volume\\Wave1.reg >> C:\\DX.REG\n';
  autoexec += 'echo ffff >> C:\\DX.REG\n';
  autoexec += 'type C:\\DGGL\\Volume\\Wave2.reg >> C:\\DX.REG\n';
  autoexec += 'echo ffff >> C:\\DX.REG\n';
  autoexec += ':wave2\n';
  autoexec += 'if not exist C:\\DGGL\\Volume\\Wave3.reg goto wave3\n';
  autoexec += 'type C:\\DGGL\\Volume\\Wave3.reg >> C:\\DX.REG\n';
  autoexec += 'echo ff,ff,ff,ff >> C:\\DX.REG\n';
  autoexec += 'type C:\\DGGL\\Volume\\Wave4.reg >> C:\\DX.REG\n';
  autoexec += 'echo ff,ff,ff,ff >> C:\\DX.REG\n';
  autoexec += ':wave3\n';
  // Midi Volume
  autoexec += 'if not exist C:\\DGGL\\Volume\\Midi.reg goto midi1\n';
  autoexec += 'type C:\\DGGL\\Volume\\Midi.reg >> C:\\DX.REG\n';
  autoexec += 'echo ff,ff,ff,ff >> C:\\DX.REG\n';
  autoexec += ':midi1\n';
  autoexec += 'if not exist C:\\DGGL\\Volume\\Midi1.reg goto midi2\n';
  autoexec += 'type C:\\DGGL\\Volume\\Midi1.reg >> C:\\DX.REG\n';
  autoexec += 'echo ffff >> C:\\DX.REG\n';
  autoexec += 'type C:\\DGGL\\Volume\\Midi2.reg >> C:\\DX.REG\n';
  autoexec += 'echo ffff >> C:\\DX.REG\n';
  autoexec += ':midi2\n';
  autoexec += 'if not exist C:\\DGGL\\Volume\\Midi3.reg goto midi3\n';
  autoexec += 'type C:\\DGGL\\Volume\\Midi3.reg >> C:\\DX.REG\n';
  autoexec += 'echo ff,ff,ff,ff >> C:\\DX.REG\n';
  autoexec += 'type C:\\DGGL\\Volume\\Midi4.reg >> C:\\DX.REG\n';
  autoexec += 'echo ff,ff,ff,ff >> C:\\DX.REG\n';
  autoexec += ':midi3\n';
  // CD Volume
  autoexec += 'if not exist C:\\DGGL\\Volume\\CD.reg goto cd1\n';
  autoexec += 'type C:\\DGGL\\Volume\\CD.reg >> C:\\DX.REG\n';
  autoexec += 'echo 80,80,80,80 >> C:\\DX.REG\n';
  autoexec += ':cd1\n';
  autoexec += 'if not exist C:\\DGGL\\Volume\\CD1.reg goto cd2\n';
  autoexec += 'type C:\\DGGL\\Volume\\CD1.reg >> C:\\DX.REG\n';
  autoexec += 'echo 8080 >> C:\\DX.REG\n';
  autoexec += 'type C:\\DGGL\\Volume\\CD2.reg >> C:\\DX.REG\n';
  autoexec += 'echo 8080 >> C:\\DX.REG\n';
  autoexec += ':cd2\n';
  autoexec += 'if not exist C:\\DGGL\\Volume\\CD3.reg goto cd3\n';
  autoexec += 'type C:\\DGGL\\Volume\\CD3.reg >> C:\\DX.REG\n';
  autoexec += 'echo 80,80,80,80 >> C:\\DX.REG\n';
  autoexec += 'type C:\\DGGL\\Volume\\CD4.reg >> C:\\DX.REG\n';
  autoexec += 'echo 80,80,80,80 >> C:\\DX.REG\n';
  autoexec += ':cd3\n';

  // Mount host folder and copy game files to C: drive
  autoexec += `Mount V "${hostDir}" > nul\n`;
  autoexec += 'xcopy /e /y V:\\*.* C:\\ > nul\n';
  autoexec += 'C: > nul\n';

  // Copy game.lnk to D: drive if exists
  if (existsSync(join(hostDir, 'game.lnk'))) {
    autoexec += 'xcopy /e /y V:\\game.lnk D:\\ > nul\n';
  }

  // Unmount temporary drive
  autoexec += 'Mount -u V > nul\n';

  // Boot from C: drive
  autoexec += 'boot -l C > nul\n';

  // 신규 맵핑 버전: 템플릿 + CFGFILE 프리셋 + edit.conf 오버라이드
  const cfgFile = option.cfgFile;
  const presetResult = await getWin9xSettingsWithPreset(cfgFile, editConfContent);
  let settings = presetResult.settings;

  // Generate conf file
  const config = generateDosboxConf(
    settings,
    autoexec,
    '# DOSBox-X configuration for Windows 98 (W98KR)\n# Auto-generated by doogie-cli'
  );

  // Write generated config to log file for debugging
  const logPath = join(logsDir, 'dosbox-config.log');
  await writeFile(logPath, `# Generated at: ${new Date().toISOString()}\n# Game: W98KR\n\n${config}`);

  await writeFile(configPath, config);
  return configPath;
}

export async function launchW98krGame(
  gameDir: string,
  gameConfig: GameConfig,
  selectedOption: ExecutionOption
): Promise<void> {
  // Check if DOSBox-X is available (W98KR requires DOSBox-X)
  const dosboxXPath = findDosboxXPath();

  if (!dosboxXPath) {
    throw new Error('DOSBox-X 실행파일을 찾을 수 없습니다.');
  }

  // Get the correct image based on executer name from gameConfig
  const executerName = gameConfig.executerName || 'W98KR_Daum_Final';
  const mapping = getExecuterMapping(executerName);

  if (!mapping.imageInfo) {
    throw new Error(`실행기 ${executerName}에 대한 이미지 정보를 찾을 수 없습니다.`);
  }

  const imageName = mapping.imageInfo.name;
  console.log(`Executer: ${executerName} -> Image: ${imageName}`);

  // Check if the image is installed
  const w98krInfo = await findWin9xImageByName(imageName);

  if (!w98krInfo) {
    throw new Error(`Win9x 이미지가 설치되어 있지 않습니다: ${imageName}\n\n다음 명령어로 이미지를 설치해주세요:\n  doogie-cli install-image ${imageName}`);
  }

  console.log(`Using Win98 image: ${w98krInfo.name} (${w98krInfo.version})`);
  if (selectedOption.optionPath) {
    console.log(`Auto-run option: ${selectedOption.optionPath}`);
  }

  // Use resolution from gameConfig if available, otherwise default to 640x480 8-bit
  const resolution = gameConfig.resolution || { width: 640, height: 480, bitsPerPixel: 8 };
  console.log(`Setting display: ${resolution.width}x${resolution.height} ${resolution.bitsPerPixel === 8 ? '256 colors' : `${resolution.bitsPerPixel}-bit`}`);

  // Read edit.conf content for settings overrides
  let editConfContent: string | undefined;
  const editConfPath = join(gameDir, '..', 'Config', 'DosBox', 'edit.conf');
  if (existsSync(editConfPath)) {
    editConfContent = await Bun.file(editConfPath).text();
  }

  // Generate DOSBox-X config for W98KR with CFGFILE preset and edit.conf overrides
  const configPath = await generateW98krConfig(
    gameDir,
    selectedOption,
    w98krInfo,
    resolution,
    editConfContent
  );

  // Launch DOSBox-X
  await launchDosboxX(dosboxXPath, configPath);
}

// W95KR (Windows 95) support functions
// Note: DX.REG is generated by autoexec commands inside DOSBox-X using C:\DGGL\ files,
// NOT created on the host filesystem.

export async function generateW95krConfig(
  gameDir: string,
  option: ExecutionOption,
  w95krInfo: W98krInfo,
  resolution: { width: number; height: number; bitsPerPixel: number },
  editConfContent?: string
): Promise<string> {
  // Write config to logs directory (always exists) instead of gameDir which may not exist
  const logsDir = getLogsDir();
  if (!existsSync(logsDir)) {
    await mkdir(logsDir, { recursive: true });
  }
  const configPath = join(logsDir, 'dosbox-w95kr.conf');

  // Parse W95KR disk geometry
  const w95krGeometry = parseDiskGeometry(w95krInfo.diskParams);

  // Check for CD image
  const cdImagePath = await findCdImage(gameDir);

  // Determine host directory for Game.txt
  const hostDir = option.optionPath
    ? join(gameDir, 'DG_9xOpt', option.optionPath)
    : join(gameDir, 'DG_9xOpt', '000');

  // Build autoexec section for booting Windows 95
  // 공식 두기 런처 방식과 동일하게 구현
  let autoexec = '@echo off\n';

  // Mount CD-ROM on IDE secondary master (to avoid PnP detection issues on newer DOSBox-X)
  if (cdImagePath) {
    autoexec += `imgmount E "${cdImagePath}" -t cdrom -ide 2m > nul\n`;
  }

  // Set DOSBox mixer volumes (두기 런처 기본값)
  autoexec += 'MIXER MASTER 100 SPKR 100 GUS 100 SB 60 FM 60 MT32 100 CDAUDIO 100 > nul\n';

  // Mount Windows 95 as C: drive on IDE primary master
  autoexec += `imgmount C "${w95krInfo.imagePath}" -t hdd -fs fat -size ${w95krGeometry.sectorSize},${w95krGeometry.sectorsPerTrack},${w95krGeometry.heads},${w95krGeometry.cylinders} -ide 1m > nul\n`;

  // Mount game disk (image or folder) on IDE primary slave
  // Find .img file in commands for disk image based games
  const imgCommand = option.commands.find(cmd => cmd.toLowerCase().endsWith('.img'));
  if (option.diskGeometry && imgCommand) {
    // Disk image based game
    const gameGeometry = parseDiskGeometry(option.diskGeometry);
    const gameImagePath = join(gameDir, imgCommand);
    autoexec += `imgmount D "${gameImagePath}" -t hdd -fs fat -size ${gameGeometry.sectorSize},${gameGeometry.sectorsPerTrack},${gameGeometry.heads},${gameGeometry.cylinders} -ide 1s > nul\n`;
  } else {
    // Folder-based game
    autoexec += `MOUNT D "${gameDir}" > nul\n`;
  }

  // Delete old registry files (공식 런처 방식)
  autoexec += 'del C:\\DX.REG > nul\n';
  autoexec += 'del C:\\GAME.REG > nul\n';

  // Build DX.REG using C:\DGGL\ registry files (공식 런처 방식)
  // Resolution format: {width}x{bitsPerPixel} (e.g., 640x8, 800x16)
  const resolutionFile = `${resolution.width}x${resolution.bitsPerPixel}`;

  autoexec += 'copy C:\\DGGL\\BLANK.REG C:\\DX.REG > nul\n';
  autoexec += `if not exist C:\\DGGL\\Res\\${resolutionFile}.reg goto 9xres\n`;
  autoexec += `type C:\\DGGL\\Res\\${resolutionFile}.reg >> C:\\DX.REG\n`;
  autoexec += ':9xres\n';
  autoexec += 'if not exist C:\\DGGL\\DDRAW\\true.reg goto 9xddraw\n';
  autoexec += 'type C:\\DGGL\\DDRAW\\true.reg >> C:\\DX.REG\n';
  autoexec += ':9xddraw\n';
  autoexec += 'if not exist C:\\DGGL\\D3D\\true.reg goto 9xd3d\n';
  autoexec += 'type C:\\DGGL\\D3D\\true.reg >> C:\\DX.REG\n';
  autoexec += ':9xd3d\n';
  autoexec += 'if not exist C:\\DGGL\\3DFX\\true.reg goto 9x3dfx\n';
  autoexec += 'type C:\\DGGL\\3DFX\\true.reg >> C:\\DX.REG\n';
  autoexec += ':9x3dfx\n';
  autoexec += 'if not exist C:\\DGGL\\MPU\\SBFM.reg goto 9xmpu\n';
  autoexec += 'type C:\\DGGL\\MPU\\SBFM.reg >> C:\\DX.REG\n';
  autoexec += ':9xmpu\n';

  // Volume settings (공식 런처 방식)
  // Master Volume
  autoexec += 'if not exist C:\\DGGL\\Volume\\Master.reg goto master1\n';
  autoexec += 'type C:\\DGGL\\Volume\\Master.reg >> C:\\DX.REG\n';
  autoexec += 'echo ff,ff,ff,ff >> C:\\DX.REG\n';
  autoexec += ':master1\n';
  autoexec += 'if not exist C:\\DGGL\\Volume\\Master1.reg goto master2\n';
  autoexec += 'type C:\\DGGL\\Volume\\Master1.reg >> C:\\DX.REG\n';
  autoexec += 'echo ffff >> C:\\DX.REG\n';
  autoexec += 'type C:\\DGGL\\Volume\\Master2.reg >> C:\\DX.REG\n';
  autoexec += 'echo ffff >> C:\\DX.REG\n';
  autoexec += ':master2\n';
  autoexec += 'if not exist C:\\DGGL\\Volume\\Master3.reg goto master3\n';
  autoexec += 'type C:\\DGGL\\Volume\\Master3.reg >> C:\\DX.REG\n';
  autoexec += 'echo ff,ff,ff,ff >> C:\\DX.REG\n';
  autoexec += 'type C:\\DGGL\\Volume\\Master4.reg >> C:\\DX.REG\n';
  autoexec += 'echo ff,ff,ff,ff >> C:\\DX.REG\n';
  autoexec += ':master3\n';
  // Wave Volume
  autoexec += 'if not exist C:\\DGGL\\Volume\\Wave.reg goto wave1\n';
  autoexec += 'type C:\\DGGL\\Volume\\Wave.reg >> C:\\DX.REG\n';
  autoexec += 'echo ff,ff,ff,ff >> C:\\DX.REG\n';
  autoexec += ':wave1\n';
  autoexec += 'if not exist C:\\DGGL\\Volume\\Wave1.reg goto wave2\n';
  autoexec += 'type C:\\DGGL\\Volume\\Wave1.reg >> C:\\DX.REG\n';
  autoexec += 'echo ffff >> C:\\DX.REG\n';
  autoexec += 'type C:\\DGGL\\Volume\\Wave2.reg >> C:\\DX.REG\n';
  autoexec += 'echo ffff >> C:\\DX.REG\n';
  autoexec += ':wave2\n';
  autoexec += 'if not exist C:\\DGGL\\Volume\\Wave3.reg goto wave3\n';
  autoexec += 'type C:\\DGGL\\Volume\\Wave3.reg >> C:\\DX.REG\n';
  autoexec += 'echo ff,ff,ff,ff >> C:\\DX.REG\n';
  autoexec += 'type C:\\DGGL\\Volume\\Wave4.reg >> C:\\DX.REG\n';
  autoexec += 'echo ff,ff,ff,ff >> C:\\DX.REG\n';
  autoexec += ':wave3\n';
  // Midi Volume
  autoexec += 'if not exist C:\\DGGL\\Volume\\Midi.reg goto midi1\n';
  autoexec += 'type C:\\DGGL\\Volume\\Midi.reg >> C:\\DX.REG\n';
  autoexec += 'echo ff,ff,ff,ff >> C:\\DX.REG\n';
  autoexec += ':midi1\n';
  autoexec += 'if not exist C:\\DGGL\\Volume\\Midi1.reg goto midi2\n';
  autoexec += 'type C:\\DGGL\\Volume\\Midi1.reg >> C:\\DX.REG\n';
  autoexec += 'echo ffff >> C:\\DX.REG\n';
  autoexec += 'type C:\\DGGL\\Volume\\Midi2.reg >> C:\\DX.REG\n';
  autoexec += 'echo ffff >> C:\\DX.REG\n';
  autoexec += ':midi2\n';
  autoexec += 'if not exist C:\\DGGL\\Volume\\Midi3.reg goto midi3\n';
  autoexec += 'type C:\\DGGL\\Volume\\Midi3.reg >> C:\\DX.REG\n';
  autoexec += 'echo ff,ff,ff,ff >> C:\\DX.REG\n';
  autoexec += 'type C:\\DGGL\\Volume\\Midi4.reg >> C:\\DX.REG\n';
  autoexec += 'echo ff,ff,ff,ff >> C:\\DX.REG\n';
  autoexec += ':midi3\n';
  // CD Volume
  autoexec += 'if not exist C:\\DGGL\\Volume\\CD.reg goto cd1\n';
  autoexec += 'type C:\\DGGL\\Volume\\CD.reg >> C:\\DX.REG\n';
  autoexec += 'echo 80,80,80,80 >> C:\\DX.REG\n';
  autoexec += ':cd1\n';
  autoexec += 'if not exist C:\\DGGL\\Volume\\CD1.reg goto cd2\n';
  autoexec += 'type C:\\DGGL\\Volume\\CD1.reg >> C:\\DX.REG\n';
  autoexec += 'echo 8080 >> C:\\DX.REG\n';
  autoexec += 'type C:\\DGGL\\Volume\\CD2.reg >> C:\\DX.REG\n';
  autoexec += 'echo 8080 >> C:\\DX.REG\n';
  autoexec += ':cd2\n';
  autoexec += 'if not exist C:\\DGGL\\Volume\\CD3.reg goto cd3\n';
  autoexec += 'type C:\\DGGL\\Volume\\CD3.reg >> C:\\DX.REG\n';
  autoexec += 'echo 80,80,80,80 >> C:\\DX.REG\n';
  autoexec += 'type C:\\DGGL\\Volume\\CD4.reg >> C:\\DX.REG\n';
  autoexec += 'echo 80,80,80,80 >> C:\\DX.REG\n';
  autoexec += ':cd3\n';

  // Mount host folder and copy game files to C: drive
  autoexec += `Mount V "${hostDir}" > nul\n`;
  autoexec += 'xcopy /e /y V:\\*.* C:\\ > nul\n';
  autoexec += 'C: > nul\n';

  // Copy game.lnk to D: drive if exists
  if (existsSync(join(hostDir, 'game.lnk'))) {
    autoexec += 'xcopy /e /y V:\\game.lnk D:\\ > nul\n';
  }

  // Unmount temporary drive
  autoexec += 'Mount -u V > nul\n';

  // Boot from C: drive
  autoexec += 'boot -l C > nul\n';

  // 신규 맵핑 버전: 템플릿 + CFGFILE 프리셋 + edit.conf 오버라이드
  const cfgFile = option.cfgFile;
  const presetResult = await getWin9xSettingsWithPreset(cfgFile, editConfContent);
  let settings = presetResult.settings;

  // Generate conf file
  const config = generateDosboxConf(
    settings,
    autoexec,
    '# DOSBox-X configuration for Windows 95 (W95KR)\n# Auto-generated by doogie-cli'
  );

  // Write generated config to log file for debugging
  const logPath = join(logsDir, 'dosbox-config.log');
  await writeFile(logPath, `# Generated at: ${new Date().toISOString()}\n# Game: W95KR\n\n${config}`);

  await writeFile(configPath, config);
  return configPath;
}

export async function launchW95krGame(
  gameDir: string,
  gameConfig: GameConfig,
  selectedOption: ExecutionOption
): Promise<void> {
  // Check if DOSBox-X is available (W95KR requires DOSBox-X)
  const dosboxXPath = findDosboxXPath();

  if (!dosboxXPath) {
    throw new Error('DOSBox-X 실행파일을 찾을 수 없습니다.');
  }

  // Get the correct image based on executer name from gameConfig
  const executerName = gameConfig.executerName || 'W95KR_Daum_Final';
  const mapping = getExecuterMapping(executerName);

  if (!mapping.imageInfo) {
    throw new Error(`실행기 ${executerName}에 대한 이미지 정보를 찾을 수 없습니다.`);
  }

  const imageName = mapping.imageInfo.name;
  console.log(`Executer: ${executerName} -> Image: ${imageName}`);

  // Check if the image is installed
  const w95krInfo = await findWin9xImageByName(imageName);

  if (!w95krInfo) {
    throw new Error(`Win9x 이미지가 설치되어 있지 않습니다: ${imageName}\n\n다음 명령어로 이미지를 설치해주세요:\n  doogie-cli install-image ${imageName}`);
  }

  console.log(`Using Win95 image: ${w95krInfo.name} (${w95krInfo.version})`);
  if (selectedOption.optionPath) {
    console.log(`Auto-run option: ${selectedOption.optionPath}`);
  }

  // Use resolution from gameConfig if available, otherwise default to 640x480 8-bit
  const resolution = gameConfig.resolution || { width: 640, height: 480, bitsPerPixel: 8 };
  console.log(`Setting display: ${resolution.width}x${resolution.height} ${resolution.bitsPerPixel === 8 ? '256 colors' : `${resolution.bitsPerPixel}-bit`}`);

  // Read edit.conf content for settings overrides
  let editConfContent: string | undefined;
  const editConfPath = join(gameDir, '..', 'Config', 'DosBox', 'edit.conf');
  if (existsSync(editConfPath)) {
    editConfContent = await Bun.file(editConfPath).text();
  }

  // Generate DOSBox-X config for W95KR with CFGFILE preset and edit.conf overrides
  const configPath = await generateW95krConfig(
    gameDir,
    selectedOption,
    w95krInfo,
    resolution,
    editConfContent
  );

  // Launch DOSBox-X
  await launchDosboxX(dosboxXPath, configPath);
}
