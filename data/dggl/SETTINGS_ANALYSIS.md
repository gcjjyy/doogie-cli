# 두기 런처 설정 구조 분석

## 파일 구조

### Default.conf
- 6192 라인의 기본 설정 파일
- 라인 번호가 설정 위치를 나타냄
- Win9x 옵션: 라인 153-163

### Options/
- 실행기별 DOSBox 설정 템플릿 (W95KR-x.conf, W98KR-x.conf 등)
- `@placeholder@` 형식의 변수를 Default.conf 값으로 치환

### LangKR/Option.dat
- 모든 옵션의 정의와 가능한 값들
- 섹션별로 `@T섹션명` 형식으로 구분

## edit.conf 형식

게임별 특화설정 파일. `섹션인덱스|옵션인덱스|값` 형식.

### 섹션 인덱스 매핑 (ver.23.01.10)
```
0: @Tdefault        - 실행기 선택
1: @Twin9x options  - Win9x 디스플레이 설정
2: @Tpcem options   - PCem 설정
3: @T---------      - 구분자
4: @Tlog            - 로그 설정
5: @Tsdl            - SDL 설정
6: @Tdos            - DOS 설정
7: @Tdosbox         - DOSBox 설정 (memsize 등)
8: @Tcpu            - CPU 설정 (core, cputype, cycles)
```

## Win9x 옵션 (@Twin9x options)

Default.conf 라인 153-163:
```
153: new         # VGA 드라이버 (new/old)
154: 640x8       # 해상도 (너비x비트)  - 8=256색, 16=하이컬러
155: true        # DDRAW 가속
156: true        # D3D 가속
157: true        # 3DFX 가속
158: SBFM        # MIDI 드라이버 (SBFM/MPU401)
159: 255         # Master 볼륨
160: 255         # Wave 볼륨
161: 255         # MIDI 볼륨
162: 128         # CD 볼륨
163: false       # 커스텀 부팅
```

### 해상도 형식
`{너비}x{비트}` 형식:
- 640x8 = 640x480, 8비트 (256색)
- 640x16 = 640x480, 16비트 (65536색)
- 800x8 = 800x600, 8비트 (256색)
- 1024x16 = 1024x768, 16비트 (65536색)

## 예시: 공명전 vs 조조전

### 공명전 (ver.23.01.10)
```
0|0|W95KR_Daum_Final    # 실행기: W95KR
7|3|256                 # DOSBox memsize: 256MB
8|0|dynamic             # CPU core: dynamic
8|1|pentium             # CPU type: pentium
8|2|max                 # CPU cycles: max
```
- 해상도: Default.conf 기본값 사용 (640x8 = 256색)

### 조조전 (ver.20.01.21 - 구버전)
```
0|0|W98KR_Daum_Final    # 실행기: W98KR
3|3|256                 # (구버전) DOSBox memsize: 256MB
21|1|800x8              # 해상도: 800x8 (256색)
```
- 해상도: 명시적으로 800x8 (256색) 설정

## DX.REG 적용 방식

1. DOSBox-X 실행 전 Win95/98.img 마운트
2. /DX.REG 파일에 디스플레이 설정 작성:
   ```reg
   [HKEY_LOCAL_MACHINE\Config\0001\Display\Settings]
   "BitsPerPixel"="8"
   "Resolution"="640,480"
   ```
3. Windows 부팅 시 AUTOEXEC.BAT에서 `regedit c:\dx.reg` 실행
4. 지정된 해상도/색상으로 Windows 시작

## 구현 노트

현재 doogie-cli는:
- 모든 Win9x 게임에 8비트 (256색) 기본 적용
- Default.conf의 기본값 (640x8)과 일치
- 공명전, 조조전 모두 정상 작동 예상
