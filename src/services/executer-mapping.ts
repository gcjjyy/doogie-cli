/**
 * 두기 런처 실행기 → doogie-cli 대체 실행기 매핑
 *
 * 두기 런처는 Windows 전용 DOSBox SVN Daum을 사용하지만,
 * macOS/Linux에서는 DOSBox-X를 사용합니다.
 * 단, Win9x 이미지는 원본 이미지(W95KR_Daum, W95KR_Daum_Final 등)를 그대로 사용합니다.
 */

export type ExecuterType = 'dosbox' | 'w95kr' | 'w98kr' | 'w95jp' | 'w98jp' | 'w95en' | 'w98en' | 'windows' | 'pcem';
export type AlternativeType = 'dosbox' | 'w95kr' | 'w98kr' | 'w95jp' | 'w98jp' | 'w95en' | 'w98en' | null;

export interface Win9xImageInfo {
  /** 이미지 이름 (폴더명) */
  name: string;
  /** 다운로드 URL (티스토리) */
  downloadUrl: string;
  /** Windows 버전 */
  windowsVersion: '95' | '98';
  /** 설명 */
  description: string;
}

export interface ExecuterMapping {
  /** doogie-cli 내부 타입 */
  type: ExecuterType;
  /** macOS/Linux 대체 실행기 (DOSBox-X 사용) */
  alternative: AlternativeType;
  /** Win9x 이미지 정보 (null이면 이미지 불필요) */
  imageInfo: Win9xImageInfo | null;
  /** 지원 여부 */
  supported: boolean;
  /** 설명 */
  description: string;
}

/**
 * Win9x 이미지 다운로드 URL 목록
 * URL은 "런처 관리용" 카테고리의 원본 버전 사용 (폴더명 일치를 위해 _new 버전 사용 안함)
 * https://nemo838.tistory.com/category/도스게임런처/런처%20관리용
 */
export const WIN9X_IMAGES: Record<string, Win9xImageInfo> = {
  // ============================================
  // Windows 95 Korean (한국어)
  // ============================================
  'W95KR_Daum': {
    name: 'W95KR_Daum',
    downloadUrl: 'https://nemo838.tistory.com/4380', // W95KR_Daum_256mb
    windowsVersion: '95',
    description: 'Windows 95 한국어 (DOSBox Daum)',
  },
  'W95KR_Daum_Final': {
    name: 'W95KR_Daum_Final',
    downloadUrl: 'https://nemo838.tistory.com/4379', // W95KR_Daum_Final_256mb
    windowsVersion: '95',
    description: 'Windows 95 한국어 (DOSBox Daum Final)',
  },
  'W95KR-x': {
    name: 'W95KR-x',
    downloadUrl: 'https://nemo838.tistory.com/4381', // W95KR-x_256mb
    windowsVersion: '95',
    description: 'Windows 95 한국어 (DOSBox-X 전용, 간소화 버전)',
  },

  // ============================================
  // Windows 95 Japanese (일본어)
  // ============================================
  'W95JP_Daum': {
    name: 'W95JP_Daum',
    downloadUrl: 'https://nemo838.tistory.com/4377', // W95JP_Daum_256mb
    windowsVersion: '95',
    description: 'Windows 95 일본어 (DOSBox Daum)',
  },
  'W95JP_Daum_Final': {
    name: 'W95JP_Daum_Final',
    downloadUrl: 'https://nemo838.tistory.com/4376', // W95JP_Daum_Final_256mb
    windowsVersion: '95',
    description: 'Windows 95 일본어 (DOSBox Daum Final)',
  },
  'W95JP-x': {
    name: 'W95JP-x',
    downloadUrl: 'https://nemo838.tistory.com/4378', // W95JP-x_256mb
    windowsVersion: '95',
    description: 'Windows 95 일본어 (DOSBox-X 전용, 간소화 버전)',
  },

  // ============================================
  // Windows 95 English (영어)
  // ============================================
  'W95EN_Daum': {
    name: 'W95EN_Daum',
    downloadUrl: 'https://nemo838.tistory.com/4374', // W95EN_Daum_256mb
    windowsVersion: '95',
    description: 'Windows 95 영어 (DOSBox Daum)',
  },
  'W95EN_Daum_Final': {
    name: 'W95EN_Daum_Final',
    downloadUrl: 'https://nemo838.tistory.com/4373', // W95EN_Daum_Final_256mb
    windowsVersion: '95',
    description: 'Windows 95 영어 (DOSBox Daum Final)',
  },
  'W95EN-x': {
    name: 'W95EN-x',
    downloadUrl: 'https://nemo838.tistory.com/4375', // W95EN-x_256mb
    windowsVersion: '95',
    description: 'Windows 95 영어 (DOSBox-X 전용, 간소화 버전)',
  },

  // ============================================
  // Windows 98 Korean (한국어)
  // ============================================
  'W98KR_Daum': {
    name: 'W98KR_Daum',
    downloadUrl: 'https://nemo838.tistory.com/3285', // W98KR_Daum_512mb
    windowsVersion: '98',
    description: 'Windows 98 한국어 (DOSBox Daum)',
  },
  'W98KR_Daum_Final': {
    name: 'W98KR_Daum_Final',
    downloadUrl: 'https://nemo838.tistory.com/3284', // W98KR_Daum_Final_1024mb
    windowsVersion: '98',
    description: 'Windows 98 한국어 (DOSBox Daum Final)',
  },
  'W98KR-x': {
    name: 'W98KR-x',
    downloadUrl: 'https://nemo838.tistory.com/3286', // W98KR-x_512mb
    windowsVersion: '98',
    description: 'Windows 98 한국어 (DOSBox-X 전용, 간소화 버전)',
  },

  // ============================================
  // Windows 98 Japanese (일본어)
  // ============================================
  'W98JP_Daum': {
    name: 'W98JP_Daum',
    downloadUrl: 'https://nemo838.tistory.com/3282', // W98JP_Daum_512mb
    windowsVersion: '98',
    description: 'Windows 98 일본어 (DOSBox Daum)',
  },
  'W98JP_Daum_Final': {
    name: 'W98JP_Daum_Final',
    downloadUrl: 'https://nemo838.tistory.com/3281', // W98JP_Daum_Final_512mb
    windowsVersion: '98',
    description: 'Windows 98 일본어 (DOSBox Daum Final)',
  },
  'W98JP-x': {
    name: 'W98JP-x',
    downloadUrl: 'https://nemo838.tistory.com/3283', // W98JP-x_512mb
    windowsVersion: '98',
    description: 'Windows 98 일본어 (DOSBox-X 전용, 간소화 버전)',
  },

  // ============================================
  // Windows 98 English (영어)
  // ============================================
  'W98EN_Daum': {
    name: 'W98EN_Daum',
    downloadUrl: 'https://nemo838.tistory.com/3279', // W98EN_Daum_512mb
    windowsVersion: '98',
    description: 'Windows 98 영어 (DOSBox Daum)',
  },
  'W98EN_Daum_Final': {
    name: 'W98EN_Daum_Final',
    downloadUrl: 'https://nemo838.tistory.com/3278', // W98EN_Daum_Final_512mb
    windowsVersion: '98',
    description: 'Windows 98 영어 (DOSBox Daum Final)',
  },
  'W98EN-x': {
    name: 'W98EN-x',
    downloadUrl: 'https://nemo838.tistory.com/3280', // W98EN-x_512mb
    windowsVersion: '98',
    description: 'Windows 98 영어 (DOSBox-X 전용, 간소화 버전)',
  },
};

/**
 * 두기 런처 실행기 매핑 테이블
 *
 * 원본 실행기 이름 → 대체 실행기 정보
 * DOSBox-X를 사용하되, 이미지는 원본 이미지 사용
 */
export const EXECUTER_MAPPING: Record<string, ExecuterMapping> = {
  // ============================================
  // DOSBox 계열 - DOSBox-X로 대체
  // ============================================
  'DOSBox': {
    type: 'dosbox',
    alternative: 'dosbox',
    imageInfo: null,
    supported: true,
    description: 'DOS 게임',
  },
  'DOSBox-x': {
    type: 'dosbox',
    alternative: 'dosbox',
    imageInfo: null,
    supported: true,
    description: 'DOS 게임 (DOSBox-X)',
  },

  // ============================================
  // Windows 95 Korean (한국어) - DOSBox-X 호환을 위해 W95KR-x 사용
  // ============================================
  'W95KR': {
    type: 'w95kr',
    alternative: 'w95kr',
    imageInfo: WIN9X_IMAGES['W95KR-x'] || null,  // 원본: WIN9X_IMAGES['W95KR_Daum']
    supported: true,
    description: 'Windows 95 한국어 게임',
  },
  'W95KR_Daum': {
    type: 'w95kr',
    alternative: 'w95kr',
    imageInfo: WIN9X_IMAGES['W95KR-x'] || null,  // 원본: WIN9X_IMAGES['W95KR_Daum']
    supported: true,
    description: 'Windows 95 한국어 게임 (Daum)',
  },
  'W95KR_Daum_Final': {
    type: 'w95kr',
    alternative: 'w95kr',
    imageInfo: WIN9X_IMAGES['W95KR-x'] || null,  // 원본: WIN9X_IMAGES['W95KR_Daum_Final']
    supported: true,
    description: 'Windows 95 한국어 게임 (Daum Final)',
  },

  // ============================================
  // Windows 95 Japanese (일본어) - DOSBox-X 호환을 위해 W95JP-x 사용
  // ============================================
  'W95JP': {
    type: 'w95jp',
    alternative: 'w95jp',
    imageInfo: WIN9X_IMAGES['W95JP-x'] || null,  // 원본: WIN9X_IMAGES['W95JP_Daum']
    supported: true,
    description: 'Windows 95 일본어 게임',
  },
  'W95JP_Daum': {
    type: 'w95jp',
    alternative: 'w95jp',
    imageInfo: WIN9X_IMAGES['W95JP-x'] || null,  // 원본: WIN9X_IMAGES['W95JP_Daum']
    supported: true,
    description: 'Windows 95 일본어 게임 (Daum)',
  },
  'W95JP_Daum_Final': {
    type: 'w95jp',
    alternative: 'w95jp',
    imageInfo: WIN9X_IMAGES['W95JP-x'] || null,  // 원본: WIN9X_IMAGES['W95JP_Daum_Final']
    supported: true,
    description: 'Windows 95 일본어 게임 (Daum Final)',
  },

  // ============================================
  // Windows 95 English (영어) - DOSBox-X 호환을 위해 W95EN-x 사용
  // ============================================
  'W95EN': {
    type: 'w95en',
    alternative: 'w95en',
    imageInfo: WIN9X_IMAGES['W95EN-x'] || null,  // 원본: WIN9X_IMAGES['W95EN_Daum']
    supported: true,
    description: 'Windows 95 영어 게임',
  },
  'W95EN_Daum': {
    type: 'w95en',
    alternative: 'w95en',
    imageInfo: WIN9X_IMAGES['W95EN-x'] || null,  // 원본: WIN9X_IMAGES['W95EN_Daum']
    supported: true,
    description: 'Windows 95 영어 게임 (Daum)',
  },
  'W95EN_Daum_Final': {
    type: 'w95en',
    alternative: 'w95en',
    imageInfo: WIN9X_IMAGES['W95EN-x'] || null,  // 원본: WIN9X_IMAGES['W95EN_Daum_Final']
    supported: true,
    description: 'Windows 95 영어 게임 (Daum Final)',
  },

  // ============================================
  // Windows 98 Korean (한국어) - DOSBox-X 호환을 위해 W98KR-x 사용
  // ============================================
  'W98KR': {
    type: 'w98kr',
    alternative: 'w98kr',
    imageInfo: WIN9X_IMAGES['W98KR-x'] || null,  // 원본: WIN9X_IMAGES['W98KR_Daum']
    supported: true,
    description: 'Windows 98 한국어 게임',
  },
  'W98KR_Daum': {
    type: 'w98kr',
    alternative: 'w98kr',
    imageInfo: WIN9X_IMAGES['W98KR-x'] || null,  // 원본: WIN9X_IMAGES['W98KR_Daum']
    supported: true,
    description: 'Windows 98 한국어 게임 (Daum)',
  },
  'W98KR_Daum_Final': {
    type: 'w98kr',
    alternative: 'w98kr',
    imageInfo: WIN9X_IMAGES['W98KR-x'] || null,  // 원본: WIN9X_IMAGES['W98KR_Daum_Final']
    supported: true,
    description: 'Windows 98 한국어 게임 (Daum Final)',
  },

  // ============================================
  // Windows 98 Japanese (일본어) - DOSBox-X 호환을 위해 W98JP-x 사용
  // ============================================
  'W98JP': {
    type: 'w98jp',
    alternative: 'w98jp',
    imageInfo: WIN9X_IMAGES['W98JP-x'] || null,  // 원본: WIN9X_IMAGES['W98JP_Daum']
    supported: true,
    description: 'Windows 98 일본어 게임',
  },
  'W98JP_Daum': {
    type: 'w98jp',
    alternative: 'w98jp',
    imageInfo: WIN9X_IMAGES['W98JP-x'] || null,  // 원본: WIN9X_IMAGES['W98JP_Daum']
    supported: true,
    description: 'Windows 98 일본어 게임 (Daum)',
  },
  'W98JP_Daum_Final': {
    type: 'w98jp',
    alternative: 'w98jp',
    imageInfo: WIN9X_IMAGES['W98JP-x'] || null,  // 원본: WIN9X_IMAGES['W98JP_Daum_Final']
    supported: true,
    description: 'Windows 98 일본어 게임 (Daum Final)',
  },

  // ============================================
  // Windows 98 English (영어) - DOSBox-X 호환을 위해 W98EN-x 사용
  // ============================================
  'W98EN': {
    type: 'w98en',
    alternative: 'w98en',
    imageInfo: WIN9X_IMAGES['W98EN-x'] || null,  // 원본: WIN9X_IMAGES['W98EN_Daum']
    supported: true,
    description: 'Windows 98 영어 게임',
  },
  'W98EN_Daum': {
    type: 'w98en',
    alternative: 'w98en',
    imageInfo: WIN9X_IMAGES['W98EN-x'] || null,  // 원본: WIN9X_IMAGES['W98EN_Daum']
    supported: true,
    description: 'Windows 98 영어 게임 (Daum)',
  },
  'W98EN_Daum_Final': {
    type: 'w98en',
    alternative: 'w98en',
    imageInfo: WIN9X_IMAGES['W98EN-x'] || null,  // 원본: WIN9X_IMAGES['W98EN_Daum_Final']
    supported: true,
    description: 'Windows 98 영어 게임 (Daum Final)',
  },

  // ============================================
  // 네이티브 Windows - 미지원
  // ============================================
  'Windows': {
    type: 'windows',
    alternative: null,
    imageInfo: null,
    supported: false,
    description: '네이티브 Windows 프로그램 (미지원)',
  },

  // PCem 계열 - 미지원
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

  // 접두사로 매칭 (W95XX_*, W98XX_*) - DOSBox-X 호환을 위해 -x 이미지 사용
  // Windows 95 계열
  if (executerName.startsWith('W95KR')) {
    return {
      type: 'w95kr',
      alternative: 'w95kr',
      imageInfo: WIN9X_IMAGES['W95KR-x'] || null,  // 원본: WIN9X_IMAGES['W95KR_Daum_Final']
      supported: true,
      description: `Windows 95 한국어 게임 (${executerName})`,
    };
  }
  if (executerName.startsWith('W95JP')) {
    return {
      type: 'w95jp',
      alternative: 'w95jp',
      imageInfo: WIN9X_IMAGES['W95JP-x'] || null,  // 원본: WIN9X_IMAGES['W95JP_Daum_Final']
      supported: true,
      description: `Windows 95 일본어 게임 (${executerName})`,
    };
  }
  if (executerName.startsWith('W95EN')) {
    return {
      type: 'w95en',
      alternative: 'w95en',
      imageInfo: WIN9X_IMAGES['W95EN-x'] || null,  // 원본: WIN9X_IMAGES['W95EN_Daum_Final']
      supported: true,
      description: `Windows 95 영어 게임 (${executerName})`,
    };
  }

  // Windows 98 계열
  if (executerName.startsWith('W98KR')) {
    return {
      type: 'w98kr',
      alternative: 'w98kr',
      imageInfo: WIN9X_IMAGES['W98KR-x'] || null,  // 원본: WIN9X_IMAGES['W98KR_Daum_Final']
      supported: true,
      description: `Windows 98 한국어 게임 (${executerName})`,
    };
  }
  if (executerName.startsWith('W98JP')) {
    return {
      type: 'w98jp',
      alternative: 'w98jp',
      imageInfo: WIN9X_IMAGES['W98JP-x'] || null,  // 원본: WIN9X_IMAGES['W98JP_Daum_Final']
      supported: true,
      description: `Windows 98 일본어 게임 (${executerName})`,
    };
  }
  if (executerName.startsWith('W98EN')) {
    return {
      type: 'w98en',
      alternative: 'w98en',
      imageInfo: WIN9X_IMAGES['W98EN-x'] || null,  // 원본: WIN9X_IMAGES['W98EN_Daum_Final']
      supported: true,
      description: `Windows 98 영어 게임 (${executerName})`,
    };
  }

  // 기본값: DOSBox
  return {
    type: 'dosbox',
    alternative: 'dosbox',
    imageInfo: null,
    supported: true,
    description: 'DOS 게임',
  };
}

/**
 * 이미지 이름으로 Win9x 이미지 정보 조회
 */
export function getWin9xImageInfo(imageName: string): Win9xImageInfo | null {
  return WIN9X_IMAGES[imageName] || null;
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
    case 'w95jp':
      return 'w95jp';
    case 'w95en':
      return 'w95en';
    case 'w98kr':
      return 'w98kr';
    case 'w98jp':
      return 'w98jp';
    case 'w98en':
      return 'w98en';
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
