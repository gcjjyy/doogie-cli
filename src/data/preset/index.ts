/**
 * DOSBox-X CFGFILE presets
 * These files contain edit.conf-style overrides for specific game configurations
 *
 * CFGFILE format in autoexec.conf: [KR98]D3D X.conf, [KR95]DDRAW X.conf, etc.
 *
 * Each preset defines:
 * - Executer type (0|0|W98KR-x, W95KR-x, etc.)
 * - SDL settings (autolock, sensitivity, mapper file)
 * - DOSBox settings (memsize)
 * - CPU settings (core, cputype, cycles)
 * - Glide settings
 */

// KR95 presets (Windows 95 Korean)
import kr95D3dX from './KR95/[KR95]D3D X.conf' with { type: 'text' };
import kr95DdrawX from './KR95/[KR95]DDRAW X.conf' with { type: 'text' };
import kr95OpenglX from './KR95/[KR95]OPENGL X.conf' with { type: 'text' };

// KR98 presets (Windows 98 Korean)
import kr98D3dX from './KR98/[KR98]D3D X.conf' with { type: 'text' };
import kr98DdrawX from './KR98/[KR98]DDRAW X.conf' with { type: 'text' };
import kr98OpenglX from './KR98/[KR98]OPENGL X.conf' with { type: 'text' };

// JP95 presets (Windows 95 Japanese)
import jp95D3dX from './JP95/[JP95]D3D X.conf' with { type: 'text' };
import jp95DdrawX from './JP95/[JP95]DDRAW X.conf' with { type: 'text' };
import jp95OpenglX from './JP95/[JP95]OPENGL X.conf' with { type: 'text' };

// JP98 presets (Windows 98 Japanese)
import jp98D3dX from './JP98/[JP98]D3D X.conf' with { type: 'text' };
import jp98DdrawX from './JP98/[JP98]DDRAW X.conf' with { type: 'text' };
import jp98OpenglX from './JP98/[JP98]OPENGL X.conf' with { type: 'text' };

// EN95 presets (Windows 95 English)
import en95D3dX from './EN95/[EN95]D3D X.conf' with { type: 'text' };
import en95DdrawX from './EN95/[EN95]DDRAW X.conf' with { type: 'text' };
import en95OpenglX from './EN95/[EN95]OPENGL X.conf' with { type: 'text' };

// EN98 presets (Windows 98 English)
import en98D3dX from './EN98/[EN98]D3D X.conf' with { type: 'text' };
import en98DdrawX from './EN98/[EN98]DDRAW X.conf' with { type: 'text' };
import en98OpenglX from './EN98/[EN98]OPENGL X.conf' with { type: 'text' };

// Base DOSBox-X preset
import dosboxX from './Dosbox-x.conf' with { type: 'text' };

/**
 * Preset file lookup table
 * Key format: "[LANG_VERSION]TYPE X" (e.g., "[KR98]D3D X")
 */
export const PRESET_FILES: Record<string, string> = {
  // KR95
  '[KR95]D3D X': kr95D3dX,
  '[KR95]DDRAW X': kr95DdrawX,
  '[KR95]OPENGL X': kr95OpenglX,

  // KR98
  '[KR98]D3D X': kr98D3dX,
  '[KR98]DDRAW X': kr98DdrawX,
  '[KR98]OPENGL X': kr98OpenglX,

  // JP95
  '[JP95]D3D X': jp95D3dX,
  '[JP95]DDRAW X': jp95DdrawX,
  '[JP95]OPENGL X': jp95OpenglX,

  // JP98
  '[JP98]D3D X': jp98D3dX,
  '[JP98]DDRAW X': jp98DdrawX,
  '[JP98]OPENGL X': jp98OpenglX,

  // EN95
  '[EN95]D3D X': en95D3dX,
  '[EN95]DDRAW X': en95DdrawX,
  '[EN95]OPENGL X': en95OpenglX,

  // EN98
  '[EN98]D3D X': en98D3dX,
  '[EN98]DDRAW X': en98DdrawX,
  '[EN98]OPENGL X': en98OpenglX,

  // Base DOSBox-X
  'DOSBox-x': dosboxX,
};

/**
 * Get preset file content by CFGFILE name
 * @param cfgFile CFGFILE string from autoexec.conf (e.g., "[KR98]D3D X.conf")
 * @returns Preset file content or null if not found
 */
export function getPresetFile(cfgFile: string): string | null {
  // Remove .conf extension if present
  const baseName = cfgFile.replace(/\.conf$/i, '');
  return PRESET_FILES[baseName] || null;
}

/**
 * Parse CFGFILE string to extract language and Windows version
 * @param cfgFile CFGFILE string (e.g., "[KR98]D3D X.conf")
 * @returns Parsed info or null
 */
export function parseCfgFileInfo(cfgFile: string): {
  language: 'KR' | 'JP' | 'EN';
  windowsVersion: '95' | '98';
  renderType: 'D3D' | 'DDRAW' | 'OPENGL';
} | null {
  const match = cfgFile.match(/\[(KR|JP|EN)(95|98)\](D3D|DDRAW|OPENGL)/i);
  if (!match) return null;

  return {
    language: match[1]!.toUpperCase() as 'KR' | 'JP' | 'EN',
    windowsVersion: match[2] as '95' | '98',
    renderType: match[3]!.toUpperCase() as 'D3D' | 'DDRAW' | 'OPENGL',
  };
}
