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
- Windows x64
- Linux x64

## 파일명 패턴 (두기의 고전게임)
- 게임: `{CODE}_{DATE}.7z.001` ~ `.xxx` (분할 압축)
- 설정: `{CODE}_{DATE}_Config.7z`
- 매뉴얼: `{CODE}_{DATE}_Manual.7z` 또는 `.7z.001`

## DOSBox 지원
- DOSBox-X 우선 탐지 (권장)
- DOSBox-X가 없으면 원본 DOSBox 사용
- 플랫폼별 자동 경로 탐지

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
```
ver.23.01.10                    # 버전 (YY.MM.DD)
5|5|true                        # 설정1
8|1|486                         # CPU 타입?
8|2|25000                       # CPU 사이클?
6|1|false                       # 설정4
```

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
