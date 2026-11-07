# shell

모든 화면을 감싸는 공통 틀: 루트 레이아웃(머리말·바닥글·글꼴·테마 초기화), 테마 전환, 모드 메뉴(읽기 ↔ 박물관), 그리고 디자인 토큰과 전역 스타일(`globals.css`).

## 코드 위치

- `src/app/layout.tsx` — 루트 레이아웃. 글꼴 세 벌, `metadata`, 깜빡임 막는 테마 스크립트, 머리말(`HashLink`·`SearchPalette`·`ThemeToggle`·`ModeMenu`), 바닥글, `Droplets`, Vercel `Analytics`
- `src/components/ThemeToggle.tsx` — `toggleTheme()`(빗방울 전환)과 머리말 테마 버튼
- `src/components/ModeMenu.tsx` — 머리말 오른쪽 끝 모드 메뉴와 첫 방문 안내 말풍선
- `src/app/globals.css` — 디자인 토큰과 사이트 전체 스타일(약 3000줄). 섹션별 소유 도메인은 아래 표

## 1. 컨텍스트 내부

### 디자인 토큰 (`:root`, 기본 = 다크)

| 토큰 | 다크(기본) | 밝음 `:root[data-theme='light']` |
| --- | --- | --- |
| `--black` / `--surface` / `--white` / `--orange` | `#0b0b0b` / `#141414` / `#ececec` / `#ff7a1a` | (원색. 밝음에서 다시 정의하지 않는다) |
| `--bg` | `var(--black)` | `#ece2d6` (크림) |
| `--bg-raised` | `var(--surface)` | `#e3d6c7` |
| `--ink` | `var(--white)` | `#2b2b2b` |
| `--ink-70` | `rgb(236 236 236 / 0.7)` | `rgb(43 43 43 / 0.75)` (크림에서는 70% 가 4.5:1 에 모자라 75%) |
| `--line` | `rgb(236 236 236 / 0.12)` | `rgb(43 43 43 / 0.14)` |
| `--line-strong` | `rgb(236 236 236 / 0.28)` | `rgb(43 43 43 / 0.3)` |
| `--accent` | `var(--orange)` | `#10286a` (남색) |
| `--on-accent` | `var(--black)` | `#ece2d6` |
| `color-scheme` | `dark` | `light` |

테마와 무관한 토큰:

| 토큰 | 값 |
| --- | --- |
| `--prose` | `680px` (본문 칸 폭) |
| `--radius` | `6px` |
| `--dur-instant` | `150ms` (반응) |
| `--dur-fast` | `200ms` (상태 변화) |
| `--dur-slow` | `640ms` (입장) |
| `--ease-out` | `cubic-bezier(0.2, 0.7, 0.2, 1)` |
| `--dur-liquid` | `480ms` (물방울) |
| `--ease-liquid` | `cubic-bezier(0.34, 1.56, 0.64, 1)` (살짝 지나쳤다 돌아옴) |

글꼴 변수는 `layout.tsx` 가 `<html>` 클래스로 건다: `--font-serif`(Noto Serif KR, 본문·제목), `--font-sans`(IBM Plex Sans KR, 고정폭 라벨 속 한글), `--font-mono`(IBM Plex Mono, 날짜·라벨·수치·코드). 세 벌 모두 weight `400·500·700`, `subsets: ['latin']`, `display: 'swap'`. `.mono` 는 `var(--font-mono), var(--font-sans), …` 순서와 `tabular-nums`.

기본 글자: `body` 16px, `line-height: 1.85`, `word-break: keep-all`. `.container` 최대 폭 960px, 머리말·바닥글 안쪽 최대 폭 1200px, `html { scroll-padding-top: 80px; overflow-x: clip }`.

### 박물관 전용 토큰 (`--m-*`, museum 도메인 소속)

`globals.css` 안에 있지만 museum 도메인 소속이다. `.museum-page` 에서 `--m-page #f7e7cf`, `--m-ink #3a2a20`, `--m-accent #ff7a1a`, `--m-bubble #fff8ec`, `--m-navy #2b3a67`, 두루마리 `.reader` 에서 `--m-paper #fbf0dc`, `--m-paper-edge #ecd8b4`, `--m-wood #a86a3e`, `--m-wood-dark #7a4a2c` 등을 정의한다. 이 모드만 세 가지 색 규칙에서 빠지며, 다른 화면으로 가져가지 않는다. 자세한 것은 museum spec.

### globals.css 섹션 지도

섹션은 주석 머리(`/* … */`)로 나뉜다. 순서대로:

| 섹션 머리 | 소유 도메인 |
| --- | --- |
| 디자인 토큰(`:root`), 밝음(`:root[data-theme='light']`), 기본 요소(`body`, `::selection`, `:focus-visible`, 링크, `button:active` scale 0.96) | shell |
| 테마 전환(`@property --rain-0…17`, `@keyframes rain-0…17`, `::view-transition-*`) | shell |
| `.mono`, `.accent`, `.container`, 헤더(`.site-header`, `.site-nav`, `.wordmark`, `.icon-btn`), `@keyframes rise` | shell |
| 첫 화면(`.hero`), 목록(`.row*`, `.badge`, `.rows__item`) | browse |
| 연구실(`.lab`, `.lab-card*`) | lab |
| 필터·물방울 탭(`.filters*`, `.liquid*`), 누른 자리 물방울(`.droplet`) | browse |
| 글 본문(`.post-shell`), 본문 끝(`.end-mark`), 목차(`.toc`), 본문 요소(`.prose`) | posts |
| 코드 블록(`.code`, 테마와 무관하게 늘 어둡다), 표, 그림·카드, 매개변수 그림(`.playground*`), 확대 표시, 단계 판정(`.stepper`), 그림 크게 보기(`.zoom`) | playgrounds |
| 키보드 키 모양(`.key`) | shell (browse·search·museum 이 함께 쓴다) |
| 머리말 검색 칸(`.search-trigger`), 검색(`.search*`), 자연어로 묻기 | search |
| 목록 머리 `j`/`k` 키(`.keys-hint`) | browse |
| 이어서 읽을 글(`.next-nav`, `:root[data-reading-done]`) | posts |
| 바닥글(`.site-footer`) | shell |
| 반응형 `@media (max-width: 1100px)`, `(max-width: 760px)`, `(max-width: 400px)`, `(hover: none)`, `prefers-reduced-motion: reduce` 모음 | 여러 도메인 공용 |
| 모드 고르기(`.mode*`), 첫 방문 말풍선(`.mode__hint`) | shell |
| `.sr-only` | shell |
| 박물관 모드(`.museum-page`, `.museum*`, 관람 수첩, 두루마리 펼침 `museum-unroll`, 도장) | museum |
| 좁은 폰 모드 메뉴(`.mode__icon`, `.mode__theme`, `@media (max-width: 460px)`) | shell |
| 박물관 글 읽기 두루마리(`.reader*`) | museum |

### 비즈니스 규칙

- **색은 바탕·글자·강조 세 가지**. 강조는 `--accent` 하나. 글자 투명도는 70% 아래로 내리지 않는다(밝음은 75%). 흐리게 할 때는 투명도 대신 `filter: blur` 를 쓴다(`:root[data-reading-done]`).
- **테마**: 다크가 기본이라 `data-theme` 속성이 없다. 밝음일 때만 `<html data-theme="light">`.
- **테마 전환(`toggleTheme`)**:
  - `localStorage['theme']` 에 `'light'` 또는 `'dark'` 를 쓴다(실패는 무시).
  - `prefers-reduced-motion: reduce` 이거나 `document.startViewTransition` 이 없으면 바로 바꾼다.
  - 아니면 빗방울 `DROPS = 18` 개를 6열 × 3행 격자 칸마다 하나씩, 칸 안 무작위 자리에 떨어뜨린다. 칸 순서도 섞는다. 자리는 `<html>` 에 `--rx-n`·`--ry-n`(%, 소수 1자리)으로 넣는다.
  - 바뀌는 동안 `<html>` 에 `data-theme-switching`(모든 transition 끄기)과 `data-theme-rain`(새 화면에 빗방울 mask)을 달고, `transition.finished` 에서 뗀다.
  - CSS: 방울마다 `820ms`, 지연 0ms 부터 약 53ms 간격으로 `900ms` 까지, 반지름은 `0 → 9px(12%) → 14px(32%) → 75vmax`. `::view-transition-group(root)` 는 `1720ms`.
- **모드 메뉴(`ModeMenu`)**:
  - `MODES`: `/` 읽기(글 목록), `/museum` 박물관(3D 기록관). 지금 모드는 `pathname.startsWith('/museum')` 로 정한다.
  - 메뉴는 바깥 `pointerdown` 이나 `Escape` 로 닫힌다. 메뉴 끝에 `테마 바꾸기`(같은 `toggleTheme`).
  - 안내 말풍선: `/museum` 이 아닌 곳에서 900ms 뒤 한 번 뜬다. 단 첫 방문에는 검색 안내(search 의 `TIP_KEY`)가 먼저라, 첫 렌더 때 `localStorage['evan-log:search-tip']` 가 `'1'` 이 아니면 이번 방문은 띄우지 않고 표시도 남기지 않는다(그래서 보통 두 번째 방문에 뜬다). 띄우기로 정한 순간 `localStorage['evan-log:museum-hint'] = '1'` 을 써서 다시 띄우지 않는다. `Escape`, `닫기`, `둘러보기 →`, 모드 버튼 누르기로 닫힌다. 메뉴가 열려 있으면 숨는다.
- **좁은 화면**: 760px 이하에서 모드 버튼의 `모드` 글자를 숨긴다. 460px 이하에서는 모드 버튼을 건물 아이콘(36px)만 남기고, 머리말 테마 버튼(`.site-nav .theme-btn`)을 숨기고 메뉴 안 `.mode__theme` 를 보인다. 400px 이하에서 머리말 간격을 8px 로 줄인다(360px 폰에서도 한 줄).
- **머리말 순서**: 워드마크 `evan.log`(→ `/`), `기술 노트`(`/#note`), `독후감`(`/#book`), `연구실`(`/#lab`), 검색, 테마, 모드. 바닥글은 GitHub·Medium 링크.
- **움직임**: 반복 애니메이션 금지(첫 화면 커서 막대도 깜빡이지 않는다). `prefers-reduced-motion: reduce` 블록에서 전환·입장 애니메이션을 끈다.

### 핵심 설계 결정

- **깜빡임 막는 인라인 스크립트**: `<head>` 의 `themeScript` 가 첫 화면을 그리기 전에 `localStorage['theme'] === 'light'` 면 `data-theme` 를 단다. 서버 HTML 과 달라지므로 `<html suppressHydrationWarning>`.
- **View Transition + `@property`**: 방울마다 반지름이 따로 움직여야 해서 방울 수만큼 `@property --rain-n` 과 `@keyframes rain-n` 을 둔다. 새 화면 스냅샷에 radial-gradient mask 18장을 겹친다.
- **테마 버튼을 모드 메뉴로 옮기는 방식**: 같은 `toggleTheme` 을 export 해 두 곳에서 부르고, 어느 쪽을 보일지는 CSS 미디어 쿼리가 정한다.
- **토큰만 쓴다**: 값을 직접 쓰지 않고 변수를 쓴다. 강조색을 새로 만들지 않는다.

## 2. 외부 노출 (Published Language)

### 라우트·메타데이터

- 루트 레이아웃(`LayoutProps<'/'>`). `metadata.title`: `{ default: 'evan.log', template: '%s · evan.log' }`, `description`: `백엔드 개발자 Evan 의 기술 노트와 독후감`.
- `<html lang="ko" data-scroll-behavior="smooth">`.

### export

```ts
// ThemeToggle.tsx
export function toggleTheme(): void;   // ModeMenu 도 부른다
export function ThemeToggle(): JSX.Element; // button.icon-btn.theme-btn

// ModeMenu.tsx
export function ModeMenu(): JSX.Element;
```

### 저장소·DOM 계약

| 계약 | 값 | 누가 쓰는가 |
| --- | --- | --- |
| `localStorage['theme']` | `'light'` \| `'dark'` | `ThemeToggle` 이 쓰고, `layout.tsx` 의 `themeScript` 가 읽는다 |
| `localStorage['evan-log:museum-hint']` | `'1'` | `ModeMenu` (`HINT_KEY`) |
| `<html data-theme="light">` | 밝음일 때만 | CSS 전체(`:root[data-theme='light']`, `.code` 밝음 보정 등) |
| `<html data-theme-switching>`, `<html data-theme-rain>` | 전환 중에만 | CSS 테마 전환 섹션 |
| `<html style="--rx-n; --ry-n">` (n = 0…17) | 빗방울 자리 | CSS `::view-transition-new(root)` mask |
| `<html data-reading-done>` | posts 의 `NextNav` 가 단다 | CSS 이어서 읽기 섹션(posts) |
| 클래스 `.icon-btn`, `.key`, `.mono`, `.accent`, `.container`, `.sr-only` | 공용 유틸리티 | 여러 도메인 컴포넌트 |

### 에러 계약

- 없음. `localStorage` 접근 실패는 모두 `try/catch` 로 무시한다(테마는 다크, 말풍선은 띄우지 않음).

## 3. Context Map

| 상대 도메인 | 방향 | 방식 |
| --- | --- | --- |
| browse | shell → browse | `layout.tsx` 가 `Droplets`(전역 물방울·`#goo` 필터)와 `HashLink` 를 그린다. 목록·필터 스타일은 `globals.css` |
| search | shell → search | `layout.tsx` 가 `getSearchItems()`(본문 제외)를 불러 `SearchPalette` 에 넘긴다. 검색 스타일은 `globals.css` |
| search | shell → search | `ModeMenu` 가 `SearchPalette` 의 `TIP_KEY` 를 import 해 읽고, 검색 안내를 본 다음 방문에 박물관 말풍선을 띄운다. 말풍선 모양(`.mode__hint*`)은 검색 안내도 함께 쓴다 |
| museum | 양방향 | `ModeMenu` 가 `/museum` 으로 링크하고 안내 말풍선을 띄운다. 박물관 스타일과 `--m-*` 토큰은 `globals.css` 안에 있지만 museum 소속 |
| posts / playgrounds / lab | shell → 각 도메인 | 스타일과 토큰만 제공한다. posts 의 `NextNav` 가 `<html data-reading-done>` 을 단다 |
| 외부 | shell → `@vercel/analytics/next` | `<Analytics />` |

최종 갱신: 2026-11-07
