/**
 * DOSBox mapper files and configuration templates
 *
 * This module provides:
 * - Keyboard/joystick mapper files (.txt)
 * - Option.dat based section|item to key mapping
 * - Default values for all configuration options
 * - Template loading and processing
 */

import dosbox074DaumFinal from './0.74_Daum_Final.txt' with { type: 'text' };
import dosboxX from './DOSBox-x.txt' with { type: 'text' };
import mapper1 from './mapper_1.txt' with { type: 'text' };
import mapper2 from './mapper_2.txt' with { type: 'text' };
import staging from './Staging.txt' with { type: 'text' };
import w9xDaumFinal from './W9X_Daum_Final.txt' with { type: 'text' };
import w9xDaum from './W9X_Daum.txt' with { type: 'text' };
import w9xSvn from './W9X_SVN.txt' with { type: 'text' };
import w9xX from './W9X-x.txt' with { type: 'text' };

/**
 * Mapper file lookup table
 * Key is the filename without .txt extension
 */
export const MAPPER_FILES: Record<string, string> = {
  '0.74_Daum_Final': dosbox074DaumFinal,
  'DOSBox-x': dosboxX,
  'mapper_1': mapper1,
  'mapper_2': mapper2,
  'Staging': staging,
  'W9X_Daum_Final': w9xDaumFinal,
  'W9X_Daum': w9xDaum,
  'W9X_SVN': w9xSvn,
  'W9X-x': w9xX,
};

/**
 * Get mapper file content by name
 * @param name Mapper file name (with or without .txt extension)
 * @returns Mapper file content or null if not found
 */
export function getMapperFile(name: string): string | null {
  // Remove .txt extension if present
  const baseName = name.replace(/\.txt$/i, '');
  return MAPPER_FILES[baseName] || null;
}

// Re-export Option.dat mapping and template functionality
export * from './option-dat.ts';
export * from './defaults.ts';
export * from './template-loader.ts';
