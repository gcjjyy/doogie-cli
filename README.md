# 두기의 고전게임 런처 CLI

<img width="1324" height="611" alt="Screenshot 2025-12-27 at 00 46 58" src="https://github.com/user-attachments/assets/48dbb8da-e01f-4889-a9ad-7ca0e9723bba" />

[두기의 고전게임](https://nemo838.tistory.com/) 사이트에서 DOS 게임을 검색, 다운로드하고 실행할 수 있는 **macOS/Linux 전용** CLI 도구입니다.

> **Windows 사용자**: Windows에서는 [공식 두기 런처](https://nemo838.tistory.com/)를 사용해주세요.

## 주의사항

> ⚠️ 이 프로젝트는 아직 개발 초기 단계입니다.

- **지원 플랫폼**: macOS, Linux (Windows 미지원)
- **지원 게임**: 현재 DOS 게임만 지원됩니다.
- **지원 실행기**: DOSBox-X, DOSBox만 지원됩니다. 오리지널 두기 런처의 다른 실행기(Windows 등)는 지원되지 않습니다.
- **테스트 환경**: 현재 macOS에서만 테스트되었습니다. Linux는 아직 테스트되지 않았습니다.

## 주요 기능

- 온라인 게임 검색 및 다운로드
- 설치된 게임 목록 관리
- DOSBox/DOSBox-X를 통한 게임 실행
- CD 이미지 자동 마운트
- 게임별 CPU 사이클 및 설정 자동 적용
- **macOS: 필요한 프로그램 자동 설치** (Homebrew, DOSBox-X, 7-Zip)

## 요구 사항

DOSBox-X 또는 DOSBox가 필요합니다. macOS에서는 자동 설치를 지원하며, Linux에서는 수동 설치가 필요합니다.

### macOS (자동 설치 지원)

**macOS에서는 필요한 프로그램이 필요할 때 자동으로 설치됩니다.**

- **게임 다운로드 시**: p7zip이 없으면 설치 제안
- **게임 실행 시**: DOSBox-X (또는 DOSBox)가 없으면 설치 제안
- **Homebrew**: 위 프로그램 설치가 필요한데 없으면 먼저 설치 제안

사용자 확인 후 자동으로 설치되므로 별도의 사전 설치가 필요 없습니다.

수동 설치를 원할 경우:
```bash
# Homebrew 설치
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# DOSBox-X 설치 (권장)
brew install dosbox-x

# 7-Zip 설치
brew install p7zip
```

### Linux (수동 설치 필요)

```bash
# Ubuntu/Debian
sudo apt install dosbox p7zip-full

# DOSBox-X (Flatpak)
flatpak install flathub com.dosbox_x.DOSBox-X
```

## 설치

### 빌드된 바이너리 사용

[Releases](https://github.com/your-repo/doogie-cli/releases) 페이지에서 플랫폼에 맞는 바이너리를 다운로드하세요.

### 소스에서 빌드

```bash
# Bun 설치 (https://bun.sh)
curl -fsSL https://bun.sh/install | bash

# 의존성 설치
bun install

# 빌드
bun run build:macos    # macOS
bun run build:linux    # Linux
```

## 사용법

```bash
./doogie-cli
```

### 메인 메뉴

- **게임 목록**: 설치된 게임 보기 및 실행
- **온라인 게임 검색**: 두기의 고전게임에서 게임 검색 및 다운로드
- **URL로 다운로드**: 티스토리 URL 직접 입력하여 다운로드

### 게임 실행

1. 게임 목록에서 게임 선택
2. 최초 실행 시 자동으로 압축 해제
3. DOSBox-X/DOSBox로 게임 실행

## 데이터 저장 위치

모든 데이터는 `~/.doogie-cli/` 디렉토리에 저장됩니다:

```
~/.doogie-cli/
├── games/          # 다운로드된 게임 파일
├── doogie.db       # 게임 데이터베이스
└── temp/           # 임시 파일
```

## 기술 스택

- **Runtime**: [Bun](https://bun.sh)
- **Language**: TypeScript
- **CLI UI**: [@clack/prompts](https://github.com/natemoo-re/clack)
- **Database**: SQLite (Drizzle ORM)
- **HTML Parser**: Cheerio

## 라이선스

MIT License - [LICENSE](LICENSE) 파일 참조

## 크레딧

- 게임 리소스: [두기의 고전게임](https://nemo838.tistory.com/)
- 이 프로젝트는 두기의 고전게임 사이트의 게임을 편리하게 즐기기 위한 비공식 CLI 도구입니다.
