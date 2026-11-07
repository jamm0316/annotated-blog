# museum

박물관 모드(`/museum`). 글 한 편·연구실 항목 하나가 진열대 하나인 3D 기록관을 three.js 로 그리고, '글 읽기'는 가로채기 라우트로 장면 위 두루마리에 띄우며, 관람 진행(도장·버그)은 이 브라우저의 localStorage 에만 남긴다.

## 코드 위치

| 파일 | 역할 |
| --- | --- |
| `src/lib/museum.ts` | 글·연구실에서 진열품(`Exhibit`)을 만든다. `PROP_BY_TOPIC` |
| `src/components/museum/Museum.tsx` | 클라이언트 진입점. engine 을 동적 import 해 붙이고, `ask`·`open` 을 넘긴다. 떠날 때 말려 올라가기 |
| `src/components/museum/engine.ts` | 장면·배치·대화·입력·수첩·영수증·프레임 루프 전부(`mountMuseum`) |
| `src/components/museum/Reader.tsx` | 두루마리(`<dialog>`). 끝까지 내리면 도장 |
| `src/components/museum/passport.ts` | 관람 수첩 localStorage 저장소와 CustomEvent 이름 |
| `src/app/museum/layout.tsx` | `children` 위에 `@reader` 슬롯을 겹친다 |
| `src/app/museum/page.tsx` | `/museum` 페이지. 메타데이터, `<Museum exhibits={getExhibits()} />`, 키 안내 줄 |
| `src/app/museum/@reader/page.tsx`, `default.tsx` | 읽기 창이 없을 때 `null` |
| `src/app/museum/@reader/(..)posts/[slug]/page.tsx` | `/posts/<slug>` 가로채기. `Reader` 안에 `PostArticle` |

스타일은 `src/app/globals.css` 의 `.museum*`(`.museum-page`, `.museum__talk` 등)·`.reader`·`.scroll*` 클래스와 `.museum-page` 에 정의한 `--m-*` 토큰(shell 도메인 파일)에 있다. 같은 구역 뒤쪽의 `.mode__icon`·`.mode__theme` 와 460px 규칙은 모드 메뉴(shell 도메인)의 것이다.

## 1. 컨텍스트 내부

### 엔티티

`Exhibit` (`src/lib/museum.ts`)

| 필드 | 타입 | 뜻 |
| --- | --- | --- |
| `id` | `string` | 검색(search)과 같은 id. 글은 slug, 연구실은 `lab:<repo>` |
| `hall` | `'note' \| 'book' \| 'lab'` | 기술 노트관 / 로비 책장 / 연구실 별관. 글은 `category === 'book'` 이면 `book`, 아니면 `note` |
| `short` | `string` | 가까이 가면 뜨는 이름표(posts 의 `short`, 10자 이내) |
| `title`, `date`, `href` | `string` | 글은 `/posts/<slug>`, 연구실은 `url` 또는 `https://github.com/jamm0316/<repo>` |
| `topic` | `string` | 독후감은 `'독후감'`, 연구실은 `'연구실'`, 그 밖은 글의 `topic` |
| `external` | `boolean` | 연구실만 `true`(새 탭) |
| `prop` | `PropKind` | 유리 돔 안 소품. 독후감은 `book`, 연구실은 `monitor`, 글은 `PROP_BY_TOPIC[topic] ?? 'book'` |
| `series` | `{ name; no; of } \| null` | frontmatter `series` 가 `이름 · n/m` 모양일 때만(`/^(.+?)\s*·\s*(\d+)\/(\d+)$/`) |
| `quiz` | `Quiz \| null` | posts 의 `{ q, choices, answer }` |
| `isNew` | `boolean` | `getPosts()` 첫 글(가장 최근) 하나만 `true` |

`PropKind`: `db · down · phone · shield · scroll · key · bot · branch · leaf · calendar · book · monitor`.
`PROP_BY_TOPIC`: 캐시→db, 다운로드 API→down, 2단계 인증→phone, 입력 정제→shield, 감사 로그→scroll, 권한 모델→key, AI 코딩→bot, Git→branch, MongoDB→leaf, 회고→calendar.

`Passport` (`passport.ts`): `{ stamps: Record<string, 1 | 2>; bugs: string[]; cheered: string[] }`. `cheered` 는 부엉이가 이미 축하한 관(`note`/`lab`/`book`/`bug`).

### 배치 규칙 (`engine.ts` 의 `layout`)

- 격자 폭 `W = 21`, 가운데 벽 `MID = 10`. 기술 노트관 열 `COLS_NOTE = [2, 5, 8]`, 연구실 별관 열 `COLS_LAB = [12, 15, 18]`. 위쪽 왼편 노트관, 오른편 연구실, 아래 로비.
- 노트는 같은 주제끼리 붙인다. 주제 순서는 그 주제의 최신 글 날짜 내림차순 → 주제 이름 → 글 날짜 내림차순. 연구실·책은 날짜 내림차순.
- 한 줄에 3개. i 번째 진열대는 열 `i % 3`, 줄 `z = 2 + 3 * floor(i / 3)`. 줄 수 `rows = max(1, ceil(notes/3), ceil(labs/3))`, 전시실과 로비 사이 벽 `zw = 3 * rows + 2`. 글이 늘면 전시실이 아래로 길어진다.
- 문턱 벽(`zw`)의 문은 x 4~6, 14~16(세 칸), 기둥 x 3·7·13·17. 출구는 맨 아래 벽 `MID`.
- 로비: 부엉이 `(MID, zw+2)`, 리셉션 책상 `zw+3`. 책장은 왼쪽(x=1)·오른쪽(x=W-2) 번갈아 두 칸 높이, `z = zw + 2 + 3 * floor(j/2)`. 로비 깊이 `max(6, 3 * ceil(books/2) + 1)`, 전체 높이 `H = zw + lobby + 2`.
- 명예의 전당 받침대 넷(`note`, `lab`, `book`, `bug`)은 x `MID-4, MID-2, MID+2, MID+4`, z `H-3`. 화분 두 개도 `H-3`.
- 칸 기호 `Cell`: `#` 벽, `.` 바닥, `P` 진열대, `D` 책상, `B` 책장, `O` 부엉이, `T` 화분, `C` 기둥, `R` 받침대. `.` 만 걸을 수 있다. 클릭 이동은 칸 단위 BFS(`route`).
- **연재 길**: 같은 `series.name` 진열대가 둘 이상이면 `no` 순으로 잇는 점선(간격 0.44)과 편 번호 배지를 깐다. 평소엔 꺼져 있고, 진열대 1.5 안에 들어서면 그 자리에서부터 `TRAIL_SPEED = 7` 칸/초로 한 칸씩 켜지며(한 칸 `LAMP_POP = 140`ms), 진열대와 점선 모두에서 2 넘게 멀어지면 꺼진다(`updateTrails`). 책장(독후감)은 연재 길에 들어가지 않는다(`spotDefs` 만 본다).
- **NEW**: `isNew` 진열대에 빛기둥과 `NEW` 태그. 그 글에 도장이 찍히면 둘 다 끈다(`refresh`).
- 빛은 들어온 시각으로 한 번 정한다: 19시~6시 전 `night`(유리 돔 발광·받침 아래 불빛 웅덩이·리셉션 램프), 6~9시 전·17시~ `dusk`, 그 밖 `day`.

### 관 이름과 관 이름 표시

- `HALL_NAME = { note: '기술 노트관', lab: '연구실 별관', book: '로비 책장' }`. 수첩 제목, 축하 대사, 명예의 전당 대사, 관 이름 표시에 쓴다.
- `zoneAt`: `z > zw` 는 `book`, 문턱 줄(`zw`)과 가운데 벽 열(`MID`)은 어느 관도 아니어서 이전 관을 유지, 그 밖은 `x < MID` 면 `note`, 아니면 `lab`.
- 걸어서 다른 관에 들어서면 `announce(hall)` 가 `.museum__room` 에 개수 줄(`기술 노트 n편` / `실험 n개` / `독후감 n편`)과 관 이름을 띄우고 `is-on` 클래스를 다시 걸어 한 번만 움직인 뒤 2600ms 뒤 숨긴다.

### 부엉이 대화

- 말풍선(`say`)은 한 줄씩 32ms 간격으로 타이핑한다(움직임 줄이기면 바로). 클릭·Enter·Space 로 넘기고, 마지막 줄 뒤에 `then` 이 있으면 곧바로 선택지를 띄운다.
- 처음 인사(`talkOwl`, `greeted` 전)는 **세 줄 안에서** 끝난다: (1) 시간대 인사 + 기록관 안내(도장이 있으면 `도장이 n개 모였어요`), (2) 팁 한 줄(아직 안 읽은 NEW 글 안내, 도장이 0개면 수첩·버그 안내. 둘 다 없으면 줄 생략), (3) `/` 로 부를 수 있다는 안내. 두 번째부터는 `또 오셨네요! 무엇을 찾으세요?` 한 줄.
- 대사가 끝나면 `owlMenu`: **질문하기**(입력창, `maxLength` 200 → `options.ask`) / **그만 대화하기**(`close`).
- 입력 안내는 '글 찾기든 Evan 이야기든 물어보세요.', 예시는 '이 사람은 어떤 개발자야?'. 글 찾기뿐 아니라 블로그·Evan 에 관한 물음과 인사에도 답한다(범위는 search spec 의 `/api/ask` 규칙).
- 답: 먼저 부엉이가 `answer` 를 말한다. `bubbles` 가 문장 단위로 한 칸 90자 안팎에 맞춰 나눈다. 고른 진열대가 있으면 이어서 바닥에 파란 고리(`C.mark`, 주황의 보색)를 켜고 '바닥에 파란 동그라미로 N곳을 그려 뒀어요' 뒤에 진열대별 선택지(`short` + 이유) + '괜찮아요'. 고르면 그 진열대 앞으로 걸어가 설명판을 연다. 고른 진열대가 없으면 답만 하고 `owlMenu` 로 돌아간다(답도 비면 '맞는 진열대를 못 찾았어요…'). `ask` 가 던진 Error 의 문구는 그대로 말한다.
- 설명판(`placard`): `[topic] title`, 연재 `n/m편`, 수첩 상태. 선택지 '글 읽기'(연구실은 '새 탭에서 보기'), '돔 열어 보기'(E), '다음 편', 도장 1 이고 퀴즈가 있으면 '퀴즈 풀기', '닫기'.
- **대화창 닫기**: 대사를 끝까지 넘기지 않아도 오른쪽 위 `닫기 ✕` 버튼(`.museum__skip`) 또는 Esc 로 `close()` 한다. `close` 는 큐·선택지를 비우고 캔버스로 포커스를 돌린다.

### 도장 규칙

- `1` = 도장(印): 두루마리를 끝까지(바닥에서 80px 안) 내리면 `stamp(id)`. 스크롤할 것 없는 짧은 글은 펼치자마자 찍힌다. 연구실은 '새 탭에서 보기'를 누르면 찍힌다(끝까지 봤는지 알 수 없어서).
- `2` = 금도장(金): 도장 1 인 글의 부엉이 퀴즈를 맞히면. 두루마리를 닫고 돌아오면(`afterReader`) 새로 찍힌 글의 퀴즈를 바로 내고, 설명판에서도 다시 풀 수 있다. 틀려도 도장은 그대로.
- 한 관(`note`/`lab`/`book`)의 진열대에 모두 도장(1 또는 2)이 있으면 그 관 받침대 가림천이 벗겨지고(`unlocked`), 부엉이가 관마다 한 번만 축하한다(`cheers` → `cheered` 에 기록).

### 숨은 버그

- `engine.ts` 의 `bugs` 다섯 자리: `note-corner`, `note-door`, `lab-corner`, `desk`, `lobby-corner`. 벽 칸에 걸리면 뺀다.
- 걷는 중 0.6 안에 들어가면 잡힌다(`catchBug`): `passport.bugs` 에 id 추가, 토스트 `bug: n → n-1`(0 이면 `0 bugs. deploy ok`), 다 잡으면 `bug` 받침대에 금 딱정벌레.

### 영수증

- 출구 문턱(`z > H - 0.75`)을 남쪽으로 걸어 넘으면(입장 연출 중 제외) `showReceipt`. 줄: 입장 시각, 머문 시간(분, 최소 1), 둘러본 진열대(`visit.seen`: 이름표가 뜬 진열대), 읽은 글(`visit.read`: 두루마리를 닫은 글), 잡은 버그(이번 관람), 수첩 도장(`n / 전체`, 금 개수), 가장 오래 펼쳐 둔 글, `EOF`. 모두 이번 관람에서 잰 값이다.
- 버튼: 계속 둘러보기(Esc 와 같음, `H - 1.9` 로 되돌림) / 이미지로 저장(canvas 420px 폭 ×2 → `evan-log-museum-receipt.png`) / 블로그로 나가기(`/`).

### 입력

- 걷기: 방향키·WASD(속도 3.6/초). 바닥·진열대·부엉이·받침대·버그 클릭은 그 자리로 걸어간다.
- `Enter`/`Space` 가까운 것과 상호작용, `E` 유리 돔(1900ms 한 번 움직이고 멈춤), `P` 수첩, `/` 부엉이, `Esc` 말풍선·수첩·영수증 닫기. 대화 중 방향키는 선택지 포커스 이동.
- `dialog[open]`(두루마리·그림 확대)이 있으면 키 입력을 무시하고 프레임 그리기를 멈춘다. 닫히는 순간 `afterReader` 를 부른다.
- 입장 연출: 출구 문턱에서 리셉션까지 걸어 들어온 뒤(1000ms 뒤 출발) 부엉이가 말을 건다. 걷기 키나 클릭으로 끝낸다. 움직임 줄이기면 바로 부엉이 앞에 서서 400ms 뒤 말을 건다.

### 핵심 설계 결정

- **engine 은 React 밖**: three.js 장면과 겹친 UI(말풍선·수첩·영수증)를 DOM 으로 직접 만든다. Museum.tsx 는 `import('./engine')` 로 이 페이지에서만 three.js 를 불러오고, 언마운트 때 반환 함수로 모두 정리한다.
- **색 규칙 예외**: 이 모드만 사이트의 세 가지 색 규칙에서 빠진다. 색은 `engine.ts` 의 `C` 와 `--m-*` 토큰에만 둔다.
- **반복 애니메이션 금지 유지**: 팔다리는 걷는 동안만, 돔·연재 길·관 이름 표시는 한 번만 움직이고 멈춘다. `prefers-reduced-motion` 이면 tween 은 바로 끝 상태로 간다.
- **가로채기 라우트에 `dynamicParams = false` 를 두지 않는다**: 이 라우트가 한 번 컴파일된 뒤 더한 글은 `generateStaticParams` 의 캐시된 목록에 없어 가로채기가 404 가 되고, Next 는 가로채기를 포기하고 글 페이지로 바로 넘어갔다(새 글만 두루마리 대신 글 페이지로 열리던 버그). 없는 글은 `getPost` → `notFound()` 로 막는다. (글 페이지 `src/app/posts/[slug]/page.tsx` 는 `dynamicParams = false` 를 쓴다. 둘을 맞추지 않는다.)
- **`/posts/<slug>?from=museum` 으로 연다**: Vercel 의 prerender RSC 응답은 `Vary` 에 `Next-Url` 이 없다. 첫 화면 목록이 prefetch 한 `/posts/<slug>` 캐시를 클라이언트가 '가로채질 일 없는 주소'로 저장해 박물관에서도 재사용했고, 두루마리 대신 글 페이지로 넘어갔다(첫 화면에 보이던 최신 글들만). 쿼리가 다르면 캐시를 새로 찾으므로 `Next-Url: /museum` 으로 요청해 `@reader` 가로채기를 받는다.
- **두루마리는 history 한 칸**: 닫기·Esc·바깥 누르기·뒤로 가기 모두 `router.back()`. 박물관 장면은 언마운트되지 않아 서 있던 자리가 남는다. 새로고침·공유한 주소는 원래 글 페이지를 연다. '전체 페이지'는 일반 `<a>` 라 가로채지 않는다.
- **떠날 때 말려 올라가기**: 박물관 밖 같은 출처 링크 클릭을 캡처 단계에서 막고 `data-leaving` 을 단 뒤 620ms 뒤 `router.push`. `dialog` 안 링크, 새 탭, `/museum*`, 수정 키 클릭, 움직임 줄이기는 그대로 둔다. 들어올 때 펼쳐지는 것은 CSS(`museum-unroll`).

## 2. 외부 노출 (Published Language)

### 라우트

| 경로 | 내용 |
| --- | --- |
| `/museum` | `MuseumPage`. metadata `title: '박물관'` |
| `/posts/<slug>` (`/museum` 에서 소프트 이동) | `@reader/(..)posts/[slug]` 가 가로채 `Reader` 로 띄운다. `generateStaticParams` 는 모든 공개 글, `generateMetadata` 는 글 제목·설명 |

### export

- `src/lib/museum.ts`: `type PropKind`, `type Exhibit`, `getExhibits(): Exhibit[]`(글 다음 연구실 순).
- `Museum.tsx`: `Museum({ exhibits }: { exhibits: Exhibit[] })`.
- `Reader.tsx`: `Reader({ id, title, href, children })`.
- `engine.ts`: `mountMuseum(root: HTMLElement, options: MuseumOptions): () => void`, `type AskPick = { id; reason }`, `type AskReply = { answer; picks: AskPick[] }`, `type MuseumOptions`:
  - `exhibits: Exhibit[]`
  - `ask(question: string): Promise<AskReply>` — 실패하면 사용자에게 보일 문구를 담은 `Error` 를 던진다.
  - `open(exhibit: Exhibit): void` — 글은 사이트 안(`?from=museum`), 연구실은 새 탭.
  - 반환 함수: 타이머·이벤트·ResizeObserver·three.js 자원을 정리하고 `root` 를 비운다.
- `passport.ts`: `type Passport`, `loadPassport()`, `savePassport(p)`, `stamp(id): boolean`(처음 찍으면 `true`), `STAMP_EVENT`, `READ_EVENT`.

### 저장소 계약

- localStorage `evan-log:museum-passport` = JSON `Passport`. 서버로 보내지 않는다. 읽기 실패·모양이 다른 필드는 빈 값으로 대체하고, 저장소를 못 쓰면 모듈 메모리로 이번 방문 동안만 기억한다.
- 이 키를 쓰는 곳은 `passport.ts` 뿐이다(Reader 와 engine 은 함수로만 접근).

### 이벤트 계약 (window CustomEvent)

| 이름 | 보내는 곳 | detail | 받는 곳 |
| --- | --- | --- | --- |
| `museum:stamp` (`STAMP_EVENT`) | `stamp()` — 처음 찍을 때만 | 글/연구실 id (`string`) | engine `onStamp`: 글이면 `fresh` 에 두었다가 두루마리를 닫으면 알림·퀴즈, 연구실이면 바로 `refresh`·축하 |
| `museum:read` (`READ_EVENT`) | `Reader` 언마운트(닫을 때) | `{ id: string; ms: number }` 펼쳐 둔 시간 | engine `onRead`: `visit.read` 에 누적(영수증) |

### HTTP

- `ask` 는 `POST /api/ask`, body `{ q }`. 응답 `{ answer, picks: { id, reason }[] }` 또는 `{ error }`. `answer` 가 없으면 빈 문자열로 넘긴다. `!res.ok` 이거나 `picks` 가 없으면 `error`(없으면 `'지금은 답할 수 없어요.'`)로 Error 를 던진다. 받은 id 중 진열대에 없는 것은 버린다.

### 에러 계약

- 가로채기에서 없는 slug 는 `notFound()`.
- 빌드를 멈추는 조건은 이 도메인에 없다. `short` 10자 초과·`quiz` 모양 오류는 posts 의 검증이 멈춘다.

## 3. Context Map

| 상대 | 방향 | 방식 |
| --- | --- | --- |
| posts | museum → posts | `getPosts()`·`type Quiz`(museum.ts), `getPost`·`getPosts`(가로채기 라우트), `PostArticle` 컴포넌트를 글 페이지와 함께 쓴다. `short`·`quiz`·`series`·`topic` frontmatter 에 기댄다 |
| lab | museum → lab | `LAB` 에서 연구실 진열품을 만든다(`repo`, `short`, `title`, `date`, `url`) |
| search | museum → search | `/api/ask` 를 HTTP 로 부른다. 진열품 id 는 search 의 id(`slug`, `lab:<repo>`)와 같아야 picks 가 진열대에 맞는다. `SearchPalette` 는 `/museum` 에서 `/` 키를 가로채지 않는다(부엉이가 쓴다) |
| shell | shell → museum | `ModeMenu` 가 `/museum` 링크와 첫 방문 안내(`evan-log:museum-hint`)를 둔다. `.museum*`·`.reader`·`.scroll*` 스타일과 `--m-*` 토큰은 globals.css 에 있다. 머리말 링크 클릭은 Museum.tsx 의 말려 올라가기가 가로챈다 |
| playgrounds | 간접 | 두루마리 안 본문은 `PostArticle` 이 그리는 MDX 컴포넌트다. 그림 확대 `dialog` 가 열리면 engine 은 입력을 멈춘다 |
| browse | 간접 | 첫 화면 목록의 `/posts/<slug>` prefetch 캐시가 `?from=museum` 을 둔 이유다 |

최종 갱신: 2026-11-07
