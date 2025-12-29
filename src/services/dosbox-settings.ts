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

// 신버전 (ver.23.xx) 섹션 인덱스 → 섹션 이름 매핑
export const SECTION_INDEX: Record<number, string> = {
  0: 'default',
  1: 'win9x',      // win9x options (특수 처리)
  2: 'pcem',       // pcem options (특수 처리)
  3: 'separator',
  4: 'log',
  5: 'sdl',
  6: 'dos',
  7: 'dosbox',
  8: 'cpu',
  9: 'render',
  10: 'mixer',
  11: 'sblaster',
  12: 'midi',
  13: 'gus',
  14: 'speaker',
  15: 'innova',
  16: 'joystick',
  17: 'serial',
  18: 'printer',
  19: 'parallel',
  20: 'glide',
  21: 'voodoo',
  22: 'pci',
  23: 'vsync',
  24: 'keyboard',
  25: 'ne2000',
  26: 'fdc, primary',
  27: 'ide, primary',
  28: 'ide, secondary',
  29: 'ide, tertiary',
  30: 'ide, quaternary',
  31: 'mapper',
  32: 'ethernet, pcap',
  33: 'ethernet, slirp',
  34: 'fluidsynth',
  35: 'video',
  36: 'pc98',
  37: 'ttf',
  38: 'config',
  39: 'dosv',
};

// 섹션별 항목 인덱스 → 키 이름 매핑
export const SECTION_ITEMS: Record<number, Record<number, string>> = {
  // Section 0: default
  0: {
    0: 'version',      // 실행기 종류 (W98KR_Daum_Final, DOSBox-x, etc.)
    1: 'DirectX',
    2: 'Menu',
    3: 'SavePath',
    4: 'SetAspect',
  },

  // Section 1: win9x options (특수 처리 - DX.REG 등에 사용)
  1: {
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

  // Section 5: sdl
  5: {
    0: 'fullscreen',
    1: 'fulldouble',
    2: 'fullresolution',
    3: 'windowresolution',
    4: 'output',
    5: 'autolock',
    6: 'sensitivity',
    7: 'waitonerror',
    8: 'priority',
    9: 'mapperfile',
    10: 'usescancodes',
    11: 'overscan',
    12: 'pixelshader',
    13: 'autolock_feedback',
    14: 'mouse_emulation',
  },

  // Section 6: dos
  6: {
    0: 'xms',
    1: 'ems',
    2: 'umb',
    3: 'keyboardlayout',
    4: 'enable a20 on windows init',
    17: 'int 13 extensions',
  },

  // Section 7: dosbox
  7: {
    0: 'language',
    1: 'machine',
    2: 'captures',
    3: 'memsize',
    4: 'vmemsize',
    5: 'vmemsizekb',
    58: 'enable pci bus',
  },

  // Section 8: cpu
  8: {
    0: 'core',
    1: 'cputype',
    2: 'cycles',
    3: 'cycleup',
    4: 'cycledown',
    5: 'isapnpbios',
    11: 'apmbios',
  },

  // Section 9: render
  9: {
    0: 'frameskip',
    1: 'aspect',
    2: 'scaler',
  },

  // Section 10: mixer
  10: {
    0: 'nosound',
    1: 'rate',
    2: 'blocksize',
    3: 'prebuffer',
  },

  // Section 11: sblaster
  11: {
    0: 'sbtype',
    1: 'sbbase',
    2: 'irq',
    3: 'dma',
    4: 'hdma',
    5: 'sbmixer',
    6: 'oplmode',
    7: 'oplemu',
    8: 'oplrate',
  },

  // Section 12: midi
  12: {
    0: 'mpu401',
    1: 'mididevice',
    2: 'midiconfig',
  },

  // Section 13: gus
  13: {
    0: 'gus',
    1: 'gusrate',
    2: 'gusbase',
    3: 'gusirq',
    4: 'gusdma',
  },

  // Section 14: speaker
  14: {
    0: 'pcspeaker',
    1: 'pcrate',
    2: 'tandy',
    3: 'tandyrate',
    4: 'disney',
  },

  // Section 16: joystick
  16: {
    0: 'joysticktype',
    1: 'timed',
    2: 'autofire',
    3: 'swap34',
    4: 'buttonwrap',
  },

  // Section 20: glide
  20: {
    0: 'glide',
    1: 'lfb',
    2: 'splash',
  },

  // Section 21: voodoo
  21: {
    0: 'voodoo',
    1: 'voodoomem',
  },

  // Section 22: pci
  22: {
    0: 'voodoo',
    1: 'voodoomem',
  },

  // Section 27: ide, primary
  27: {
    0: 'enable',
    1: 'pnp',
    2: 'irq',
    3: 'io',
    4: 'altio',
    5: 'int13fakeio',
    6: 'int13fakev86io',
    7: 'enable pio32',
    8: 'ignore pio32',
    9: 'cd-rom spinup time',
    10: 'cd-rom spindown timeout',
    11: 'cd-rom insertion delay',
  },

  // Section 28: ide, secondary
  28: {
    0: 'enable',
    1: 'pnp',
    2: 'irq',
    3: 'io',
    4: 'altio',
    5: 'int13fakeio',
    6: 'int13fakev86io',
    7: 'enable pio32',
    8: 'ignore pio32',
    9: 'cd-rom spinup time',
    10: 'cd-rom spindown timeout',
    11: 'cd-rom insertion delay',
  },
};

// 구버전 (ver.20.xx) 섹션 인덱스 매핑
// 구버전에서는 섹션 순서가 다름: 3=dosbox, 6=cpu 등
export const SECTION_INDEX_LEGACY: Record<number, string> = {
  0: 'default',
  1: 'win9x',
  2: 'pcem',
  3: 'dosbox',     // 신버전에서는 7
  6: 'cpu',        // 신버전에서는 8
  19: 'glide',     // 신버전에서는 20
  21: 'voodoo',    // 신버전에서는... 다름
  32: 'ethernet, pcap',
};

// 구버전 섹션별 항목 인덱스 매핑
export const SECTION_ITEMS_LEGACY: Record<number, Record<number, string>> = {
  0: {
    0: 'version',
  },
  1: {
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
  6: {  // cpu section (구버전)
    0: 'core',
    1: 'cputype',
    2: 'cycles',
    5: 'isapnpbios',
    11: 'apmbios',
  },
  19: {  // glide/mouse section
    0: 'mouse_emulation',  // emu, integration
  },
  21: {  // resolution section
    1: '9xres',
  },
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
    // Skip special sections
    if (section === 'default' || section === 'win9x' || section === 'pcem' || section === 'separator') {
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
 * Windows 두기 런처와 동일한 설정
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
