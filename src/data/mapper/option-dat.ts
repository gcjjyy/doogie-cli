/**
 * Option.dat mapping module
 *
 * This module provides mapping from edit.conf's section|item indices to DOSBox config keys.
 * The mapping is derived from DGGL/Data/LangKR/Option.dat
 *
 * Format in Option.dat:
 * @T<section_name>
 * 한글라벨|key;option1|option2|...;<TYPE>
 *
 * Section index starts from 0 (default), increments for each @T header.
 * Item index starts from 0 within each section, increments for each line.
 */

/**
 * Section name by index
 * Maps edit.conf section numbers to DOSBox section names
 */
export const SECTION_NAMES: Record<number, string> = {
  0: 'default',
  1: 'win9x',
  2: 'pcem',
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

/**
 * Item mapping by section
 * Maps edit.conf item numbers to DOSBox config keys within each section
 *
 * Derived from Option.dat item order
 */
export const SECTION_ITEMS: Record<number, Record<number, string>> = {
  // Section 0: default
  0: {
    0: 'version',       // 실행기
    1: 'DirectX',
    2: 'Menu',
    3: 'SavePath',
    4: 'SetAspect',
  },

  // Section 1: win9x options (특수 - DX.REG 등에 사용)
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

  // Section 2: pcem options
  2: {
    0: 'PCem_Machine',
    1: 'PCem_CPU',
    2: 'PCem_Video_Speed',
    3: 'PCem_Voodoo',
    4: 'PCem_Voodoo_Type',
  },

  // Section 4: log
  4: {
    0: 'log',
    1: 'logfile',
    2: 'debuggerrun',
    3: 'vga',
    4: 'vgagfx',
    5: 'vgamisc',
    6: 'int10',
    7: 'sblaster',
    8: 'dma_control',
    9: 'fpu',
    10: 'cpu',
    11: 'paging',
    12: 'fcb',
    13: 'files',
    14: 'ioctl',
    15: 'exec',
    16: 'dosmisc',
    17: 'pit',
    18: 'keyboard',
    19: 'pic',
    20: 'mouse',
    21: 'bios',
    22: 'gui',
    23: 'misc',
    24: 'io',
    25: 'pci',
    26: 'sst',
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
    15: 'clip_mouse_button',
    16: 'clip_key_modifier',
    17: 'clip_paste_speed',
    18: 'mouse_wheel_key',
    19: 'display',
    20: 'videodriver',
    21: 'transparency',
    22: 'maximize',
    23: 'middle_unlock',
    24: 'clip_paste_bios',
    25: 'usesystemcursor',
    26: 'showbasic',
    27: 'showdetails',
    28: 'texture_renderer',
    29: 'capture_mouse',
    30: 'raw_mouse_input',
    31: 'screensaver',
    32: 'windowposition',
    33: 'showmenu',
  },

  // Section 6: dos
  6: {
    0: 'xms',
    1: 'ems',
    2: 'umb',
    3: 'keyboardlayout',
    4: 'enable a20 on windows init',
    5: 'zero memory on xms memory allocation',
    6: 'zero memory on ems memory allocation',
    7: 'ems system handle memory size',
    8: 'umb start',
    9: 'umb end',
    10: 'kernel allocation in umb',
    11: 'dynamic kernel allocation',
    12: 'keep umb on boot',
    13: 'keep private area on boot',
    14: 'private area in umb',
    15: 'automount',
    16: 'int33',
    17: 'int 13 extensions',
    18: 'biosps2',
    19: 'int15 mouse callback does not preserve registers',
    20: 'dbcs',
    21: 'filenamechar',
    22: 'collating and uppercase',
    23: 'files',
    24: 'con device use int 16h to detect keyboard input',
    25: 'zero memory on int 21h memory allocation',
    26: 'hma',
    27: 'hma allow reservation',
    28: 'hma minimum allocation',
    29: 'log console',
    30: 'dos in hma',
    31: 'hma free space',
    32: 'cpm compatibility mode',
    33: 'share',
    34: 'write plain iretf for debug interrupts',
    35: 'minimum dos initial private segment',
    36: 'minimum mcb segment',
    37: 'enable dummy device mcb',
    38: 'maximum environment block size on exec',
    39: 'additional environment block size on exec',
    40: 'dosv',
    41: 'vcpi',
    42: 'unmask timer on disk io',
    43: 'zero int 67h if no ems',
    44: 'emm386 startup active',
    45: 'ems system handle on even megabyte',
    46: 'ver',
    47: 'int15 wait force unmask irq',
    48: 'hard drive data rate limit',
    49: 'dos sda size',
    50: 'minimum mcb free',
    51: 'xms handles',
    52: 'shell configuration as commands',
    53: 'int33 disable cell granularity',
    54: 'int33 hide host cursor if interrupt subroutine',
    55: 'int33 hide host cursor when polling',
    56: 'ansi.sys',
    57: 'quick reboot',
    58: 'lfn',
    59: 'automountall',
    60: 'mountwarning',
    61: 'autofixwarning',
    62: 'startcmd',
    63: 'startwait',
    64: 'startquiet',
    65: 'dos clipboard device enable',
    66: 'dos clipboard device name',
    67: 'dos clipboard api',
    68: 'floppy drive data rate limit',
    69: 'file access tries',
    70: 'network redirector',
    71: 'fat32setversion',
    72: 'shellhigh',
    73: 'starttranspath',
    74: 'vmware',
    75: 'customcodepage',
  },

  // Section 7: dosbox
  7: {
    0: 'language',
    1: 'machine',
    2: 'captures',
    3: 'memsize',
    4: 'vmemsize',
    5: 'vmemsizekb',
    6: 'cgasnow',
    7: 'forcerate',
    8: 'mainline compatible mapping',
    9: 'mainline compatible bios mapping',
    10: 'adapter rom is ram',
    11: 'shell environment size',
    12: 'private area size',
    13: 'a20',
    14: 'isa bus clock',
    15: 'pci bus clock',
    16: 'rom bios allocation max',
    17: 'rom bios minimum size',
    18: 'memsizekb',
    19: 'dos mem limit',
    20: 'isa memory hole at 512kb',
    21: 'memalias',
    22: 'vga bios size override',
    23: 'video bios dont duplicate cga first half rom font',
    24: 'video bios always offer 14-pixel high rom font',
    25: 'video bios always offer 16-pixel high rom font',
    26: 'video bios enable cga second half rom font',
    27: 'sierra ramdac',
    28: 'sierra ramdac lock 565',
    29: 'page flip debug line',
    30: 'vertical retrace poll debug line',
    31: 'allow port 92 reset',
    32: 'enable port 92',
    33: 'enable 1st dma controller',
    34: 'enable 2nd dma controller',
    35: 'allow dma address decrement',
    36: 'enable dma extra page registers',
    37: 'dma page registers write-only',
    38: 'enable slave pic',
    39: 'enable pc nmi mask',
    40: 'rom bios 8x8 CGA font',
    41: 'rom bios video parameter table',
    42: 'allow more than 640kb base memory',
    43: 'vesa lfb base scanline adjust',
    44: 'allow hpel effects',
    45: 'allow hretrace effects',
    46: 'hretrace effect weight',
    47: 'vesa vbe 1.2 modes are 32bpp',
    48: 'allow low resolution vesa modes',
    49: 'allow 32bpp vesa modes',
    50: 'allow 24bpp vesa modes',
    51: 'allow 16bpp vesa modes',
    52: 'allow 15bpp vesa modes',
    53: 'allow 8bpp vesa modes',
    54: 'allow 4bpp vesa modes',
    55: 'allow tty vesa modes',
    56: 'enable vga resize delay',
    57: 'resize only on vga active display width increase',
    58: 'enable pci bus',
    // ... 더 많은 항목들이 있지만 자주 사용되는 것들만 매핑
  },

  // Section 8: cpu
  8: {
    0: 'core',
    1: 'cputype',
    2: 'cycles',
    3: 'cycleup',
    4: 'cycledown',
    5: 'isapnpbios',
    6: 'enable msr',
    7: 'ignore undefined msr',
    8: 'dynamic core cache block size',
    9: 'non-recursive page fault',
    10: 'ignore opcode 63',
    11: 'apmbios',
    12: 'apmbios allow realmode',
    13: 'apmbios allow 16-bit protected mode',
    14: 'apmbios allow 32-bit protected mode',
    15: 'integration device',
    16: 'realbig16',
    17: 'fpu',
    18: 'segment limits',
    19: 'double fault',
    20: 'reset on triple fault',
    21: 'always report double fault',
    22: 'always report triple fault',
    23: 'enable cmpxchg8b',
    24: 'interruptible rep string op',
    25: 'apmbios pnp',
    26: 'apmbios version',
    27: 'integration device pnp',
    28: 'use dynamic core with paging on',
    29: 'turbo',
  },

  // Section 9: render
  9: {
    0: 'frameskip',
    1: 'aspect',
    2: 'scaler',
    3: 'linewise',
    4: 'char9',
    5: 'multiscan',
    6: 'doublescan',
    7: 'autofit',
    8: 'xbrz slice',
    9: 'xbrz fixed scale factor',
    10: 'xbrz max scale factor',
    11: 'alt render',
    12: 'glshader',
    13: 'euro',
    14: 'monochrome_pal',
    15: 'aspect_ratio',
    16: 'monochrome_palette',
  },

  // Section 10: mixer
  10: {
    0: 'nosound',
    1: 'rate',
    2: 'blocksize',
    3: 'prebuffer',
    4: 'swapstereo',
    5: 'MASTER',
    6: 'SPKR',
    7: 'GUS',
    8: 'SB',
    9: 'FM',
    10: 'MT32',
    11: 'sample accurate',
    12: 'CDAUDIO',
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
    9: 'hardwarebase',
    10: 'goldplay',
    11: 'adlib force timer overflow on detect',
    12: 'force dsp auto-init',
    13: 'force goldplay',
    14: 'goldplay stereo',
    15: 'dsp require interrupt acknowledge',
    16: 'dsp write busy delay',
    17: 'blaster environment variable',
    18: 'sample rate limits',
    19: 'instant direct dac',
    20: 'stereo control with sbpro only',
    21: 'dsp busy cycle rate',
    22: 'dsp busy cycle duty',
    23: 'io port aliasing',
    24: 'mindma',
    25: 'irq hack',
    26: 'pic unmask irq',
    27: 'enable speaker',
    28: 'enable asp',
    29: 'disable filtering',
    30: 'dsp write buffer status must return 0x7f or 0xff',
    31: 'pre-set sbpro stereo',
    32: 'dsp busy cycle always',
    33: 'oplport',
    34: 'retrowave_bus',
    35: 'retrowave_port',
    36: 'fmstrength',
  },

  // Section 12: midi
  12: {
    0: 'mpu401',
    1: 'mididevice',
    2: 'midiconfig',
    3: 'mt32.reverse.stereo',
    4: 'mt32.verbose',
    5: 'mt32.thread',
    6: 'mt32.dac',
    7: 'mt32.reverb.mode',
    8: 'mt32.reverb.time',
    9: 'mt32.reverb.level',
    10: 'mt32.partials',
    11: 'mpuirq',
    12: 'samplerate',
    13: 'mt32.romdir',
    14: 'mt32.reverb.output.gain',
    15: 'mt32.chunk',
    16: 'mt32.prebuffer',
    17: 'mt32.analog',
    18: 'mt32.output.gain',
    19: 'mt32.src.quality',
    20: 'mt32.niceampramp',
    21: 'fluid.driver',
    22: 'fluid.soundfont',
  },

  // Section 13: gus
  13: {
    0: 'gus',
    1: 'gusrate',
    2: 'gusbase',
    3: 'gusirq',
    4: 'gusdma',
    5: 'gusmemsize',
    6: 'gus master volume',
    7: 'gustype',
    8: 'ultradir',
  },

  // Section 14: speaker
  14: {
    0: 'pcspeaker',
    1: 'pcrate',
    2: 'tandy',
    3: 'tandyrate',
    4: 'disney',
    5: 'ps1audio',
    6: 'ps1audiorate',
  },

  // Section 15: innova
  15: {
    0: 'innova',
    1: 'samplerate',
    2: 'sidbase',
    3: 'quality',
  },

  // Section 16: joystick
  16: {
    0: 'joysticktype',
    1: 'timed',
    2: 'autofire',
    3: 'swap34',
    4: 'buttonwrap',
  },

  // Section 17: serial
  17: {
    0: 'serial1',
    1: 'serial2',
    2: 'serial3',
    3: 'serial4',
  },

  // Section 18: printer
  18: {
    0: 'printer',
    1: 'dpi',
    2: 'width',
    3: 'height',
    4: 'printoutput',
    5: 'multipage',
    6: 'docpath',
    7: 'timeout',
  },

  // Section 19: parallel
  19: {
    0: 'parallel1',
    1: 'parallel2',
    2: 'parallel3',
    3: 'dongle',
  },

  // Section 20: glide
  20: {
    0: 'glide',
    1: 'lfb',
    2: 'splash',
    3: 'grport',
  },

  // Section 21: voodoo
  21: {
    0: 'voodoo',
    1: 'voodoo_card',
    2: 'voodoo_maxmem',
    3: 'glide',
    4: 'lfb',
    5: 'splash',
  },

  // Section 22: pci
  22: {
    0: 'voodoo',
    1: 'voodoomem',
  },

  // Section 23: vsync
  23: {
    0: 'vsyncmode',
    1: 'vsyncrate',
  },

  // Section 24: keyboard
  24: {
    0: 'aux',
    1: 'allow output port reset',
    2: 'controllertype',
    3: 'auxdevice',
  },

  // Section 25: ne2000
  25: {
    0: 'ne2000',
    1: 'nicbase',
    2: 'nicirq',
    3: 'macaddr',
    4: 'backend',
  },

  // Section 26: fdc, primary
  26: {
    0: 'enable',
    1: 'pnp',
    2: 'mode',
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

  // Section 29: ide, tertiary
  29: {
    0: 'enable',
    1: 'pnp',
  },

  // Section 30: ide, quaternary
  30: {
    0: 'enable',
    1: 'pnp',
  },

  // Section 31: mapper
  31: {
    // joy1deadzone0- through joy2deadzone7+ (0-31)
  },

  // Section 35: video
  35: {
    0: 'vmemsize',
    1: 'vmemsizekb',
    2: 'high intensity blinking',
  },

  // Section 38: config
  38: {
    0: 'rem',
    1: 'break',
    2: 'numlock',
    3: 'shell',
    4: 'dos',
    5: 'fcbs',
    6: 'files',
    7: 'country',
    8: 'lastdrive',
  },
};

/**
 * Get the DOSBox config key for an edit.conf entry
 * @param section Section index from edit.conf
 * @param item Item index from edit.conf
 * @returns The key name and section name, or null if not found
 */
export function getKeyForEditConfEntry(
  section: number,
  item: number
): { sectionName: string; keyName: string } | null {
  const sectionName = SECTION_NAMES[section];
  if (!sectionName) {
    return null;
  }

  const items = SECTION_ITEMS[section];
  if (!items) {
    return null;
  }

  const keyName = items[item];
  if (!keyName) {
    return null;
  }

  return { sectionName, keyName };
}

/**
 * Get the placeholder key for a section/key combination
 * Used to replace @section_key@ in templates
 * @example getPlaceholderKey('sdl', 'fullscreen') => 'sdl_fullscreen'
 */
export function getPlaceholderKey(sectionName: string, keyName: string): string {
  return `${sectionName}_${keyName}`;
}
