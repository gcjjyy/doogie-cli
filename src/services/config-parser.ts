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

export interface ExecutionOption {
  title: string;
  cd?: string;
  executable: string;
  executer?: 'dosbox' | 'windows';
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

function parseAutoexecConf(content: string): ExecutionOption[] {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);
  const options: ExecutionOption[] = [];

  // Check if it's the new [SELECT] format
  if (lines[0] === '[SELECT]') {
    let currentOption: Partial<ExecutionOption> | null = null;

    for (const line of lines.slice(1)) {
      if (line === '[NEW]') {
        if (currentOption && currentOption.executable) {
          options.push(currentOption as ExecutionOption);
        }
        currentOption = { title: '', executable: '' };
      } else if (currentOption) {
        if (line.startsWith('TITLE:')) {
          currentOption.title = line.slice(6);
        } else if (line.startsWith('CD ')) {
          currentOption.cd = line.slice(3);
        } else if (line.startsWith('EXECUTER:')) {
          const executer = line.slice(9).toLowerCase();
          currentOption.executer = executer === 'windows' ? 'windows' : 'dosbox';
        } else if (line.match(/\.(exe|com|bat)$/i) || (!line.includes(':') && !line.startsWith('[') && line.length > 0)) {
          // Match .exe/.com/.bat OR any line that looks like a command (no colon, not a section header)
          currentOption.executable = line;
        }
      }
    }

    if (currentOption && currentOption.executable) {
      options.push(currentOption as ExecutionOption);
    }
  } else {
    // Old format: CD command + executable lines
    let cd: string | undefined;

    for (const line of lines) {
      // Skip addkey commands (keyboard macros for original launcher)
      if (line.toLowerCase().startsWith('addkey')) continue;
      // Skip comments
      if (line.startsWith('#') || line.startsWith(';')) continue;

      // Handle CD command
      if (line.toUpperCase().startsWith('CD ')) {
        cd = line.slice(3).trim();
        continue;
      }

      // Accept .exe/.com/.bat OR any simple command name
      if (line.match(/\.(exe|com|bat)$/i) || /^[a-zA-Z0-9_-]+$/.test(line)) {
        options.push({
          title: '게임 실행',
          executable: line,
          cd,
          executer: 'dosbox',
        });
        break; // Only take the first executable in old format
      }
    }
  }

  return options;
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
  const dosboxOptions = config.executionOptions.filter(opt => opt.executer !== 'windows');
  return dosboxOptions[0] || null;
}
