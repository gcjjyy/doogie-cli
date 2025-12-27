import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

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

export interface W98krConfig {
  w98krName?: string;      // W98KR image name (0|0)
  memsize?: number;        // Memory size in MB (7|3)
  cpuCore?: string;        // CPU core: dynamic, normal, simple (8|0)
  cpuType?: string;        // CPU type: pentium, 486, etc (8|1)
  cpuCycles?: string;      // CPU cycles: max, auto, or number (8|2)
  mouseEmulation?: string; // Mouse emulation: emu, integration (20|0)
}

export interface ExecutionOption {
  title: string;
  cd?: string;
  executable?: string;    // Optional - menu items with children may not have executable
  executer?: 'dosbox' | 'w98kr' | 'pcem' | 'windows';
  executerName?: string;  // Original executer name like 'W98KR_Daum_Final'
  cfgFile?: string;       // Config file for W98KR like '[KR98]D3D_Daum_Final.conf'
  diskGeometry?: string;  // Disk geometry like '512,63,64,703'
  w98krConfig?: W98krConfig;  // Parsed W98KR config
  optionPath?: string;    // DG_9xOpt path like '001/000' for nested options or '002' for flat options
  children?: ExecutionOption[];  // Nested menu options
}

export interface GameConfig {
  info: GameConfigInfo;
  executionOptions: ExecutionOption[];
  cpuCycles?: number;
  cpuType?: string;
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

function parseExecuterType(executerName: string): { type: 'dosbox' | 'w98kr' | 'pcem' | 'windows'; name: string } {
  const lower = executerName.toLowerCase();
  if (lower.startsWith('w98kr') || lower.startsWith('w9x')) {
    return { type: 'w98kr', name: executerName };
  } else if (lower.startsWith('pcem') || lower.includes('pcem')) {
    return { type: 'pcem', name: executerName };
  } else if (lower === 'windows' || lower.startsWith('win')) {
    return { type: 'windows', name: executerName };
  }
  return { type: 'dosbox', name: executerName };
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
  parentExecuter: 'dosbox' | 'w98kr' | 'pcem' | 'windows' = 'dosbox'
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
      // Special case: executable/geometry lines without |___ prefix belong to current option
      if (currentOption && (content.match(/\.(exe|com|bat|img)$/i) || content.match(/^\d+,\d+,\d+,\d+$/))) {
        if (content.match(/\.(exe|com|bat|img)$/i)) {
          currentOption.executable = content;
        } else if (content.match(/^\d+,\d+,\d+,\d+$/)) {
          currentOption.diskGeometry = content;
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
        options.push(currentOption as ExecutionOption);
      }
      itemIndex++;
      const optionPath = parentPath ? `${parentPath}/${formatIndex(itemIndex)}` : formatIndex(itemIndex);
      currentExecuter = content === '[WIN]' ? 'windows' : parentExecuter;
      currentOption = {
        title: '',
        executer: currentExecuter,
        optionPath,
      };
      i++;
      continue;
    }

    if (currentOption) {
      if (content.startsWith('TITLE:')) {
        currentOption.title = content.slice(6);
        // Detect executer from title
        const titleLower = currentOption.title.toLowerCase();
        if (titleLower.includes('pcem')) {
          currentExecuter = 'pcem';
          currentOption.executer = 'pcem';
        }
      } else if (content.startsWith('CD ')) {
        currentOption.cd = content.slice(3);
      } else if (content.startsWith('EXECUTER:')) {
        const execInfo = parseExecuterType(content.slice(9));
        currentOption.executer = execInfo.type;
        currentOption.executerName = execInfo.name;
        currentExecuter = execInfo.type;
      } else if (content.startsWith('CFGFILE:')) {
        currentOption.cfgFile = content.slice(8);
      } else if (content.match(/\.(exe|com|bat|img)$/i)) {
        currentOption.executable = content;
      } else if (content.match(/^\d+,\d+,\d+,\d+$/)) {
        currentOption.diskGeometry = content;
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

  // Old format: CD command + executable lines
  let cd: string | undefined;

  for (const line of lines) {
    if (line.toLowerCase().startsWith('addkey')) continue;
    if (line.startsWith('#') || line.startsWith(';')) continue;

    if (line.toUpperCase().startsWith('CD ')) {
      cd = line.slice(3).trim();
      continue;
    }

    if (line.match(/\.(exe|com|bat)$/i) || /^[a-zA-Z0-9_-]+$/.test(line)) {
      return [{
        title: '게임 실행',
        executable: line,
        cd,
        executer: 'dosbox',
        optionPath: '000',
      }];
    }
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
        const num = parseInt(value, 10);
        if (!isNaN(num)) config.memsize = num;
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

function parseEditConf(content: string): { cpuCycles?: number; cpuType?: string } {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);
  let cpuCycles: number | undefined;
  let cpuType: string | undefined;

  for (const line of lines) {
    if (line.startsWith('ver.')) continue;

    const parts = line.split('|');
    if (parts.length >= 3 && parts[0] && parts[1] && parts[2]) {
      // Pattern: 8|2|25000 might be CPU cycles
      const code = parts[0];
      const subCode = parts[1];
      const value = parts[2];

      if (code === '8' && subCode === '2') {
        const num = parseInt(value, 10);
        if (!isNaN(num)) {
          cpuCycles = num;
        }
      } else if (code === '8' && subCode === '1') {
        cpuType = value;
      }
    }
  }

  return { cpuCycles, cpuType };
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
      config.cpuCycles = editConfig.cpuCycles;
      config.cpuType = editConfig.cpuType;
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
