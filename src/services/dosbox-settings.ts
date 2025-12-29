/**
 * DOSBox 설정 인덱스 시스템
 *
 * 두기 런처의 Option.dat 기반 섹션/항목 인덱스 매핑
 * edit.conf 형식: 섹션인덱스|항목인덱스|값
 *
 * 주의: 두기 런처 버전에 따라 인덱싱이 다름
 * - ver.23.xx (신버전): Option.dat 기반 인덱싱
 * - ver.20.xx (구버전): 다른 인덱싱 체계
 */

// 신버전 매핑은 option-dat.ts에서 import (Option.dat 기반 완전한 매핑)
import {
  SECTION_NAMES,
  SECTION_ITEMS as OPTION_DAT_SECTION_ITEMS,
} from '../data/mapper/option-dat.ts';

// 하위 호환성을 위해 re-export
export const SECTION_INDEX = SECTION_NAMES;
export const SECTION_ITEMS = OPTION_DAT_SECTION_ITEMS;

// 구버전 (ver.20.xx 및 ver.21.xx) 섹션 인덱스 매핑
// 주의: 섹션 21은 Win9x 해상도 전용 - DOSBox 설정으로 변환하면 안됨
export const SECTION_INDEX_LEGACY: Record<number, string> = {
  0: 'default',
  1: 'win9x',      // win9x 전용 설정 (9xres, 9xmpu 등) - DOSBox conf로 변환 안함
  2: 'pcem',
  3: 'dosbox',     // 신버전에서는 7
  6: 'cpu',        // 신버전에서는 8
  19: 'glide',     // 신버전에서는 20
  // 섹션 21은 정의하지 않음 - extractWin9xSettings에서 해상도로만 처리
  32: 'ide, secondary',  // cd-rom insertion delay가 여기에 속함
};

// 구버전 섹션별 항목 인덱스 매핑
// 주의: 섹션 21은 매핑하지 않음 (21|1|800x8 같은 해상도 설정은 extractWin9xSettings에서만 처리)
export const SECTION_ITEMS_LEGACY: Record<number, Record<number, string>> = {
  0: {
    0: 'version',  // 실행기
  },
  1: {  // win9x section - DOSBox conf로 변환되지 않음 (settingsToConfString에서 skip)
    0: '9xdrv',
    1: '9xres',
    2: '9xddraw',
    3: '9xd3d',
    4: '9x3dfx',
    5: '9xmpu',
    6: '9xmaster',
    7: '9xwave',
    8: '9xmidi',
    9: '9xcd',
    10: '9xboot',
  },
  3: {  // dosbox section
    1: 'machine',
    3: 'memsize',
    4: 'vmemsize',
  },
  6: {  // cpu section
    0: 'core',
    1: 'cputype',
    2: 'cycles',
    5: 'isapnpbios',
    11: 'apmbios',
  },
  19: {  // glide section
    0: 'glide',
  },
  // 섹션 21 (voodoo) 매핑 제거 - 21|1|800x8가 voodoo.glide로 변환되는 버그 방지
  32: {  // ethernet section
    11: 'cd-rom insertion delay',
  },
};

/**
 * edit.conf 버전 파싱
 * 형식: ver.YY.MM.DD
 * 반환: 버전 숫자 (예: 230110 for ver.23.01.10)
 */
export function parseEditConfVersion(content: string): number {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('ver.')) {
      // ver.23.01.10 -> 230110
      const versionStr = trimmed.slice(4).replace(/\./g, '');
      const version = parseInt(versionStr, 10);
      return isNaN(version) ? 0 : version;
    }
  }
  return 0;
}

/**
 * 버전에 따라 구버전/신버전 판단
 * ver.22.xx 이상이면 신버전 (Option.dat 기반)
 */
export function isLegacyVersion(version: number): boolean {
  // 220000 = ver.22.00.00
  return version < 220000;
}

// DOSBox 설정 값 타입
export interface DosboxSettings {
  [section: string]: {
    [key: string]: string | number | boolean;
  };
}

// edit.conf 설정 항목
export interface EditConfEntry {
  section: number;
  item: number;
  value: string;
}

/**
 * edit.conf 파일 파싱
 * 형식: 섹션인덱스|항목인덱스|값
 */
export function parseEditConf(content: string): EditConfEntry[] {
  const entries: EditConfEntry[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // 버전 라인 스킵
    if (trimmed.startsWith('ver.') || trimmed === '') {
      continue;
    }

    // 섹션|항목|값 형식 파싱
    const parts = trimmed.split('|');
    if (parts.length >= 3 && parts[0] !== undefined && parts[1] !== undefined) {
      const section = parseInt(parts[0], 10);
      const item = parseInt(parts[1], 10);
      const value = parts.slice(2).join('|'); // 값에 | 가 포함될 수 있음

      if (!isNaN(section) && !isNaN(item)) {
        entries.push({ section, item, value });
      }
    }
  }

  return entries;
}

/**
 * edit.conf 항목을 DOSBox 설정으로 변환
 * @param entries 파싱된 edit.conf 항목들
 * @param isLegacy 구버전(ver.20.xx) 여부
 */
export function convertEditConfToSettings(entries: EditConfEntry[], isLegacy: boolean = false): DosboxSettings {
  const settings: DosboxSettings = {};

  // 버전에 따른 매핑 선택
  const sectionIndex = isLegacy ? SECTION_INDEX_LEGACY : SECTION_INDEX;
  const sectionItems = isLegacy ? SECTION_ITEMS_LEGACY : SECTION_ITEMS;

  for (const entry of entries) {
    const sectionName = sectionIndex[entry.section];
    const itemsMap = sectionItems[entry.section];

    if (!sectionName || !itemsMap) {
      continue; // 알 수 없는 섹션
    }

    const keyName = itemsMap[entry.item];
    if (!keyName) {
      continue; // 알 수 없는 항목
    }

    // 섹션 초기화
    if (!settings[sectionName]) {
      settings[sectionName] = {};
    }

    settings[sectionName][keyName] = entry.value;
  }

  return settings;
}

/**
 * 기본 설정에 특화 설정을 병합
 */
export function mergeSettings(base: DosboxSettings, override: DosboxSettings): DosboxSettings {
  const merged: DosboxSettings = JSON.parse(JSON.stringify(base)); // deep copy

  for (const [section, items] of Object.entries(override)) {
    if (!merged[section]) {
      merged[section] = {};
    }
    for (const [key, value] of Object.entries(items)) {
      merged[section][key] = value;
    }
  }

  return merged;
}

/**
 * Win9x 설정 추출 (DX.REG 생성용)
 */
export interface Win9xSettings {
  resolution: { width: number; height: number; bitsPerPixel: number };
  ddraw: boolean;
  d3d: boolean;
  threeDfx: boolean;
  midiDriver: 'SBFM' | 'MPU401';
  volumes: {
    master: number;
    wave: number;
    midi: number;
    cd: number;
  };
}

/**
 * 9xres 값 파싱 (예: "640x8" → { width: 640, height: 480, bitsPerPixel: 8 })
 */
export function parse9xResolution(value: string): { width: number; height: number; bitsPerPixel: number } {
  const match = value.match(/(\d+)x(\d+)/);
  if (!match || !match[1] || !match[2]) {
    return { width: 640, height: 480, bitsPerPixel: 8 };
  }

  const width = parseInt(match[1], 10);
  const bitsPerPixel = parseInt(match[2], 10);

  // 높이는 너비에 따라 결정 (4:3 비율)
  const heightMap: Record<number, number> = {
    640: 480,
    800: 600,
    1024: 768,
    1152: 864,
    1280: 960,
    1600: 1200,
  };

  const height = heightMap[width] || 480;

  return { width, height, bitsPerPixel };
}

/**
 * edit.conf에서 Win9x 설정 추출
 * @param entries 파싱된 edit.conf 항목들
 * @param isLegacy 구버전(ver.20.xx) 여부
 */
export function extractWin9xSettings(entries: EditConfEntry[], isLegacy: boolean = false): Win9xSettings {
  const defaults: Win9xSettings = {
    resolution: { width: 640, height: 480, bitsPerPixel: 8 },
    ddraw: true,
    d3d: true,
    threeDfx: true,
    midiDriver: 'SBFM',
    volumes: { master: 255, wave: 255, midi: 255, cd: 128 },
  };

  for (const entry of entries) {
    // 구버전에서는 섹션 21의 항목 1이 해상도
    if (isLegacy && entry.section === 21 && entry.item === 1) {
      defaults.resolution = parse9xResolution(entry.value);
      continue;
    }

    if (entry.section !== 1) continue; // win9x section

    switch (entry.item) {
      case 1: // 9xres
        defaults.resolution = parse9xResolution(entry.value);
        break;
      case 2: // 9xddraw
        defaults.ddraw = entry.value === 'true';
        break;
      case 3: // 9xd3d
        defaults.d3d = entry.value === 'true';
        break;
      case 4: // 9x3dfx
        defaults.threeDfx = entry.value === 'true';
        break;
      case 5: // 9xmpu
        defaults.midiDriver = entry.value === 'MPU401' ? 'MPU401' : 'SBFM';
        break;
      case 6: // 9xmaster
        defaults.volumes.master = parseInt(entry.value, 10) || 255;
        break;
      case 7: // 9xwave
        defaults.volumes.wave = parseInt(entry.value, 10) || 255;
        break;
      case 8: // 9xmidi
        defaults.volumes.midi = parseInt(entry.value, 10) || 255;
        break;
      case 9: // 9xcd
        defaults.volumes.cd = parseInt(entry.value, 10) || 128;
        break;
    }
  }

  return defaults;
}

/**
 * 실행기 타입 확인
 */
export function getExecuterType(entries: EditConfEntry[]): string | null {
  for (const entry of entries) {
    if (entry.section === 0 && entry.item === 0) {
      return entry.value;
    }
  }
  return null;
}

/**
 * DosboxSettings 객체를 DOSBox conf 문자열로 변환
 */
export function settingsToConfString(settings: DosboxSettings): string {
  const lines: string[] = [];

  for (const [section, items] of Object.entries(settings)) {
    // Skip special sections (edit.conf에서 변환된 섹션들 중 DOSBox conf에 직접 쓰면 안되는 것들)
    // glide: edit.conf의 19|0|emu가 [glide] glide=emu로 변환되는데, 이미 [voodoo]에 glide 설정이 있음
    if (section === 'default' || section === 'win9x' || section === 'pcem' || section === 'separator' || section === 'glide') {
      continue;
    }

    lines.push(`[${section}]`);
    for (const [key, value] of Object.entries(items)) {
      lines.push(`${key}=${value}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * 기본 W98KR/W95KR 설정
 * v1.0.0에서 정상 동작하던 설정
 */
export function getDefaultWin9xSettings(): DosboxSettings {
  return {
    sdl: {
      fullscreen: 'false',
      fulldouble: 'false',
      fullresolution: 'desktop',
      windowresolution: '1024x768',
      output: 'opengl',
      autolock: 'true',
      'autolock_feedback': 'none',
      'mouse_emulation': 'locked',
      waitonerror: 'false',
      priority: 'higher',
      usescancodes: 'false',
    },
    dosbox: {
      fastbioslogo: 'true',
      startbanner: 'false',
      'quit warning': 'false',
      machine: 'svga_s3',
      memsize: '256',
    },
    render: {
      frameskip: '0',
      aspect: 'true',
      scaler: 'hardware2x',
    },
    video: {
      vmemsize: '4',
      vmemsizekb: '0',
    },
    cpu: {
      core: 'dynamic',
      fpu: 'true',
      cputype: 'pentium',
      cycles: 'max',
      cycleup: '150',
      cycledown: '100',
      apmbios: 'true',
      isapnpbios: 'true',
    },
    keyboard: {
      aux: 'false',
    },
    voodoo: {
      voodoo_card: 'auto',
      voodoo_maxmem: 'true',
      glide: 'true',
      lfb: 'full_noaux',
      splash: 'false',
    },
    mixer: {
      nosound: 'false',
      rate: '44100',
      blocksize: '1024',
      prebuffer: '20',
    },
    midi: {
      mpu401: 'intelligent',
      mididevice: 'default',
      samplerate: '44100',
    },
    sblaster: {
      sbtype: 'sb16',
      sbbase: '220',
      irq: '7',
      dma: '1',
      hdma: '5',
      'enable speaker': 'false',
      sbmixer: 'true',
      oplmode: 'auto',
      oplemu: 'default',
      oplrate: '44100',
    },
    gus: {
      gus: 'true',
      gusrate: '44100',
      gusmemsize: '-1',
      gusbase: '240',
      gusirq: '5',
      gusdma: '3',
      gustype: 'classic',
    },
    speaker: {
      pcspeaker: 'true',
      pcrate: '44100',
      tandy: 'off',
    },
    joystick: {
      joysticktype: 'none',
    },
    serial: {
      serial1: 'dummy',
      serial2: 'dummy',
      serial3: 'disabled',
      serial4: 'disabled',
    },
    parallel: {
      parallel1: 'disabled',
      parallel2: 'disabled',
      parallel3: 'disabled',
    },
    dos: {
      xms: 'true',
      hma: 'true',
      ems: 'true',
      umb: 'true',
    },
    'ide, primary': {
      enable: 'true',
      pnp: 'true',
    },
    'ide, secondary': {
      enable: 'true',
      pnp: 'true',
    },
    'ide, tertiary': {
      enable: 'false',
      pnp: 'true',
    },
    'ide, quaternary': {
      enable: 'false',
      pnp: 'true',
    },
    'fdc, primary': {
      enable: 'false',
      pnp: 'true',
    },
  };
}

/**
 * 기본 DOSBox 설정 (DOS 게임용)
 */
export function getDefaultDosboxSettings(): DosboxSettings {
  return {
    sdl: {
      fullscreen: 'false',
      fulldouble: 'false',
      fullresolution: 'desktop',
      windowresolution: '1024x768',
      output: 'opengl',
      autolock: 'false',
      waitonerror: 'false',
      priority: 'higher',
      usescancodes: 'false',
    },
    dosbox: {
      machine: 'svga_s3',
      memsize: '16',
    },
    video: {
      vmemsize: '4',
      vmemsizekb: '0',
    },
    render: {
      frameskip: '0',
      aspect: 'true',
      scaler: 'hardware2x',
    },
    cpu: {
      core: 'auto',
      cputype: 'auto',
      cycles: 'auto',
    },
    mixer: {
      nosound: 'false',
      rate: '44100',
    },
    midi: {
      mpu401: 'intelligent',
      mididevice: 'default',
    },
    sblaster: {
      sbtype: 'sb16',
      sbbase: '220',
      irq: '7',
      dma: '1',
      hdma: '5',
      sbmixer: 'true',
    },
    gus: {
      gus: 'false',
    },
    speaker: {
      pcspeaker: 'true',
      pcrate: '44100',
      tandy: 'auto',
    },
  };
}

/**
 * 설정 객체를 완전한 DOSBox conf 파일로 변환 (autoexec 포함)
 */
export function generateDosboxConf(
  settings: DosboxSettings,
  autoexec: string,
  header?: string
): string {
  const lines: string[] = [];

  if (header) {
    lines.push(header);
    lines.push('');
  }

  // Generate sections
  lines.push(settingsToConfString(settings));

  // Add autoexec section
  lines.push('[autoexec]');
  lines.push(autoexec);

  return lines.join('\n').trim();
}

// Import preset loader (lazy import to avoid circular dependencies)
let presetModule: typeof import('../data/preset/index.ts') | null = null;

async function getPresetModule() {
  if (!presetModule) {
    presetModule = await import('../data/preset/index.ts');
  }
  return presetModule;
}

/**
 * Load CFGFILE preset and extract executer/mapper info
 * CFGFILE is specified in autoexec.conf, e.g., "CFGFILE:[KR98]D3D X.conf"
 *
 * @param cfgFile CFGFILE string from autoexec.conf
 * @returns Executer and mapper info, or null if not found
 */
export async function loadCfgFilePreset(cfgFile: string): Promise<{
  executerName: string | null;
  mapperFile: string | null;
} | null> {
  const { getPresetFile } = await getPresetModule();

  const presetContent = getPresetFile(cfgFile);
  if (!presetContent) {
    return null;
  }

  // Parse the preset file (same format as edit.conf)
  const entries = parseEditConf(presetContent);
  const executerName = getExecuterType(entries);

  // Extract mapper file if specified (5|9|mapperfile.txt)
  let mapperFile: string | null = null;
  for (const entry of entries) {
    if (entry.section === 5 && entry.item === 9 && entry.value) {
      mapperFile = entry.value;
      break;
    }
  }

  return { executerName, mapperFile };
}

/**
 * Get DOSBox-X settings for Win9x games
 * Uses default settings and extracts executer/mapper from cfgFile and edit.conf
 */
export async function getWin9xSettingsWithPreset(
  cfgFile?: string,
  editConfContent?: string
): Promise<{
  settings: DosboxSettings;
  executerName: string | null;
  mapperFile: string | null;
}> {
  const settings = getDefaultWin9xSettings();
  let executerName: string | null = null;
  let mapperFile: string | null = null;

  // Extract executer/mapper from CFGFILE preset
  if (cfgFile) {
    const presetResult = await loadCfgFilePreset(cfgFile);
    if (presetResult) {
      executerName = presetResult.executerName;
      mapperFile = presetResult.mapperFile;
    }
  }

  // Extract executer/mapper from edit.conf (overrides preset)
  if (editConfContent) {
    const entries = parseEditConf(editConfContent);

    const editExecuter = getExecuterType(entries);
    if (editExecuter) {
      executerName = editExecuter;
    }

    for (const entry of entries) {
      if (entry.section === 5 && entry.item === 9 && entry.value) {
        mapperFile = entry.value;
        break;
      }
    }
  }

  return { settings, executerName, mapperFile };
}
