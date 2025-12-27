# 두기의 고전게임 런처 CLI

[두기의 고전게임](https://nemo838.tistory.com/) 사이트의 DOS/Windows 게임을 macOS/Linux에서 즐길 수 있는 CLI 도구입니다.

> **Windows 사용자**: [공식 두기 런처](https://nemo838.tistory.com/)를 사용해주세요.

<img width="1324" height="611" alt="Screenshot" src="https://github.com/user-attachments/assets/48dbb8da-e01f-4889-a9ad-7ca0e9723bba" />

## 설치

### 바이너리 다운로드 (권장)

[Releases](https://github.com/gcjjyy/doogie-cli/releases)에서 플랫폼에 맞는 파일 다운로드

```bash
# macOS (Apple Silicon)
tar -xzf doogie-cli-macos-arm64.tar.gz
./doogie-cli-macos-arm64

# macOS (Intel)
tar -xzf doogie-cli-macos-x64.tar.gz
./doogie-cli-macos-x64

# Linux
tar -xzf doogie-cli-linux-x64.tar.gz
./doogie-cli-linux-x64
```

### 소스에서 빌드

```bash
curl -fsSL https://bun.sh/install | bash  # Bun 설치
bun install && bun run build
```

## 요구 사항

| 플랫폼 | 필요 프로그램 | 비고 |
|--------|--------------|------|
| macOS | DOSBox-X, p7zip | 자동 설치 |
| Linux | DOSBox-X, p7zip | `sudo apt install p7zip-full` + Flatpak DOSBox-X |

## 사용법

```bash
./doogie-cli
```

- **게임 목록**: 설치된 게임 실행
- **온라인 게임 검색**: 게임 검색 및 다운로드
- **URL로 다운로드**: 티스토리 URL 직접 입력

## 지원 현황

| 게임 유형 | 지원 | 비고 |
|----------|------|------|
| DOS 게임 | ✅ | DOSBox-X |
| Windows 95 게임 | ✅ | W95KR-x 이미지 |
| Windows 98 게임 | ✅ | W98KR-x 이미지 |
| PCem 게임 | ❌ | 미지원 |

## 데이터 저장 위치

```
~/.doogie-cli/
├── games/      # 다운로드된 게임
├── w95kr-x/    # Windows 95 이미지
├── w98kr-x/    # Windows 98 이미지
└── doogie.db   # 데이터베이스
```

## 라이선스

MIT License

---

게임 리소스: [두기의 고전게임](https://nemo838.tistory.com/)
