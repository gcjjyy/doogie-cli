/**
 * DOSBox Template Processing Service
 *
 * 두기 런처의 conf 생성 방식을 구현:
 * 1. Default.conf - 기본값 (라인별 인덱스)
 * 2. Options/{executer}.conf - 실행기별 템플릿 (@placeholder@ 형식)
 * 3. edit.conf - 게임별 오버라이드 (섹션|아이템|값 형식)
 */

// 번들된 데이터 파일 import
import defaultConfContent from '../data/Default.conf' with { type: 'text' };
import dosboxXTemplateContent from '../data/Options/DOSBox-x.conf' with { type: 'text' };

// Default.conf에서 SDL 섹션이 시작하는 라인 (1-indexed)
const DEFAULT_CONF_SDL_START_LINE = 757;

// 플레이스홀더 패턴: @section_key@
const PLACEHOLDER_PATTERN = /@([^@]+)@/g;

/**
 * Default.conf 파싱
 * 라인별로 값을 읽어서 배열로 반환
 */
export function parseDefaultConf(): string[] {
  return defaultConfContent.split('\n');
}

/**
 * 템플릿에서 플레이스홀더 추출 (순서 유지)
 */
export function extractPlaceholders(template: string): string[] {
  const placeholders: string[] = [];
  let match;

  const regex = new RegExp(PLACEHOLDER_PATTERN.source, 'g');
  while ((match = regex.exec(template)) !== null) {
    if (match[1]) {
      placeholders.push(match[1]);
    }
  }

  return placeholders;
}

/**
 * 플레이스홀더 이름을 Default.conf 라인 인덱스로 변환
 */
export function placeholderToLineIndex(placeholderIndex: number): number {
  return DEFAULT_CONF_SDL_START_LINE - 1 + placeholderIndex; // 0-indexed
}

/**
 * 정규식 특수문자 이스케이프
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * DOSBox-x.conf 템플릿을 Default.conf 값으로 치환
 */
export function processTemplate(): string {
  const template = dosboxXTemplateContent;
  const defaultValues = parseDefaultConf();
  const placeholders = extractPlaceholders(template);

  let result = template;

  for (let i = 0; i < placeholders.length; i++) {
    const placeholder = placeholders[i];
    const lineIndex = placeholderToLineIndex(i);
    const value = defaultValues[lineIndex] ?? '';

    const placeholderRegex = new RegExp(`@${escapeRegex(placeholder!)}@`, 'g');
    result = result.replace(placeholderRegex, value.trim());
  }

  return result;
}

/**
 * edit.conf 오버라이드를 conf 문자열에 적용
 */
export function applyOverrides(
  conf: string,
  overrides: Map<string, Map<string, string>>
): string {
  let result = conf;

  for (const [section, items] of overrides) {
    for (const [key, value] of items) {
      // [section] 내에서 key=value 패턴 찾아서 치환
      const sectionRegex = new RegExp(
        `(\\[${escapeRegex(section)}\\][^\\[]*?)${escapeRegex(key)}\\s*=\\s*[^\\n]*`,
        'i'
      );

      if (sectionRegex.test(result)) {
        result = result.replace(sectionRegex, `$1${key}=${value}`);
      }
    }
  }

  return result;
}

/**
 * edit.conf의 오버라이드를 섹션/키/값 맵으로 변환
 */
export function parseEditConfOverrides(
  editConfEntries: Array<{ section: number; item: number; value: string }>,
  sectionIndex: Record<number, string>,
  sectionItems: Record<number, Record<number, string>>
): Map<string, Map<string, string>> {
  const overrides = new Map<string, Map<string, string>>();

  for (const entry of editConfEntries) {
    const sectionName = sectionIndex[entry.section];
    const itemsMap = sectionItems[entry.section];

    if (!sectionName || !itemsMap) {
      continue;
    }

    const keyName = itemsMap[entry.item];
    if (!keyName) {
      continue;
    }

    // 특수 섹션 스킵
    if (['default', 'win9x', 'pcem', 'separator'].includes(sectionName)) {
      continue;
    }

    if (!overrides.has(sectionName)) {
      overrides.set(sectionName, new Map());
    }

    overrides.get(sectionName)!.set(keyName, entry.value);
  }

  return overrides;
}

/**
 * 완전한 DOSBox conf 생성
 */
export async function generateDosboxConfFromTemplate(
  editConfEntries?: Array<{ section: number; item: number; value: string }>,
  isLegacy: boolean = false
): Promise<string> {
  // 1. 템플릿 처리
  let conf = processTemplate();

  // 2. edit.conf 오버라이드 적용
  if (editConfEntries && editConfEntries.length > 0) {
    const { SECTION_INDEX, SECTION_ITEMS, SECTION_INDEX_LEGACY, SECTION_ITEMS_LEGACY } = await import('./dosbox-settings.ts');

    const sectionIndex = isLegacy ? SECTION_INDEX_LEGACY : SECTION_INDEX;
    const sectionItems = isLegacy ? SECTION_ITEMS_LEGACY : SECTION_ITEMS;

    const overrides = parseEditConfOverrides(editConfEntries, sectionIndex, sectionItems);
    conf = applyOverrides(conf, overrides);
  }

  return conf;
}

// 하위 호환성을 위한 더미 함수들
export function isDgglDataInstalled(): boolean {
  return true; // 항상 번들에 포함됨
}

export function findDgglDataPath(): string | null {
  return null;
}

export async function copyDgglData(_path: string): Promise<void> {
  // No-op - 데이터가 이미 번들에 포함됨
}
