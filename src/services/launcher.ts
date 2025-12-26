import { spawn } from 'bun';
import { existsSync } from 'fs';
import { readdir, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { findDosboxPath, getDosboxInstallGuide } from '../utils/platform.ts';
import type { GameConfig, ExecutionOption } from './config-parser.ts';

export { getDosboxInstallGuide };
import type { LauncherConfig } from '../types/index.ts';

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
