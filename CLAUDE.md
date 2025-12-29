# 두기의 고전게임 런처 CLI (doogie-cli)

## 프로젝트 개요
티스토리 기반의 "두기의 고전게임" 사이트(https://nemo838.tistory.com)에서 게임을 다운로드하고, 압축 해제 후 DOSBox/DOSBox-X로 실행하는 크로스 플랫폼 CLI 도구

## 기술 스택
- **Runtime**: Bun v1.2+
- **Language**: TypeScript 5.x
- **CLI**: @clack/prompts
- **ORM**: Drizzle ORM + bun:sqlite
- **HTML 파싱**: cheerio
- **빌드**: `bun build --compile` (단일 실행파일)

## 프로젝트 구조
```
src/
├── index.ts              # CLI 진입점
├── commands/
│   ├── list.ts           # 게임 목록/검색/실행
│   └── download.ts       # 게임 다운로드
├── services/
│   ├── tistory.ts        # 티스토리 파싱/다운로드 (5개 동시)
│   ├── extractor.ts      # 7z 압축 해제
│   ├── launcher.ts       # DOSBox/DOSBox-X 실행
│   └── database.ts       # SQLite CRUD
├── db/
│   ├── schema.ts         # Drizzle ORM 스키마
│   └── index.ts          # DB 연결
├── utils/
│   ├── paths.ts          # 경로 유틸리티 (~/.doogie-cli/)
│   └── platform.ts       # 플랫폼 감지, DOSBox 경로
└── types/
    └── index.ts          # 타입 정의
```

## 주요 상수
- **7z 비밀번호**: `http://nemo838.tistory.com/`
- **데이터 경로**: `~/.doogie-cli/`
- **게임 저장**: `~/.doogie-cli/games/`
- **데이터베이스**: `~/.doogie-cli/doogie.db`

## 명령어
```bash
bun run dev          # 개발 모드 실행
bun run build        # 현재 플랫폼 빌드
bun run build:all    # 모든 플랫폼 빌드
bun run tsc          # 타입 체크
```

## 빌드 타겟
- macOS arm64/x64
- Linux x64
- (Windows 미지원 - 공식 두기 런처 사용)

## 개발 지침

### 플랫폼 독립적 코드 작성
- **hdiutil 사용 금지**: macOS 전용 명령어이므로 사용하지 않음
- **이미지 파일에 직접 쓰기 금지**: Win95.img, Win98.img 등에 직접 파일을 쓰지 않음
- **호스트 파일 + DOSBox 마운트 방식 사용**:
  1. 호스트 파일시스템에 파일 생성 (예: DX.REG, Game.txt)
  2. DOSBox-X autoexec에서 해당 디렉토리를 드라이브로 마운트
  3. COPY 명령으로 C: 드라이브에 복사

```conf
# 예시: autoexec에서 호스트 파일을 C:로 복사
MOUNT Y "/path/to/host/dir"
IMGMOUNT C "Win95.img" -ide 1m
COPY Y:\DX.REG C:\DX.REG
COPY Y:\Game.txt C:\Game.txt
MOUNT -u Y
BOOT C:
```

## 릴리즈 방법
GitHub 릴리즈 생성 시 실행 권한 보존을 위해 tar.gz로 압축하여 업로드합니다.

**중요**: gh release 명령어에서 파일 경로는 반드시 **절대 경로**를 사용해야 합니다. 상대 경로(`./dist/...`)는 zsh에서 glob 오류가 발생합니다.

```bash
# 1. 버전 업데이트
# - package.json의 version 수정

# 2. 모든 플랫폼 빌드
bun run build:all

# 3. tar.gz 압축 (실행 권한 보존) - dist 디렉토리에서 실행
cd dist && \
tar -czvf doogie-cli-macos-arm64.tar.gz doogie-cli-macos-arm64 && \
tar -czvf doogie-cli-macos-x64.tar.gz doogie-cli-macos-x64 && \
tar -czvf doogie-cli-linux-x64.tar.gz doogie-cli-linux-x64

# 4. GitHub 릴리즈 생성 (절대 경로 사용!)
gh release create v0.x.x \
  --title "v0.x.x" \
  --notes "릴리즈 노트..." \
  /full/path/to/dist/doogie-cli-macos-arm64.tar.gz \
  /full/path/to/dist/doogie-cli-macos-x64.tar.gz \
  /full/path/to/dist/doogie-cli-linux-x64.tar.gz

# 5. Homebrew Formula 업데이트 (homebrew-doogie 저장소)
# SHA256 해시 생성
cd dist && shasum -a 256 *.tar.gz

# homebrew-doogie/Formula/doogie-cli.rb 파일에서:
# - version "0.x.x" 업데이트
# - 각 플랫폼의 sha256 값 업데이트
# - 커밋 및 푸시
```

**주의사항**:
- 바이너리를 직접 업로드하면 다운로드 시 실행 권한이 유실됩니다. 반드시 tar.gz로 압축하여 업로드해야 합니다.
- gh release 파일 경로는 절대 경로 사용 (예: `/Users/xxx/doogie-cli/dist/...`)
- Homebrew tap: https://github.com/gcjjyy/homebrew-doogie

## 파일명 패턴 (두기의 고전게임)
- 게임: `{CODE}_{DATE}.7z.001` ~ `.xxx` (분할 압축)
- 설정: `{CODE}_{DATE}_Config.7z`
- 매뉴얼: `{CODE}_{DATE}_Manual.7z` 또는 `.7z.001`

## DOSBox 지원
- DOSBox-X 우선 탐지 (권장)
- DOSBox-X가 없으면 원본 DOSBox 사용
- 플랫폼별 자동 경로 탐지

## Win9x (Windows 95/98) 지원
일부 게임은 Windows 95/98 환경이 필요합니다.

- **W95KR 저장 경로**: `~/.doogie-cli/w95kr-x/`
- **W98KR 저장 경로**: `~/.doogie-cli/w98kr-x/`
- **필요 조건**: DOSBox-X (기본 DOSBox는 미지원)
- **자동 설치**: 게임 실행 시 필요한 이미지를 자동으로 다운로드 제안

### Win9x 이미지 종류
| 이미지 | 용도 | URL | 크기 |
|--------|------|-----|------|
| W95KR-x | Windows 95 (DOSBox-X) | https://nemo838.tistory.com/6530 | ~50MB |
| W98KR-x | Windows 98 (DOSBox-X) | https://nemo838.tistory.com/6566 | ~94MB |

### 게임별 Win9x 버전 판단
1. `edit.conf`의 `0|0` 값 확인: `W95KR_*` 또는 `W98KR_*`
2. `CFGFILE`의 접두사: `[KR95]` 또는 `[KR98]`

DOSBox-X 사용 시 자동으로 적절한 이미지를 다운로드합니다.

### Win9x 이미지 구조
```
W95KR-x/  또는  W98KR-x/
├── Win95.img 또는 Win98.img   # Windows 하드 디스크 이미지
├── DiskParm.txt               # 디스크 geometry (512,63,16,489)
├── Ver.txt                    # 버전 정보
├── DX.REG                     # 디스플레이 설정 레지스트리
└── DGGL/                      # 두기 런처 설정 파일들
    ├── Res/                   # 해상도 레지스트리 (640x8.REG 등)
    ├── D3D/                   # D3D 설정
    ├── DDRAW/                 # DDRAW 설정
    └── Volume/                # 볼륨 설정
```

### Win9x 디스플레이 설정 (DX.REG)
게임 실행 전 Win95/98.img의 DX.REG를 업데이트하여 디스플레이 설정을 적용합니다.

```reg
[HKEY_LOCAL_MACHINE\Config\0001\Display\Settings]
"BitsPerPixel"="8"        # 8=256색, 16=하이컬러
"Resolution"="640,480"
```

- Default.conf 기본값: `640x8` (256색)
- Windows 부팅 시 AUTOEXEC.BAT에서 `regedit c:\dx.reg` 실행
- 지정된 해상도/색상으로 Windows 시작

### W98KR 게임 autoexec.conf 형식
```
[SELECT]
[NEW]
TITLE:도스박스로 구동
|___[SELECT]
|___[NEW]
|___TITLE:1배속 - 오리지날 버전
|___EXECUTER:W98KR_Daum_Final     # W98KR 실행기 사용
|___CFGFILE:[KR98]D3D_Daum_Final.conf  # DOSBox-X 설정 파일
image.img                          # 게임 하드 디스크 이미지
512,63,64,703                      # 디스크 geometry
```

### 실행 방식
1. Win98.img를 C: 드라이브로 마운트 (IDE primary master)
2. 게임 image.img를 D: 드라이브로 마운트 (IDE primary slave)
3. DOSBox-X로 Windows 98 부팅
4. Windows 98 안에서 D: 드라이브의 게임 실행

## 데이터베이스 스키마
- `games`: id, name, code, genre, sourceUrl, launcherType, isExtracted, localPath
- `download_files`: id, gameId, filename, fileType, downloadUrl, downloaded

## Config.7z 파일 구조
**인코딩: EUC-KR** (UTF-8로 변환 필요)

```
DosBox/
├── autoexec.conf      # 실행 명령어 (다중 메뉴 지원)
├── edit.conf          # 런처 설정
├── CD.conf            # CD 관련 설정 (선택적)
├── info.txt           # 게임명 + 업데이트 로그
├── GenreE.dat         # 영어 장르 (RPG, SLG, RPG-Strategy 등)
├── GenreK.dat         # 한글 장르
├── ExtraInfo.txt      # 제작사 / 언어 / 출시년도
├── Icon.jpg           # 아이콘
├── *_xxx.png          # 스크린샷
└── Videos/            # 비디오 폴더
```

### autoexec.conf 형식

#### 단순 형식 (옛날)
```
addkey p300 2 p100 2 p100 3    # 키 매크로 (두기 런처 전용, 무시)
poker.exe                       # 실행할 게임 파일
```

#### 다중 메뉴 형식 (최신)
```
[SELECT]                        # 선택 메뉴 시작
[NEW]                           # 새 항목
TITLE:게임 실행                  # 메뉴 이름
CD GENESIS2                     # 디렉토리 이동 (선택적)
GENE2.COM                       # 실행 파일
[NEW]
TITLE:에디터
EXECUTER:Windows                # Windows 실행기 사용 (DOSBox가 아닌)
editor.exe
```

### edit.conf 형식
게임별 특화설정 파일. `섹션인덱스|옵션인덱스|값` 형식으로 Default.conf 값을 오버라이드합니다.

```
ver.23.01.10                    # 버전 (YY.MM.DD)
0|0|W95KR_Daum_Final            # 섹션0(default), 옵션0(실행기) = W95KR
7|3|256                         # 섹션7(dosbox), 옵션3(memsize) = 256MB
8|0|dynamic                     # 섹션8(cpu), 옵션0(core) = dynamic
8|1|pentium                     # 섹션8(cpu), 옵션1(cputype) = pentium
8|2|max                         # 섹션8(cpu), 옵션2(cycles) = max
```

#### 섹션 인덱스 (ver.23.01.10)
| 인덱스 | 섹션명 | 주요 옵션 |
|--------|--------|-----------|
| 0 | default | 실행기 선택 |
| 1 | win9x | 디스플레이 설정 |
| 7 | dosbox | memsize, vmemsize |
| 8 | cpu | core, cputype, cycles |

**주의**: 버전에 따라 섹션 인덱스가 다를 수 있음

### info.txt 형식
```
창세기전 2<ETX>The War of Genesis 2   # 첫 줄: 한글명 + 영문명 (구분자: \x03 ETX)
2023.06.27 수정:                       # 이후: 업데이트 로그 (선택적)
 - 에디터 추가
```
- 한글명과 영문명은 ETX 문자(\x03)로 구분됨

### ExtraInfo.txt 형식
```
소프트맥스           # 줄1: 제작사
한국어,Korean        # 줄2: 언어 (한글,영문)
1996                 # 줄3: 출시년도
```

### CD.conf 형식
```
0                    # CD 관련 설정
1
```
