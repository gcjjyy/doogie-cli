/**
 * DOSBox configuration template loader
 *
 * This module provides functionality to:
 * 1. Load template files (e.g., W98KR-x.conf with @placeholder@ patterns)
 * 2. Apply overrides from CFGFILE presets and edit.conf
 * 3. Generate final DOSBox configuration files
 */

import { getKeyForEditConfEntry, SECTION_NAMES } from './option-dat.ts';
import { WIN9X_DEFAULTS, getDefaultValue } from './defaults.ts';

// Import bundled templates
import w98krXTemplate from '../template/W98KR-x.conf' with { type: 'text' };
import w95krXTemplate from '../template/W95KR-x.conf' with { type: 'text' };
import w98jpXTemplate from '../template/W98JP-x.conf' with { type: 'text' };
import w95jpXTemplate from '../template/W95JP-x.conf' with { type: 'text' };
import w98enXTemplate from '../template/W98EN-x.conf' with { type: 'text' };
import w95enXTemplate from '../template/W95EN-x.conf' with { type: 'text' };
import dosboxxTemplate from '../template/DOSBox-x.conf' with { type: 'text' };

/**
 * Available template types
 */
export type TemplateType =
  | 'W98KR-x'
  | 'W95KR-x'
  | 'W98JP-x'
  | 'W95JP-x'
  | 'W98EN-x'
  | 'W95EN-x'
  | 'DOSBox-x';

/**
 * Template lookup table
 */
const TEMPLATES: Record<TemplateType, string> = {
  'W98KR-x': w98krXTemplate,
  'W95KR-x': w95krXTemplate,
  'W98JP-x': w98jpXTemplate,
  'W95JP-x': w95jpXTemplate,
  'W98EN-x': w98enXTemplate,
  'W95EN-x': w95enXTemplate,
  'DOSBox-x': dosboxxTemplate,
};

/**
 * Parse edit.conf format content into key-value pairs
 *
 * edit.conf format:
 * ver.YY.MM.DD
 * section|item|value
 *
 * @param content edit.conf or CFGFILE preset content
 * @returns Map of placeholder key to value
 */
export function parseEditConfFormat(content: string): Map<string, string> {
  const values = new Map<string, string>();
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip version line and empty lines
    if (trimmed.startsWith('ver.') || trimmed === '') {
      continue;
    }

    // Parse section|item|value format
    const parts = trimmed.split('|');
    if (parts.length >= 3 && parts[0] !== undefined && parts[1] !== undefined) {
      const section = parseInt(parts[0], 10);
      const item = parseInt(parts[1], 10);
      const value = parts.slice(2).join('|');

      if (!isNaN(section) && !isNaN(item)) {
        const mapping = getKeyForEditConfEntry(section, item);
        if (mapping) {
          // Create placeholder key: section_key
          const placeholderKey = `${mapping.sectionName}_${mapping.keyName}`;
          values.set(placeholderKey, value);
        }
      }
    }
  }

  return values;
}

/**
 * Get the executer name from edit.conf format content
 * The executer is at section 0, item 0
 */
export function getExecuterFromEditConf(content: string): string | null {
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('0|0|')) {
      return trimmed.slice(4);
    }
  }

  return null;
}

/**
 * Get template for an executer type
 */
export function getTemplateForExecuter(executerName: string): string | null {
  // Map executer names to template types
  const executer = executerName.toUpperCase();

  if (executer.includes('W98KR') && executer.includes('-X')) {
    return TEMPLATES['W98KR-x'];
  }
  if (executer.includes('W95KR') && executer.includes('-X')) {
    return TEMPLATES['W95KR-x'];
  }
  if (executer.includes('W98JP') && executer.includes('-X')) {
    return TEMPLATES['W98JP-x'];
  }
  if (executer.includes('W95JP') && executer.includes('-X')) {
    return TEMPLATES['W95JP-x'];
  }
  if (executer.includes('W98EN') && executer.includes('-X')) {
    return TEMPLATES['W98EN-x'];
  }
  if (executer.includes('W95EN') && executer.includes('-X')) {
    return TEMPLATES['W95EN-x'];
  }
  if (executer.includes('DOSBOX-X') || executer === 'DOSBox-x') {
    return TEMPLATES['DOSBox-x'];
  }

  // Default to DOSBox-x template for unknown executers
  return TEMPLATES['DOSBox-x'];
}

/**
 * Get template by type
 */
export function getTemplate(type: TemplateType): string {
  return TEMPLATES[type];
}

/**
 * Replace all @placeholder@ patterns in template with actual values
 *
 * @param template Template string with @placeholder@ patterns
 * @param values Map of placeholder key to value (without @ symbols)
 * @returns Final configuration string with all placeholders replaced
 */
export function applyValuesToTemplate(
  template: string,
  values: Map<string, string>
): string {
  // Create a merged values map with defaults as base
  const mergedValues = new Map<string, string>();

  // Start with defaults
  for (const [key, value] of Object.entries(WIN9X_DEFAULTS)) {
    mergedValues.set(key, value);
  }

  // Override with provided values
  for (const [key, value] of values) {
    mergedValues.set(key, value);
  }

  // Replace all @placeholder@ patterns
  let result = template;
  const placeholderRegex = /@([^@]+)@/g;

  result = result.replace(placeholderRegex, (match, key) => {
    const value = mergedValues.get(key);
    if (value !== undefined) {
      return value;
    }
    // If no value found, try with default
    const defaultValue = getDefaultValue(key);
    if (defaultValue !== '') {
      return defaultValue;
    }
    // Return empty string for unknown placeholders (removes the placeholder)
    console.warn(`Unknown placeholder: ${match}`);
    return '';
  });

  return result;
}

/**
 * Generate final DOSBox-X configuration
 *
 * This function combines:
 * 1. Template file for the executer type
 * 2. CFGFILE preset overrides
 * 3. Game-specific edit.conf overrides
 *
 * @param executerName Executer name (e.g., W98KR-x, W95KR-x)
 * @param cfgFileContent CFGFILE preset content (optional)
 * @param editConfContent Game-specific edit.conf content (optional)
 * @returns Generated DOSBox-X configuration string
 */
export function generateDosboxXConfig(
  executerName: string,
  cfgFileContent?: string,
  editConfContent?: string
): string {
  // Get template for executer
  const template = getTemplateForExecuter(executerName);
  if (!template) {
    throw new Error(`No template found for executer: ${executerName}`);
  }

  // Start with empty overrides
  const values = new Map<string, string>();

  // Apply CFGFILE preset overrides
  if (cfgFileContent) {
    const cfgFileValues = parseEditConfFormat(cfgFileContent);
    for (const [key, value] of cfgFileValues) {
      values.set(key, value);
    }
  }

  // Apply edit.conf overrides (game-specific settings take highest priority)
  if (editConfContent) {
    const editConfValues = parseEditConfFormat(editConfContent);
    for (const [key, value] of editConfValues) {
      values.set(key, value);
    }
  }

  // Generate final configuration
  return applyValuesToTemplate(template, values);
}

/**
 * Extract Win9x specific settings from edit.conf
 * Used for generating DX.REG and other Windows-specific files
 */
export interface Win9xDisplaySettings {
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
 * Parse 9xres value (e.g., "640x8" → { width: 640, height: 480, bitsPerPixel: 8 })
 */
function parse9xResolution(value: string): { width: number; height: number; bitsPerPixel: number } {
  const match = value.match(/(\d+)x(\d+)/);
  if (!match || !match[1] || !match[2]) {
    return { width: 640, height: 480, bitsPerPixel: 8 };
  }

  const width = parseInt(match[1], 10);
  const bitsPerPixel = parseInt(match[2], 10);

  // Height is determined by width (4:3 ratio)
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
 * Extract Win9x display settings from values map
 */
export function extractWin9xDisplaySettings(values: Map<string, string>): Win9xDisplaySettings {
  const defaults: Win9xDisplaySettings = {
    resolution: { width: 640, height: 480, bitsPerPixel: 8 },
    ddraw: true,
    d3d: true,
    threeDfx: true,
    midiDriver: 'SBFM',
    volumes: { master: 255, wave: 255, midi: 255, cd: 128 },
  };

  const res = values.get('win9x_9xres');
  if (res) {
    defaults.resolution = parse9xResolution(res);
  }

  const ddraw = values.get('win9x_9xddraw');
  if (ddraw) {
    defaults.ddraw = ddraw === 'true';
  }

  const d3d = values.get('win9x_9xd3d');
  if (d3d) {
    defaults.d3d = d3d === 'true';
  }

  const threeDfx = values.get('win9x_9x3dfx');
  if (threeDfx) {
    defaults.threeDfx = threeDfx === 'true';
  }

  const mpu = values.get('win9x_9xmpu');
  if (mpu) {
    defaults.midiDriver = mpu === 'MPU401' ? 'MPU401' : 'SBFM';
  }

  const master = values.get('win9x_9xmaster');
  if (master) {
    defaults.volumes.master = parseInt(master, 10) || 255;
  }

  const wave = values.get('win9x_9xwave');
  if (wave) {
    defaults.volumes.wave = parseInt(wave, 10) || 255;
  }

  const midi = values.get('win9x_9xmidi');
  if (midi) {
    defaults.volumes.midi = parseInt(midi, 10) || 255;
  }

  const cd = values.get('win9x_9xcd');
  if (cd) {
    defaults.volumes.cd = parseInt(cd, 10) || 128;
  }

  return defaults;
}

/**
 * Get Win9x display settings from edit.conf content
 */
export function getWin9xDisplaySettingsFromEditConf(
  cfgFileContent?: string,
  editConfContent?: string
): Win9xDisplaySettings {
  const values = new Map<string, string>();

  if (cfgFileContent) {
    const cfgFileValues = parseEditConfFormat(cfgFileContent);
    for (const [key, value] of cfgFileValues) {
      values.set(key, value);
    }
  }

  if (editConfContent) {
    const editConfValues = parseEditConfFormat(editConfContent);
    for (const [key, value] of editConfValues) {
      values.set(key, value);
    }
  }

  return extractWin9xDisplaySettings(values);
}
