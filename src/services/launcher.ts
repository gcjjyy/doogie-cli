import { spawn } from 'bun';
import { existsSync } from 'fs';
import { readdir, writeFile } from 'fs/promises';
import { join, extname, dirname } from 'path';
import { findDosboxPath, getDosboxInstallGuide } from '../utils/platform.ts';
import { getW98krXDir } from '../utils/paths.ts';
import { findW98krByName, parseDiskGeometry, isW98krInstalled } from './w98kr.ts';
import type { GameConfig, ExecutionOption } from './config-parser.ts';

export { getDosboxInstallGuide };
import type { LauncherConfig, W98krInfo } from '../types/index.ts';

const EXECUTABLE_EXTENSIONS = ['.exe', '.com', '.bat'];

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
  const dosboxInfo = findDosboxPath();

  if (!dosboxInfo) {
    throw new Error(`DOSBox를 찾을 수 없습니다.\n\n${getDosboxInstallGuide()}`);
  }

  console.log(`Using ${dosboxInfo.type === 'dosbox-x' ? 'DOSBox-X' : 'DOSBox'}: ${dosboxInfo.path}`);

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

  // Launch DOSBox
  const proc = spawn([dosboxInfo.path, '-conf', configPath], {
    stdout: 'ignore',
    stderr: 'ignore',
  });

  // Wait for DOSBox to exit
  await proc.exited;
}

export async function launchWithCustomConfig(
  configPath: string
): Promise<void> {
  const dosboxInfo = findDosboxPath();

  if (!dosboxInfo) {
    throw new Error(`DOSBox를 찾을 수 없습니다.\n\n${getDosboxInstallGuide()}`);
  }

  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  const proc = spawn([dosboxInfo.path, '-conf', configPath], {
    stdout: 'ignore',
    stderr: 'ignore',
  });

  await proc.exited;
}

export function checkDosboxAvailable(): boolean {
  return findDosboxPath() !== null;
}

export function getDosboxType(): 'dosbox-x' | 'dosbox' | null {
  const info = findDosboxPath();
  return info ? info.type : null;
}

async function findCdImage(gameDir: string): Promise<string | null> {
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
  cpuCycles?: number,
  cpuType?: string
): Promise<string> {
  const configPath = join(gameDir, 'dosbox.conf');

  // Determine cycles setting
  let cyclesValue = 'auto';
  if (cpuCycles && cpuCycles > 0) {
    cyclesValue = String(cpuCycles);
  }

  // Determine CPU type
  const cpuTypeValue = cpuType || 'auto';

  // Check for CD image
  const cdImagePath = await findCdImage(gameDir);

  // Build autoexec section
  let autoexec = '@echo off\n';
  autoexec += `mount c "${gameDir}"\n`;

  // Mount CD image if found
  if (cdImagePath) {
    autoexec += `imgmount d "${cdImagePath}" -t cdrom\n`;
  }

  autoexec += 'c:\n';

  // Handle CD directory change if specified
  if (option.cd) {
    autoexec += `cd ${option.cd}\n`;
  }

  // Add executable
  autoexec += `${option.executable}\n`;
  autoexec += 'exit\n';

  const config = `
[sdl]
fullscreen=false
fulldouble=false
output=opengl

[dosbox]
machine=svga_s3

[cpu]
core=auto
cputype=${cpuTypeValue}
cycles=${cyclesValue}

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
${autoexec}`;

  await writeFile(configPath, config.trim());
  return configPath;
}

export async function launchGameWithConfig(
  gameDir: string,
  gameConfig: GameConfig,
  selectedOption: ExecutionOption
): Promise<void> {
  const dosboxInfo = findDosboxPath();

  if (!dosboxInfo) {
    throw new Error(`DOSBox를 찾을 수 없습니다.\n\n${getDosboxInstallGuide()}`);
  }

  console.log(`Using ${dosboxInfo.type === 'dosbox-x' ? 'DOSBox-X' : 'DOSBox'}: ${dosboxInfo.path}`);

  // Generate DOSBox config with parsed settings
  const configPath = await generateDosboxConfigWithOptions(
    gameDir,
    selectedOption,
    gameConfig.cpuCycles,
    gameConfig.cpuType
  );

  // Launch DOSBox
  const proc = spawn([dosboxInfo.path, '-conf', configPath], {
    stdout: 'ignore',
    stderr: 'ignore',
  });

  // Wait for DOSBox to exit
  await proc.exited;
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
  w98krInfo: W98krInfo
): Promise<string> {
  const configPath = join(gameDir, 'dosbox-w98kr.conf');

  // Parse W98KR disk geometry
  const w98krGeometry = parseDiskGeometry(w98krInfo.diskParams);

  // Check for CD image
  const cdImagePath = await findCdImage(gameDir);

  // Build autoexec section for booting Windows 98
  let autoexec = '@echo off\n';

  // Mount host folder containing Game.txt for auto-run setup
  if (option.optionPath) {
    const gameTxtDir = join(gameDir, 'DG_9xOpt', option.optionPath);
    if (existsSync(join(gameTxtDir, 'Game.txt'))) {
      autoexec += `MOUNT Y "${gameTxtDir}"\n`;
    }
  }

  // Mount Windows 98 as C: drive (IDE primary master)
  autoexec += `IMGMOUNT C "${w98krInfo.imagePath}" -size ${w98krGeometry.sectorSize},${w98krGeometry.sectorsPerTrack},${w98krGeometry.heads},${w98krGeometry.cylinders} -ide 1m\n`;

  // Copy Game.txt to C: drive for Autorun.exe
  if (option.optionPath) {
    const gameTxtDir = join(gameDir, 'DG_9xOpt', option.optionPath);
    if (existsSync(join(gameTxtDir, 'Game.txt'))) {
      autoexec += 'COPY Y:\\Game.txt C:\\Game.txt\n';
      autoexec += 'MOUNT -u Y\n';  // Unmount Y: after copy
    }
  }

  // Check if game uses disk image or folder-based
  if (option.diskGeometry && option.executable?.toLowerCase().endsWith('.img')) {
    // Disk image based game (e.g., W98KR games like 서풍의 광시곡)
    const gameGeometry = parseDiskGeometry(option.diskGeometry);
    const gameImagePath = join(gameDir, option.executable);
    autoexec += `IMGMOUNT D "${gameImagePath}" -size ${gameGeometry.sectorSize},${gameGeometry.sectorsPerTrack},${gameGeometry.heads},${gameGeometry.cylinders} -ide 1s\n`;
  } else {
    // Folder-based game (e.g., [WIN] options like 포가튼사가 에디터)
    autoexec += `MOUNT D "${gameDir}"\n`;
  }

  // Mount CD-ROM if available (IDE secondary master)
  if (cdImagePath) {
    autoexec += `IMGMOUNT E "${cdImagePath}" -t cdrom -ide 2m\n`;
  }

  // Boot from C: drive
  autoexec += 'BOOT C:\n';

  const config = `# DOSBox-X configuration for Windows 98 (W98KR)
# Auto-generated by doogie-cli

[sdl]
fullscreen=false
fulldouble=false
output=opengl
windowresolution=1024x768
autolock=true

[dosbox]
machine=svga_s3
memsize=256

[mouse]
mouse_emulation=integration

[cpu]
core=dynamic
cputype=pentium
cycles=max

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

[ide, primary]
enable=true

[ide, secondary]
enable=true

[parallel]
parallel1=disabled
parallel2=disabled
parallel3=disabled

[serial]
serial1=disabled
serial2=disabled
serial3=disabled
serial4=disabled

[autoexec]
${autoexec}`;

  await writeFile(configPath, config.trim());
  return configPath;
}

export async function launchW98krGame(
  gameDir: string,
  gameConfig: GameConfig,
  selectedOption: ExecutionOption
): Promise<void> {
  // Check if DOSBox-X is available (W98KR requires DOSBox-X)
  const dosboxInfo = findDosboxPath();

  if (!dosboxInfo) {
    throw new Error(`DOSBox-X를 찾을 수 없습니다.\n\nW98KR 게임은 DOSBox-X가 필요합니다.\n${getDosboxInstallGuide()}`);
  }

  if (dosboxInfo.type !== 'dosbox-x') {
    throw new Error('W98KR 게임은 DOSBox-X가 필요합니다. 기본 DOSBox는 Windows 98을 지원하지 않습니다.\n\nbrew install dosbox-x');
  }

  // For DOSBox-X, always use W98KR-x image
  const w98krName = 'W98KR-x';

  // Check if W98KR is installed
  const w98krInfo = await findW98krByName(w98krName);

  if (!w98krInfo) {
    throw new Error(`W98KR 이미지가 설치되어 있지 않습니다: ${w98krName}\n\nW98KR 이미지를 먼저 설치해주세요.`);
  }

  console.log(`Using DOSBox-X: ${dosboxInfo.path}`);
  console.log(`Using W98KR: ${w98krInfo.name} (${w98krInfo.version})`);
  if (selectedOption.optionPath) {
    console.log(`Auto-run option: ${selectedOption.optionPath}`);
  }

  // Generate DOSBox-X config for W98KR (includes Game.txt copy in autoexec)
  const configPath = await generateW98krConfig(gameDir, selectedOption, w98krInfo);

  // Launch DOSBox-X
  const proc = spawn([dosboxInfo.path, '-conf', configPath], {
    stdout: 'ignore',
    stderr: 'ignore',
  });

  // Wait for DOSBox-X to exit
  await proc.exited;
}

export function checkW98krAvailable(executerName: string): boolean {
  return isW98krInstalled(executerName);
}

export { isW98krInstalled, findW98krByName };
