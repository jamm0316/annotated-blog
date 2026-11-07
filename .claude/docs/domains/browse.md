# browse

첫 화면(`/`)의 글 목록과 2단계 필터(큰 분류 탭 + 주제·역량 칩), 그리고 사이트 전역의 물방울 인터랙션.

## 코드 위치

- `src/app/page.tsx` — 첫 화면. 글 목록을 클라이언트용 필드로 줄여 `PostBrowser` 에 넘긴다. `revalidate = 3600` 으로 한 시간마다 다시 만들며 `getPostStats()`(stats)의 순위를 `rank` 로 얹는다
- `src/components/PostBrowser.tsx` — 탭·칩 필터, 주소 해시 동기화, `j`/`k` 키, 목록 행(`PostRow`)과 미리보기 타이핑
- `src/components/LiquidTabs.tsx` — `LiquidTabs`(하나만 고르는 탭), `LiquidChips`(여러 개 고르는 칩)
- `src/components/MuseumDoor.tsx` — 히어로 오른쪽 박물관 입구(`/museum` 링크). 진열대 수는 `getExhibits().length`
- `src/components/Droplets.tsx` — 누른 자리 물방울, 행·카드의 차오르는 바탕, goo 필터(`#goo`)
- `src/components/HashLink.tsx` — 머리말의 `/#note` 같은 링크가 첫 화면에서 `hashchange` 를 일으키게 한다
- 스타일: `src/app/globals.css` 의 `/* 목록 */`, `/* 필터 */`, `/* 물방울 탭 */`, `/* 누른 자리에서 번지는 물방울 */`, `/* 목록 머리의 j/k 키 */` 섹션 (파일 자체는 shell 소속)

## 1. 컨텍스트 내부

### 엔티티

`BrowserPost` (PostBrowser.tsx, 클라이언트로 넘기는 글 한 편)

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| slug, title, topic, series, badge, date, lang, summary, hook, excerpt | `string` | `series`·`badge`·`summary`·`hook` 은 빈 문자열일 수 있다 |
| rank | `'hot' \| 'best' \| null` | 조회수로 정한 표식(stats 도메인). 행의 `[주제]` 줄 끝에 `HOT`(강조색으로 채움) / `BEST`(강조색 테두리) 고정폭 라벨(`.row__rank`). 수치 배지(`.badge`)와는 모양을 다르게 둔다. 조회수 숫자는 목록에 보이지 않는다 |
| category | `'note' \| 'book'` | |
| areas | `string[]` | 기술 노트 2단계 칩(JD 역량). 한 글이 여럿에 들 수 있다 |

`TabItem` (LiquidTabs.tsx): `{ value: string; label: string; count?: number }`. `value ''` 는 칩에서 '전체'.

`Category`: `CATEGORY_LABEL` 의 키 `note`(기술 노트)·`book`(독후감)·`lab`(연구실). `lab` 은 글이 아니라 `LabItem` 이다.

### 비즈니스 규칙

- **목록에 넘기는 필드**: `page.tsx` 가 `getPosts()` 결과에서 위 12개 필드만 골라 넘긴다. 본문은 넘기지 않는다. 글이 0편이면 `첫 글을 준비하고 있습니다.` 만 보인다.
- **첫 화면 문구**: `evan.log` 워드마크와 `백엔드 개발자 Evan 의 기술 노트와 독후감` 한 줄뿐. 그 오른쪽(760px 이하에서는 아래)에 박물관 입구 `MuseumDoor` 하나를 둔다: 머리말 `모드` 메뉴 안에 숨은 박물관 모드를 첫 화면에서 보이게 하려는 것이다. 이름표 `박물관 모드` · `걸어서 둘러보기` · `진열대 N개 · 3D 기록관`(N 은 실제 진열품 수). 건물 아이콘은 좁은 폰 모드 버튼과 같은 그림이다. 누르도록 이끄는 자리라 강조색을 이 카드에 모은다: 테두리·아이콘·`박물관 모드` 라벨이 강조색이고, 오른쪽 입장 버튼은 강조색으로 채운 34px 동그라미에 바탕색 화살표다. 떠오른 뒤(`--dur-slow + --dur-fast`) 테두리 빛(`door-glow`, 강조색 55% → 0, 14px 까지 퍼짐, 1400ms)이 **한 번만** 퍼졌다 사라진다(반복 애니메이션 금지, 움직임 줄이기면 없음). 손을 올리면 바탕이 차오르고 강조색 30% 의 3px 고리가 둘리며 화살표가 4px 밀린다. 첫 화면에서 강조색 테두리는 이 카드 하나뿐이다.
- **큰 분류 탭**: 고른 탭을 다시 누르면 해제(`main = null`, '전체 글'). 탭 개수는 분류별 글 수, 연구실은 `lab.length`.
- **2단계 칩**:
  - 기술 노트: `AREAS` 순서대로, 글이 1편 이상인 역량만. 맞춤 조건은 `p.areas` 중 하나라도 고른 칩에 있으면.
  - 독후감: `topic` 별 개수 내림차순, 같으면 한국어 가나다순. 맞춤 조건은 `p.topic` 이 고른 칩에 있으면.
  - 연구실: `LabItem.kind` 별로 같은 정렬.
  - 칩은 여러 개 고를 수 있고 하나라도 맞으면 보인다(OR). 비어 있으면 전체. '전체' 칩을 누르면 모두 해제.
  - 주소에 남은 칩 이름이 지금 칩 목록에 없으면 무시한다.
- **목록 제목**: `기술 노트 / A · B 외 n` — 칩은 두 개까지만 적는다. 분류가 없으면 `전체 글`. 개수는 글이면 `n편`, 연구실이면 `n개`.
- **행 미리보기(PostRow)**: 마우스(`pointerType === 'mouse'`)로 120ms 머물거나 키보드 초점(`:focus-visible`)이 오면 펼친다. 터치에서는 펼치지 않는다.
  - 타이핑 글: `summary` 가 있으면 `summary` + ` “hook”`(hook 이 있을 때만), 없으면 `excerpt`. 끝에 `… 더보기`.
  - 펼침 200ms 뒤 1~3글자씩, 14~40ms 간격(`14 + random*26`). `prefers-reduced-motion` 이면 한 번에 다 쓴다.
  - `row__ghost` 가 다 쓴 높이를 미리 잡아 타이핑 중 행 높이가 흔들리지 않는다.
  - 행 입장 지연 `--i` 는 `Math.min(index, 12)`.
  - 날짜는 `YYYY.MM.DD`, `lang === 'en'` 이면 주제 라벨 뒤에 ` English`.
- **물방울**: `LiquidTabs` 는 고른 탭 뒤 물방울 하나가 옮겨 다닌다(가는 방향 끝이 90ms 먼저 늘어남, `data-dir`). `drip` 이면 고를 때 아래로 한 방울 떨어진다. `LiquidChips` 는 칩마다 물방울이 제자리에서 맺히고 꺼진다. 둘 다 `ResizeObserver` 로 크기가 바뀌면 위치를 다시 잡는다.
- **Droplets**: `prefers-reduced-motion` 이면 누른 자리 물방울을 만들지 않는다. 물방울 크기는 대상 대각선 × 2, `animationend` 에 지운다. goo 필터는 `feGaussianBlur stdDeviation=5` + 알파 행렬 `18 -7`.

### 핵심 설계 결정

- **상태는 주소 해시에 둔다**: `#note`, `#note=성능 최적화,캐싱 전략`(칩은 `encodeURIComponent` 후 쉼표). 글을 보고 뒤로 오면 그대로 돌아오고 주소를 공유할 수 있다. 바꿀 때는 `history.replaceState` 라 방문 기록이 쌓이지 않는다. 옛 주소 `#notes`·`#books` 도 받는다. 디코딩이 깨지면 칩만 비운다.
- **`shown` 을 `main` 과 따로 둔다**: 탭을 해제해 칩 영역이 접히는 동안에도 칩이 남아 있어야 해서 마지막으로 연 분류를 기억한다. 칩 영역은 `inert={!main}`.
- **`j`/`k` 는 `e.code`(KeyJ/KeyK)로 본다**: 한글 자판에서는 `e.key` 가 'ㅓ'·'ㅏ' 로 들어오기 때문이다.
- **HashLink 가 필요한 이유**: next/link 는 같은 페이지에서 해시만 바꾸면 `pushState` 만 하고 `hashchange` 를 띄우지 않아 PostBrowser 가 탭을 바꾸지 못한다. 첫 화면(`pathname === '/'`)에서 보조키 없는 왼쪽 클릭이면 `location.hash` 를 직접 바꾼다.
- **목록 `key` 에 분류·칩을 넣는다**(`${main}-${sub.join()}`, `lab-${sub.join()}`): 필터가 바뀔 때마다 목록을 새로 그려 입장 애니메이션(`drop-in`)이 다시 돈다. `LiquidChips` 는 `key={shown}` 로 분류가 바뀌면 새로 만든다.

## 2. 외부 노출 (Published Language)

### 라우트

- `/` — `Home`(서버 컴포넌트). 해시 `#note[=칩,…]`, `#book[=…]`, `#lab[=…]` (옛 `#notes`, `#books`).

### 컴포넌트·export

```ts
// PostBrowser.tsx
export type BrowserPost = { slug; title; category: 'note' | 'book'; topic; areas: string[]; series; badge; date; lang; summary; hook; excerpt; rank: Rank | null };
export function PostBrowser(props: { posts: BrowserPost[]; lab: LabItem[] }): JSX.Element;

// LiquidTabs.tsx
export type TabItem = { value: string; label: string; count?: number };
export function LiquidTabs(props: { items: TabItem[]; value: string | null; onChange(value: string): void; label: string; size?: 'lg' | 'sm'; drip?: boolean }): JSX.Element;
export function LiquidChips(props: { items: TabItem[]; values: string[]; onChange(values: string[]): void; label: string }): JSX.Element;

// Droplets.tsx — layout.tsx 에서 한 번만 그린다
export function Droplets(): JSX.Element;

// HashLink.tsx
export function HashLink(props: { href: `/#${string}`; className?: string; children: ReactNode }): JSX.Element;
```

### 키보드 계약

- `j` / `k`: `#posts .row, #posts .lab-card__link` 사이를 한 줄씩 오르내린다(처음 누르면 첫 줄). 초점이 가면 행이 펼쳐지고, `Enter` 는 링크 기본 동작으로 연다.
- 무시하는 경우: 보조키(⌘·Ctrl·Alt), IME 조합 중, 입력칸·`contentEditable` 에 초점, **열린 `dialog[open]` 이 있을 때**(검색 팔레트·박물관 두루마리).
- 목록 머리의 `j` `k` 키 모양(`.keys-hint`)은 `(hover: hover) and (pointer: fine)` 에서만 보인다.

### 선택자·DOM 계약

- **Droplets 의 선택자** (새 요소에 물방울을 붙이려면 여기에 더한다):
  - 누른 자리 물방울 `RIPPLE`: `.row, .lab-card, .liquid__tab, .icon-btn, .search-trigger, .next-nav__item, .code__bar button, .playground__legend button, .museum-door`
  - 차오르는 바탕 `FILL`(`--px`/`--py` 를 넣는다): `.row, .next-nav__item, .lab-card, .museum-door`
  - 대상 요소는 CSS 에서 `position: relative; overflow: hidden` 이어야 물방울(`.droplet`)이 안에 갇힌다. FILL 대상은 `::before` 에서 `clip-path: circle(… at var(--px) var(--py))` 로 쓴다.
- **goo 필터 id `#goo`**: Droplets 가 깔고 `globals.css` 의 `.liquid__goo { filter: url(#goo) }` 가 쓴다. Droplets 가 없는 화면에서는 물방울 가장자리가 엉기지 않는다.
- **LiquidTabs/Chips DOM**: 고른 상태는 `button[aria-pressed="true"]`, 칩은 `data-value`, 물방울 숨김은 `data-hidden`, 방향은 `data-dir`, 애니메이션 재시작은 `.is-squish`·`.is-falling` 클래스.
- **`#posts`**: 목록 섹션 id. `j`/`k` 의 범위.

### 에러 계약

- 빌드를 멈추는 조건은 없다. (없는 `area` 는 posts 도메인이 읽을 때 멈춘다.)

## 3. Context Map

| 상대 도메인 | 방향 | 방식 |
| --- | --- | --- |
| posts | browse → posts | `page.tsx` 가 `getPosts()` 를 부른다. `PostBrowser` 가 `AREAS`(`src/lib/areas.ts`)로 칩 순서를 정한다. 행은 `/posts/<slug>` 로 링크 |
| lab | browse → lab | `page.tsx` 가 `LAB` 을, `PostBrowser` 가 `LabItem` 타입과 `LabGrid` 를 쓴다 |
| museum | browse → museum | `page.tsx` 가 `getExhibits()`(`src/lib/museum.ts`)로 진열대 수를 세어 `MuseumDoor` 에 넘기고, 입구는 `/museum` 으로 간다 |
| shell | shell → browse | `layout.tsx` 가 `Droplets` 와 `HashLink`(`/#note`·`/#book`·`/#lab`)를 그린다. 스타일·토큰은 `globals.css` |
| search | 간접 | `.search-trigger` 가 Droplets 의 RIPPLE 에 들어 있다. 검색 팔레트가 열리면(`dialog[open]`) `j`/`k` 를 쉰다 |
| posts / playgrounds | 간접 | `.next-nav__item`(이어서 읽기), `.code__bar button`·`.playground__legend button` 이 Droplets 선택자에 들어 있다 |
| museum | 간접 | 박물관 두루마리(`dialog`)가 열려 있으면 `j`/`k` 를 쉰다 |

최종 갱신: 2026-11-07
