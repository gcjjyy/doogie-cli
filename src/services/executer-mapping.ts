/**
 * 두기 런처 실행기 → doogie-cli 대체 실행기 매핑
 *
 * 두기 런처는 Windows 전용이므로 macOS/Linux에서는 대체 실행기를 사용합니다.
 */

export type ExecuterType = 'dosbox' | 'w95kr' | 'w98kr' | 'windows' | 'pcem';
export type AlternativeType = 'dosbox' | 'w95kr' | 'w98kr' | null;

export interface ExecuterMapping {
  /** doogie-cli 내부 타입 */
  type: ExecuterType;
  /** macOS/Linux 대체 실행기 */
  alternative: AlternativeType;
  /** 대체 이미지 이름 */
  alternativeImage: string | null;
  /** 지원 여부 */
  supported: boolean;
  /** 설명 */
  description: string;
}

/**
 * 두기 런처 실행기 매핑 테이블
 *
 * 원본 실행기 이름 → 대체 실행기 정보
 */
export const EXECUTER_MAPPING: Record<string, ExecuterMapping> = {
  // DOSBox 계열 - 그대로 사용
  'DOSBox': {
    type: 'dosbox',
    alternative: 'dosbox',
    alternativeImage: null,
    supported: true,
    description: 'DOS 게임',
  },
  'DOSBox-x': {
    type: 'dosbox',
    alternative: 'dosbox',
    alternativeImage: null,
    supported: true,
    description: 'DOS 게임 (DOSBox-X)',
  },

  // Windows 95 계열 - W95KR-x 사용
  'W95KR': {
    type: 'w95kr',
    alternative: 'w95kr',
    alternativeImage: 'W95KR-x',
    supported: true,
    description: 'Windows 95 게임',
  },
  'W95KR_Daum_Final': {
    type: 'w95kr',
    alternative: 'w95kr',
    alternativeImage: 'W95KR-x',
    supported: true,
    description: 'Windows 95 게임 (Daum Final)',
  },

  // Windows 98 계열 - W98KR-x 사용
  'W98KR': {
    type: 'w98kr',
    alternative: 'w98kr',
    alternativeImage: 'W98KR-x',
    supported: true,
    description: 'Windows 98 게임',
  },
  'W98KR_Daum_Final': {
    type: 'w98kr',
    alternative: 'w98kr',
    alternativeImage: 'W98KR-x',
    supported: true,
    description: 'Windows 98 게임 (Daum Final)',
  },

  // 네이티브 Windows - 미지원 (두기 런처에서는 Windows에서 직접 실행)
  'Windows': {
    type: 'windows',
    alternative: null,
    alternativeImage: null,
    supported: false,
    description: '네이티브 Windows 프로그램 (미지원)',
  },

  // PCem 계열 - W95KR-x/W98KR-x로 대체 (실행기 이름: W95KR_PCem[Slot X-X], W98KR_PCem[Slot X-X])
  // 접두사 매칭으로 처리되므로 별도 항목 불필요
};

/**
 * 실행기 이름으로 매핑 정보 조회
 * @param executerName 두기 런처 실행기 이름
 * @returns 매핑 정보 (없으면 DOSBox로 기본 처리)
 */
export function getExecuterMapping(executerName: string): ExecuterMapping {
  // 정확히 일치하는 경우
  if (EXECUTER_MAPPING[executerName]) {
    return EXECUTER_MAPPING[executerName];
  }

  // 접두사로 매칭 (W95KR_*, W98KR_*)
  // 주의: W95KR_PCem, W98KR_PCem은 위에서 정확히 매칭되므로 여기서는 일반 Win9x로 처리
  if (executerName.startsWith('W95KR')) {
    return {
      type: 'w95kr',
      alternative: 'w95kr',
      alternativeImage: 'W95KR-x',
      supported: true,
      description: `Windows 95 게임 (${executerName})`,
    };
  }

  if (executerName.startsWith('W98KR')) {
    return {
      type: 'w98kr',
      alternative: 'w98kr',
      alternativeImage: 'W98KR-x',
      supported: true,
      description: `Windows 98 게임 (${executerName})`,
    };
  }

  // 기본값: DOSBox
  return {
    type: 'dosbox',
    alternative: 'dosbox',
    alternativeImage: null,
    supported: true,
    description: 'DOS 게임',
  };
}

/**
 * 실행기 타입에서 대체 실행기 타입 조회
 */
export function getAlternativeExecuter(executerType: ExecuterType): AlternativeType {
  switch (executerType) {
    case 'dosbox':
      return 'dosbox';
    case 'w95kr':
      return 'w95kr';
    case 'w98kr':
      return 'w98kr';
    case 'windows':
      return null; // 미지원
    case 'pcem':
      return null; // 미지원
    default:
      return 'dosbox';
  }
}

/**
 * 실행기가 지원되는지 확인
 */
export function isExecuterSupported(executerType: ExecuterType): boolean {
  return executerType !== 'pcem' && executerType !== 'windows';
}
