import { spawn } from 'bun';
import { existsSync } from 'fs';
import { readdir, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { findDosboxPath, getDosboxInstallGuide } from '../utils/platform.ts';
import { getW98krXDir, getW95krXDir } from '../utils/paths.ts';
import { findW98krByName, findW95krByName, parseDiskGeometry, isW98krInstalled, isW95krInstalled } from './w98kr.ts';
import {
  getDefaultWin9xSettings,
  getDefaultDosboxSettings,
  mergeSettings,
  generateDosboxConf,
  type DosboxSettings,
} from './dosbox-settings.ts';
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
  w98krInfo: W98krInfo,
  resolution: { width: number; height: number; bitsPerPixel: number },
  customSettings?: DosboxSettings
): Promise<string> {
  const configPath = join(gameDir, 'dosbox-w98kr.conf');

  // Parse W98KR disk geometry
  const w98krGeometry = parseDiskGeometry(w98krInfo.diskParams);

  // Check for CD image
  const cdImagePath = await findCdImage(gameDir);

  // Determine host directory for Game.txt and DX.REG
  const hostDir = option.optionPath
    ? join(gameDir, 'DG_9xOpt', option.optionPath)
    : join(gameDir, 'DG_9xOpt', '000');

  // Ensure host directory exists and write DX.REG
  await mkdir(hostDir, { recursive: true });
  await writeDxRegToHostDir(hostDir, resolution.width, resolution.height, resolution.bitsPerPixel);

  // Build autoexec section for booting Windows 98
  let autoexec = '@echo off\n';

  // Mount host folder containing Game.txt and DX.REG
  autoexec += `MOUNT Y "${hostDir}"\n`;

  // Mount Windows 98 as C: drive (IDE primary master)
  autoexec += `IMGMOUNT C "${w98krInfo.imagePath}" -size ${w98krGeometry.sectorSize},${w98krGeometry.sectorsPerTrack},${w98krGeometry.heads},${w98krGeometry.cylinders} -ide 1m\n`;

  // Copy Game.txt and DX.REG to C: drive
  if (existsSync(join(hostDir, 'Game.txt'))) {
    autoexec += 'COPY Y:\\Game.txt C:\\Game.txt\n';
  }
  autoexec += 'COPY Y:\\DX.REG C:\\DX.REG\n';
  autoexec += 'MOUNT -u Y\n';  // Unmount Y: after copy

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

  // Get default Win9x settings and merge with custom settings from edit.conf
  let settings = getDefaultWin9xSettings();
  if (customSettings) {
    settings = mergeSettings(settings, customSettings);
  }

  // Generate conf file
  const config = generateDosboxConf(
    settings,
    autoexec,
    '# DOSBox-X configuration for Windows 98 (W98KR)\n# Auto-generated by doogie-cli'
  );

  await writeFile(configPath, config);
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

  // Use resolution from gameConfig if available, otherwise default to 640x480 8-bit
  const resolution = gameConfig.resolution || { width: 640, height: 480, bitsPerPixel: 8 };
  console.log(`Setting display: ${resolution.width}x${resolution.height} ${resolution.bitsPerPixel === 8 ? '256 colors' : `${resolution.bitsPerPixel}-bit`}`);

  // Generate DOSBox-X config for W98KR (writes DX.REG to host and copies via autoexec)
  // Pass dosboxSettings from edit.conf as custom settings
  const configPath = await generateW98krConfig(
    gameDir,
    selectedOption,
    w98krInfo,
    resolution,
    gameConfig.dosboxSettings
  );

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

export { isW98krInstalled, findW98krByName, isW95krInstalled, findW95krByName };

// DX.REG generation for Win9x display settings

interface Win9xDisplaySettings {
  bitsPerPixel: number;  // 8, 16, or 32
  width: number;         // 640, 800, 1024, etc.
  height: number;        // 480, 600, 768, etc.
  ddraw: boolean;
  d3d: boolean;
  threeDfx: boolean;
}

function generateDxReg(settings: Win9xDisplaySettings): string {
  const ddrawValue = settings.ddraw ? '00000000' : '00000001';
  const d3dValue = settings.d3d ? '00000000' : '00000001';

  return `REGEDIT4

[HKEY_LOCAL_MACHINE\\Config\\0001\\Display\\Settings]
"BitsPerPixel"="${settings.bitsPerPixel}"
"Resolution"="${settings.width},${settings.height}"

[HKEY_LOCAL_MACHINE\\Software\\Microsoft\\DirectDraw]
"EmulationOnly"=dword:${ddrawValue}

[HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Direct3D\\Drivers]
"SoftwareOnly"=dword:${d3dValue}

[HKEY_LOCAL_MACHINE\\Hardware\\DirectDrawDrivers\\3A0CFD01-9320-11cf-AC-A1-00-A0-24-13-C2-E2]
"Description"="3Dfx Interactive DirectX 5 Driver"
"DriverName"="mm3dfx"

[HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Multimedia\\MIDIMap]
"CurrentScheme"="기본"
"CurrentInstrument"="sbfm.drv\\x00\\x00\\x00\\x00"
"UseScheme"=dword:00000000
"AutoScheme"=dword:00000000
"ConfigureCount"=dword:00000003
"DriverList"=""

[HKEY_LOCAL_MACHINE\\System\\CurrentControlSet\\Services\\Class\\MEDIA\\0000\\Setting]
"MasterVolume"=hex:ff,ff,ff,ff
"VoiceVolume"=hex:ff,ff,ff,ff
"FMVolume"=hex:ff,ff,ff,ff
"CDVolume"=hex:80,80,80,80
`;
}

// Write DX.REG to host directory (will be copied to C: via DOSBox-X autoexec)
async function writeDxRegToHostDir(
  hostDir: string,
  width: number = 640,
  height: number = 480,
  bitsPerPixel: number = 8
): Promise<void> {
  const settings: Win9xDisplaySettings = {
    bitsPerPixel,
    width,
    height,
    ddraw: true,
    d3d: true,
    threeDfx: true,
  };

  const dxRegContent = generateDxReg(settings);
  const dxRegPath = join(hostDir, 'DX.REG');
  await writeFile(dxRegPath, dxRegContent, 'utf-8');
}

// W95KR (Windows 95) support functions

export async function generateW95krConfig(
  gameDir: string,
  option: ExecutionOption,
  w95krInfo: W98krInfo,
  resolution: { width: number; height: number; bitsPerPixel: number },
  customSettings?: DosboxSettings
): Promise<string> {
  const configPath = join(gameDir, 'dosbox-w95kr.conf');

  // Parse W95KR disk geometry
  const w95krGeometry = parseDiskGeometry(w95krInfo.diskParams);

  // Check for CD image
  const cdImagePath = await findCdImage(gameDir);

  // Determine host directory for Game.txt and DX.REG
  const hostDir = option.optionPath
    ? join(gameDir, 'DG_9xOpt', option.optionPath)
    : join(gameDir, 'DG_9xOpt', '000');

  // Ensure host directory exists and write DX.REG
  await mkdir(hostDir, { recursive: true });
  await writeDxRegToHostDir(hostDir, resolution.width, resolution.height, resolution.bitsPerPixel);

  // Build autoexec section for booting Windows 95
  let autoexec = '@echo off\n';

  // Mount host folder containing Game.txt and DX.REG
  autoexec += `MOUNT Y "${hostDir}"\n`;

  // Mount Windows 95 as C: drive (IDE primary master)
  autoexec += `IMGMOUNT C "${w95krInfo.imagePath}" -size ${w95krGeometry.sectorSize},${w95krGeometry.sectorsPerTrack},${w95krGeometry.heads},${w95krGeometry.cylinders} -ide 1m\n`;

  // Copy Game.txt and DX.REG to C: drive
  if (existsSync(join(hostDir, 'Game.txt'))) {
    autoexec += 'COPY Y:\\Game.txt C:\\Game.txt\n';
  }
  autoexec += 'COPY Y:\\DX.REG C:\\DX.REG\n';
  autoexec += 'MOUNT -u Y\n';  // Unmount Y: after copy

  // Check if game uses disk image or folder-based
  if (option.diskGeometry && option.executable?.toLowerCase().endsWith('.img')) {
    // Disk image based game
    const gameGeometry = parseDiskGeometry(option.diskGeometry);
    const gameImagePath = join(gameDir, option.executable);
    autoexec += `IMGMOUNT D "${gameImagePath}" -size ${gameGeometry.sectorSize},${gameGeometry.sectorsPerTrack},${gameGeometry.heads},${gameGeometry.cylinders} -ide 1s\n`;
  } else {
    // Folder-based game
    autoexec += `MOUNT D "${gameDir}"\n`;
  }

  // Mount CD-ROM if available (IDE secondary master)
  if (cdImagePath) {
    autoexec += `IMGMOUNT E "${cdImagePath}" -t cdrom -ide 2m\n`;
  }

  // Boot from C: drive
  autoexec += 'BOOT C:\n';

  // Get default Win9x settings and merge with custom settings from edit.conf
  let settings = getDefaultWin9xSettings();
  // Add W95-specific vmemsize
  if (settings.dosbox) {
    settings.dosbox.vmemsize = '8';
  }
  if (customSettings) {
    settings = mergeSettings(settings, customSettings);
  }

  // Generate conf file
  const config = generateDosboxConf(
    settings,
    autoexec,
    '# DOSBox-X configuration for Windows 95 (W95KR)\n# Auto-generated by doogie-cli'
  );

  await writeFile(configPath, config);
  return configPath;
}

export async function launchW95krGame(
  gameDir: string,
  gameConfig: GameConfig,
  selectedOption: ExecutionOption
): Promise<void> {
  // Check if DOSBox-X is available (W95KR requires DOSBox-X)
  const dosboxInfo = findDosboxPath();

  if (!dosboxInfo) {
    throw new Error(`DOSBox-X를 찾을 수 없습니다.\n\nW95KR 게임은 DOSBox-X가 필요합니다.\n${getDosboxInstallGuide()}`);
  }

  if (dosboxInfo.type !== 'dosbox-x') {
    throw new Error('W95KR 게임은 DOSBox-X가 필요합니다. 기본 DOSBox는 Windows 95를 지원하지 않습니다.\n\nbrew install dosbox-x');
  }

  // For DOSBox-X, always use W95KR-x image
  const w95krName = 'W95KR-x';

  // Check if W95KR is installed
  const w95krInfo = await findW95krByName(w95krName);

  if (!w95krInfo) {
    throw new Error(`W95KR 이미지가 설치되어 있지 않습니다: ${w95krName}\n\nW95KR 이미지를 먼저 설치해주세요.`);
  }

  console.log(`Using DOSBox-X: ${dosboxInfo.path}`);
  console.log(`Using W95KR: ${w95krInfo.name} (${w95krInfo.version})`);
  if (selectedOption.optionPath) {
    console.log(`Auto-run option: ${selectedOption.optionPath}`);
  }

  // Use resolution from gameConfig if available, otherwise default to 640x480 8-bit
  const resolution = gameConfig.resolution || { width: 640, height: 480, bitsPerPixel: 8 };
  console.log(`Setting display: ${resolution.width}x${resolution.height} ${resolution.bitsPerPixel === 8 ? '256 colors' : `${resolution.bitsPerPixel}-bit`}`);

  // Generate DOSBox-X config for W95KR (writes DX.REG to host and copies via autoexec)
  // Pass dosboxSettings from edit.conf as custom settings
  const configPath = await generateW95krConfig(
    gameDir,
    selectedOption,
    w95krInfo,
    resolution,
    gameConfig.dosboxSettings
  );

  // Launch DOSBox-X
  const proc = spawn([dosboxInfo.path, '-conf', configPath], {
    stdout: 'ignore',
    stderr: 'ignore',
  });

  // Wait for DOSBox-X to exit
  await proc.exited;
}
