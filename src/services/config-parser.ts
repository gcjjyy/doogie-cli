import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import {
  parseEditConf as parseEditConfEntries,
  parseEditConfVersion,
  isLegacyVersion,
  extractWin9xSettings,
  getExecuterType,
} from './dosbox-settings.ts';

// EUC-KR is a valid encoding label for TextDecoder
// https://encoding.spec.whatwg.org/#names-and-labels
function createEucKrDecoder(): TextDecoder {
  // @ts-expect-error: 'euc-kr' is a valid encoding label
  return new TextDecoder('euc-kr');
}

const eucKrDecoder = createEucKrDecoder();

async function readEucKrFile(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  try {
    return eucKrDecoder.decode(buffer);
  } catch {
    // Fallback to UTF-8 if EUC-KR decoding fails
    return new TextDecoder('utf-8').decode(buffer);
  }
}

export interface GameConfigInfo {
  name: string;
  nameEn?: string;
  genre: string;
  genreKr?: string;
  developer?: string;
  language?: string;
  year?: string;
  updateLog?: string;
}

export interface Win9xDisplayOptions {
  vgaDriver?: string;      // VGA driver: 'new', 'old', etc
  resolution?: string;     // Resolution like '640x8' (8=8-bit, 16=16-bit, 32=32-bit)
  bitsPerPixel?: number;   // Derived: 8, 16, or 32
  width?: number;          // Derived: 640, 800, 1024, etc
  ddraw?: boolean;         // DirectDraw acceleration
  d3d?: boolean;           // Direct3D acceleration
  threeDfx?: boolean;      // 3DFX Glide acceleration
  midi?: string;           // MIDI driver: 'SBFM', 'MPU', etc
}

export interface W98krConfig {
  w98krName?: string;      // W98KR image name (0|0)
  memsize?: number;        // Memory size in MB (7|3)
  cpuCore?: string;        // CPU core: dynamic, normal, simple (8|0)
  cpuType?: string;        // CPU type: pentium, 486, etc (8|1)
  cpuCycles?: string;      // CPU cycles: max, auto, or number (8|2)
  mouseEmulation?: string; // Mouse emulation: emu, integration (20|0)
  displayOptions?: Win9xDisplayOptions;  // Win9x display options
}

export interface ExecutionOption {
  title: string;
  commands: string[];     // All commands to execute (tb, tb/k, CD xxx, GAME.EXE, etc.)
  executer?: 'dosbox' | 'w98kr' | 'w95kr' | 'pcem' | 'windows';
  executerName?: string;  // Original executer name like 'W98KR_Daum_Final'
  cfgFile?: string;       // Config file for W98KR like '[KR98]D3D_Daum_Final.conf'
  diskGeometry?: string;  // Disk geometry like '512,63,64,703'
  w98krConfig?: W98krConfig;  // Parsed W98KR config
  optionPath?: string;    // DG_9xOpt path like '001/000' for nested options or '002' for flat options
  children?: ExecutionOption[];  // Nested menu options
  addkeyCommands?: string[];  // 두기 런처 키 매크로 명령어 (DOSBox-X 전용)
}

export interface GameConfig {
  info: GameConfigInfo;
  executionOptions: ExecutionOption[];
  executerName?: string;  // edit.conf 0|0 값 (예: 0.74_Daum, W98KR_Daum_Final)
  resolution?: Win9xResolution;  // Win9x display resolution from edit.conf
}

function parseInfoTxt(content: string): { name: string; nameEn?: string; updateLog?: string } {
  const lines = content.split('\n');
  const firstLine = lines[0]?.trim() ?? '';

  // Try to split Korean and English names
  // The separator might be \x03 (ETX control character) or direct concatenation
  let name = firstLine;
  let nameEn: string | undefined;

  // Check for ETX separator first
  if (firstLine.includes('\x03')) {
    const parts = firstLine.split('\x03');
    name = parts[0]?.trim() ?? firstLine;
    nameEn = parts[1]?.trim();
  } else {
    // Look for common patterns like "한글명The English Name"
    const match = firstLine.match(/^(.+?)(The |[A-Z][a-z]+\s)/);
    if (match && match[1]) {
      name = match[1].trim();
      nameEn = firstLine.slice(match[1].length).trim();
    }
  }

  const updateLog = lines.slice(1).join('\n').trim() || undefined;

  return { name, nameEn, updateLog };
}

function parseExtraInfoTxt(content: string): { developer?: string; language?: string; year?: string } {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);

  return {
    developer: lines[0] || undefined,
    language: lines[1] || undefined,
    year: lines[2] || undefined,
  };
}

function parseExecuterType(executerName: string): { type: 'dosbox' | 'w98kr' | 'w95kr' | 'pcem' | 'windows'; name: string } {
  const lower = executerName.toLowerCase();
  if (lower.startsWith('w95kr') || lower.includes('w95')) {
    return { type: 'w95kr', name: executerName };
  } else if (lower.startsWith('w98kr') || lower.startsWith('w9x')) {
    return { type: 'w98kr', name: executerName };
  } else if (lower.startsWith('pcem') || lower.includes('pcem')) {
    return { type: 'pcem', name: executerName };
  } else if (lower === 'windows' || lower.startsWith('win')) {
    return { type: 'windows', name: executerName };
  }
  return { type: 'dosbox', name: executerName };
}

// Parse CFGFILE to determine Windows version (KR95 or KR98)
function parseCfgFileVersion(cfgFile: string): 'w95kr' | 'w98kr' | null {
  if (cfgFile.includes('[KR95]')) {
    return 'w95kr';
  } else if (cfgFile.includes('[KR98]')) {
    return 'w98kr';
  }
  return null;
}

function formatIndex(n: number): string {
  return n.toString().padStart(3, '0');
}

interface ParsedLine {
  depth: number;
  content: string;
}

function parseLinesToDepth(lines: string[]): ParsedLine[] {
  return lines.map(line => {
    let depth = 0;
    let content = line;
    while (content.startsWith('|___')) {
      depth++;
      content = content.slice(4);
    }
    return { depth, content: content.trim() };
  });
}

function parseMenuItems(
  parsedLines: ParsedLine[],
  startIdx: number,
  targetDepth: number,
  parentPath: string,
  parentExecuter: 'dosbox' | 'w98kr' | 'w95kr' | 'pcem' | 'windows' = 'dosbox'
): { options: ExecutionOption[]; endIdx: number } {
  const options: ExecutionOption[] = [];
  let i = startIdx;
  let itemIndex = -1;
  let currentOption: Partial<ExecutionOption> | null = null;
  let currentExecuter = parentExecuter;

  while (i < parsedLines.length) {
    const { depth, content } = parsedLines[i]!;

    // If we hit a line at a lower depth
    if (depth < targetDepth) {
      // Special case: lines without |___ prefix belong to current option (commands or geometry)
      const isGeometry = content.match(/^\d+,\d+,\d+,\d+$/);
      if (currentOption) {
        if (isGeometry) {
          currentOption.diskGeometry = content;
        } else if (content.trim()) {
          // Any other non-empty line is a command
          if (!currentOption.commands) {
            currentOption.commands = [];
          }
          currentOption.commands.push(content);
        }
        i++;
        continue;
      }
      // Otherwise we're done with this level
      break;
    }

    // Skip lines at deeper depths (they'll be handled recursively)
    if (depth > targetDepth) {
      i++;
      continue;
    }

    // Process lines at our target depth
    if (content === '[SELECT]') {
      // Start of menu - skip
      i++;
      continue;
    }

    if (content === '[NEW]' || content === '[WIN]') {
      // Save previous option
      if (currentOption && currentOption.title) {
        // Check if it's a Windows game based on commands containing .img
        const hasImgCommand = currentOption.commands?.some(cmd => cmd.toLowerCase().endsWith('.img'));
        if (hasImgCommand && currentOption.diskGeometry && currentOption.executer === 'dosbox') {
          currentOption.executer = 'w95kr';
        }
        if (!currentOption.commands) {
          currentOption.commands = [];
        }
        options.push(currentOption as ExecutionOption);
      }
      itemIndex++;
      const optionPath = parentPath ? `${parentPath}/${formatIndex(itemIndex)}` : formatIndex(itemIndex);
      currentExecuter = content === '[WIN]' ? 'windows' : parentExecuter;
      currentOption = {
        title: '',
        commands: [],
        executer: currentExecuter,
        optionPath,
      };
      i++;
      continue;
    }

    if (currentOption) {
      // Collect addkey commands (두기 런처 키 매크로 명령어, DOSBox-X 전용)
      if (content.toLowerCase().startsWith('addkey')) {
        if (!currentOption.addkeyCommands) {
          currentOption.addkeyCommands = [];
        }
        currentOption.addkeyCommands.push(content);
        i++;
        continue;
      }
      // Parse metadata
      if (content.startsWith('TITLE:')) {
        currentOption.title = content.slice(6);
        // Detect executer from title
        const titleLower = currentOption.title.toLowerCase();
        if (titleLower.includes('pcem')) {
          currentExecuter = 'pcem';
          currentOption.executer = 'pcem';
        }
      } else if (content.startsWith('EXECUTER:')) {
        const execInfo = parseExecuterType(content.slice(9));
        currentOption.executer = execInfo.type;
        currentOption.executerName = execInfo.name;
        currentExecuter = execInfo.type;
      } else if (content.startsWith('CFGFILE:')) {
        currentOption.cfgFile = content.slice(8);
        // Parse Windows version from CFGFILE
        const winVersion = parseCfgFileVersion(currentOption.cfgFile);
        if (winVersion) {
          currentOption.executer = winVersion;
          currentExecuter = winVersion;
        }
      } else if (content.match(/^\d+,\d+,\d+,\d+$/)) {
        // Disk geometry for Windows games
        currentOption.diskGeometry = content;
      } else if (content.trim()) {
        // All other non-empty lines are commands (tb, tb/k, CD xxx, GAME.EXE, etc.)
        if (!currentOption.commands) {
          currentOption.commands = [];
        }
        currentOption.commands.push(content);
      }

      // Check if next line starts a nested [SELECT] at depth+1
      if (i + 1 < parsedLines.length) {
        const nextLine = parsedLines[i + 1]!;
        if (nextLine.depth === targetDepth + 1 && nextLine.content === '[SELECT]') {
          // Parse children recursively
          const result = parseMenuItems(
            parsedLines,
            i + 2,  // Skip the [SELECT]
            targetDepth + 1,
            currentOption.optionPath || '',
            currentExecuter
          );
          currentOption.children = result.options;
          i = result.endIdx;
          continue;
        }
      }
    }

    i++;
  }

  // Save last option
  if (currentOption && currentOption.title) {
    // Check if it's a Windows game based on commands containing .img
    const hasImgCommand = currentOption.commands?.some(cmd => cmd.toLowerCase().endsWith('.img'));
    if (hasImgCommand && currentOption.diskGeometry && currentOption.executer === 'dosbox') {
      currentOption.executer = 'w95kr';
    }
    if (!currentOption.commands) {
      currentOption.commands = [];
    }
    options.push(currentOption as ExecutionOption);
  }

  return { options, endIdx: i };
}

function parseAutoexecConf(content: string): ExecutionOption[] {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);

  // Check if it's the new [SELECT] format
  if (lines[0] === '[SELECT]') {
    const parsedLines = parseLinesToDepth(lines);
    const result = parseMenuItems(parsedLines, 1, 0, '');
    return result.options;
  }

  // Old format: collect all commands (excluding addkey which is handled separately)
  const commands: string[] = [];
  const addkeyCommands: string[] = [];
  let diskGeometry: string | undefined;

  for (const line of lines) {
    // Collect addkey commands (두기 런처 키 매크로 명령어, DOSBox-X 전용)
    if (line.toLowerCase().startsWith('addkey')) {
      addkeyCommands.push(line);
      continue;
    }
    if (line.startsWith('#') || line.startsWith(';')) continue;

    // Check for disk geometry pattern (e.g., 512,63,8,589)
    if (line.match(/^\d+,\d+,\d+,\d+$/)) {
      diskGeometry = line;
      continue;
    }

    // All other non-comment lines are commands
    commands.push(line);
  }

  if (commands.length > 0) {
    return [{
      title: '게임 실행',
      commands,
      executer: 'dosbox',
      optionPath: '000',
      diskGeometry,
      addkeyCommands: addkeyCommands.length > 0 ? addkeyCommands : undefined,
    }];
  }

  return [];
}

function parseW98krConf(content: string): W98krConfig {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);
  const config: W98krConfig = {};

  for (const line of lines) {
    if (line.startsWith('ver.')) continue;

    const parts = line.split('|');
    if (parts.length >= 3 && parts[0] && parts[1] && parts[2]) {
      const code = parts[0];
      const subCode = parts[1];
      const value = parts[2];

      if (code === '0' && subCode === '0') {
        config.w98krName = value;
      } else if (code === '7' && subCode === '3') {
        // 7|3 = DOSBox memory size in MB
        const num = parseInt(value, 10);
        if (!isNaN(num)) {
          config.memsize = num;
        }
      } else if (code === '8' && subCode === '0') {
        config.cpuCore = value;
      } else if (code === '8' && subCode === '1') {
        config.cpuType = value;
      } else if (code === '8' && subCode === '2') {
        config.cpuCycles = value;
      } else if (code === '20' && subCode === '0') {
        config.mouseEmulation = value;
      }
    }
  }

  return config;
}

export interface Win9xResolution {
  width: number;
  height: number;
  bitsPerPixel: number;
}

function parseResolutionString(resStr: string): Win9xResolution | null {
  // Format: {width}x{bits} e.g., "640x8", "800x16", "1024x32"
  const match = resStr.match(/^(\d+)x(\d+)$/);
  if (!match) return null;

  const width = parseInt(match[1]!, 10);
  const bits = parseInt(match[2]!, 10);

  // Derive height from width (standard resolutions)
  let height: number;
  switch (width) {
    case 640: height = 480; break;
    case 800: height = 600; break;
    case 1024: height = 768; break;
    case 1152: height = 864; break;
    case 1280: height = 1024; break;
    case 1600: height = 1200; break;
    default: height = 480; break;
  }

  return { width, height, bitsPerPixel: bits };
}

interface ParsedEditConf {
  executerName?: string;
  resolution?: Win9xResolution;
}

function parseEditConf(content: string): ParsedEditConf {
  // Detect version and use appropriate mapping
  const version = parseEditConfVersion(content);
  const isLegacy = isLegacyVersion(version);

  // Use new index-based parser with version-aware mapping
  const entries = parseEditConfEntries(content);
  const win9xSettings = extractWin9xSettings(entries, isLegacy);
  const executerName = getExecuterType(entries);

  // Convert win9xSettings.resolution to Win9xResolution format
  const resolution: Win9xResolution | undefined = win9xSettings.resolution
    ? {
        width: win9xSettings.resolution.width,
        height: win9xSettings.resolution.height,
        bitsPerPixel: win9xSettings.resolution.bitsPerPixel,
      }
    : undefined;

  return {
    executerName: executerName || undefined,
    resolution,
  };
}

export async function parseGameConfig(gameDir: string): Promise<GameConfig | null> {
  const dosboxDir = join(gameDir, 'Config', 'DosBox');

  try {
    const files = await readdir(dosboxDir);

    // Initialize config
    const config: GameConfig = {
      info: {
        name: 'Unknown Game',
        genre: 'Unknown',
      },
      executionOptions: [],
    };

    // Parse info.txt
    if (files.includes('info.txt')) {
      const content = await readEucKrFile(join(dosboxDir, 'info.txt'));
      const info = parseInfoTxt(content);
      config.info.name = info.name;
      config.info.nameEn = info.nameEn;
      config.info.updateLog = info.updateLog;
    }

    // Parse GenreE.dat
    if (files.includes('GenreE.dat')) {
      const content = await readEucKrFile(join(dosboxDir, 'GenreE.dat'));
      config.info.genre = content.trim();
    }

    // Parse GenreK.dat
    if (files.includes('GenreK.dat')) {
      const content = await readEucKrFile(join(dosboxDir, 'GenreK.dat'));
      config.info.genreKr = content.trim();
    }

    // Parse ExtraInfo.txt
    if (files.includes('ExtraInfo.txt')) {
      const content = await readEucKrFile(join(dosboxDir, 'ExtraInfo.txt'));
      const extra = parseExtraInfoTxt(content);
      config.info.developer = extra.developer;
      config.info.language = extra.language;
      config.info.year = extra.year;
    }

    // Parse autoexec.conf
    if (files.includes('autoexec.conf')) {
      const content = await readEucKrFile(join(dosboxDir, 'autoexec.conf'));
      config.executionOptions = parseAutoexecConf(content);
    }

    // Parse edit.conf
    if (files.includes('edit.conf')) {
      const content = await readEucKrFile(join(dosboxDir, 'edit.conf'));
      const editConfig = parseEditConf(content);
      config.executerName = editConfig.executerName;
      config.resolution = editConfig.resolution;

      // Update executer based on executerName for options that use image.img
      if (editConfig.executerName) {
        const isW95 = editConfig.executerName.toLowerCase().includes('w95');
        const isW98 = editConfig.executerName.toLowerCase().includes('w98');
        const correctExecuter = isW95 ? 'w95kr' : isW98 ? 'w98kr' : null;

        if (correctExecuter) {
          // Update all options that have image.img + geometry (Windows games)
          const updateExecuter = (options: ExecutionOption[]) => {
            for (const opt of options) {
              const hasImgCommand = opt.commands.some(cmd => cmd.toLowerCase().endsWith('.img'));
              if (hasImgCommand && opt.diskGeometry) {
                opt.executer = correctExecuter;
                opt.executerName = editConfig.executerName;  // Set the original executer name
              }
              if (opt.children) {
                updateExecuter(opt.children);
              }
            }
          };
          updateExecuter(config.executionOptions);
        }
      }
    }

    return config;
  } catch (error) {
    console.error('Failed to parse game config:', error);
    return null;
  }
}

export function getFirstDosboxOption(config: GameConfig): ExecutionOption | null {
  // Prefer pure dosbox options over w98kr/pcem
  const dosboxOptions = config.executionOptions.filter(opt => opt.executer === 'dosbox');
  if (dosboxOptions.length > 0 && dosboxOptions[0]) {
    return dosboxOptions[0];
  }
  // If no dosbox options, try w98kr
  const w98krOptions = config.executionOptions.filter(opt => opt.executer === 'w98kr');
  if (w98krOptions.length > 0 && w98krOptions[0]) {
    return w98krOptions[0];
  }
  // Fall back to any non-windows option
  const anyOptions = config.executionOptions.filter(opt => opt.executer !== 'windows' && opt.executer !== 'pcem');
  return anyOptions[0] ?? null;
}

export function getW98krOptions(config: GameConfig): ExecutionOption[] {
  return config.executionOptions.filter(opt => opt.executer === 'w98kr');
}

export function requiresW98kr(config: GameConfig): boolean {
  // Check if all runnable options require W98KR
  const runnableOptions = config.executionOptions.filter(opt => opt.executer !== 'windows' && opt.executer !== 'pcem');
  return runnableOptions.length > 0 && runnableOptions.every(opt => opt.executer === 'w98kr');
}
