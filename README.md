# 두기의 고전게임 런처 CLI

[두기의 고전게임](https://nemo838.tistory.com/) 사이트의 DOS/Windows 게임을 macOS/Linux에서 즐길 수 있는 CLI 도구입니다.

> **비공식 프로그램**: 이 프로젝트는 공식 두기 런처와 무관한 비공식 도구입니다. 모든 게임이 공식 런처와 동일하게 구동되지 않을 수 있습니다.

> **Windows 사용자**: [공식 두기 런처](https://nemo838.tistory.com/)를 사용해주세요.

<img width="1739" height="814" alt="image" src="https://github.com/user-attachments/assets/e64f52af-f16c-4b1c-be04-40328a2be9dd" />

## 설치

### macOS (Homebrew)

```bash
brew tap gcjjyy/doogie
brew install doogie-cli
```

### Linux

원라인 설치 (권장):

```bash
curl -fsSL https://raw.githubusercontent.com/gcjjyy/doogie-cli/main/install.sh | sh
```

이 스크립트는 doogie-cli와 함께 DOSBox-X, 7-Zip을 자동으로 설치합니다.

**지원 배포판**: Debian/Ubuntu, Fedora, RHEL/CentOS, Arch Linux, openSUSE

#### 수동 설치

[Releases](https://github.com/gcjjyy/doogie-cli/releases)에서 다운로드:

```bash
# x64
tar -xzf doogie-cli-linux-x64.tar.gz
sudo mv doogie-cli-linux-x64 /usr/local/bin/doogie

# ARM64 (Raspberry Pi 등)
tar -xzf doogie-cli-linux-arm64.tar.gz
sudo mv doogie-cli-linux-arm64 /usr/local/bin/doogie
```

### 소스에서 빌드

```bash
curl -fsSL https://bun.sh/install | bash  # Bun 설치
bun install && bun run build
```

## 사용법

```bash
doogie
```

- **게임 목록**: 설치된 게임 실행/관리
- **게임 추가**: 티스토리 URL로 게임 다운로드
- **홈페이지**: 두기의 고전게임 사이트 열기

## 지원 현황

### 플랫폼

| OS | 아키텍처 | 지원 | 비고 |
|----|----------|------|------|
| macOS | Apple Silicon (arm64) | ✅ | Homebrew |
| macOS | Intel (x64) | ✅ | Homebrew |
| Linux | x64 | ✅ | install.sh / 수동 |
| Linux | ARM64 | ✅ | install.sh / 수동 |
| Windows | - | ❌ | [공식 두기 런처](https://nemo838.tistory.com/) 사용 |

### 게임 유형

| 유형 | 지원 | 비고 |
|------|------|------|
| DOS 게임 | ✅ | DOSBox-X |
| Windows 95 게임 | ✅ | W95KR-x 이미지 |
| Windows 98 게임 | ✅ | W98KR-x 이미지 |
| PCem 게임 | ❌ | 미지원 |

## 데이터 저장 위치

```
~/.doogie-cli/
├── games/      # 다운로드된 게임
├── util/       # DOS 유틸리티 (태백한글, SB16 등)
├── w95kr-x/    # Windows 95 이미지
├── w98kr-x/    # Windows 98 이미지
└── doogie.db   # 데이터베이스
```

## 라이선스

MIT License

---

게임 리소스: [두기의 고전게임](https://nemo838.tistory.com/)
