# stats

방문자 수(today · total)와 글별 조회수, 조회수로 정하는 BEST·HOT 표식. 저장소는 Vercel 마켓플레이스로 연동한 Supabase Postgres(서울 `icn1`)다.

## 코드 위치

- `src/lib/db.ts`: 접속(`db()`), 표 만들기(`ensureSchema`), 한국 날짜(`kstDay`), 방문자 해시(`visitorHash`), 로봇 판별(`isBot`), Origin 검사(`foreignOrigin`)
- `src/lib/stats.ts`: 글별 조회수와 순위(`getPostStats`, `RANK_RULES`)
- `src/app/api/visit/route.ts`: `POST /api/visit`
- `src/app/api/view/route.ts`: `POST /api/view`
- `src/components/VisitCounter.tsx`: 바닥글의 `today N · total M`(클라이언트)
- `src/components/ViewBeacon.tsx`: 글을 10초 넘게 읽으면 조회 한 번(클라이언트, `PostArticle` 안)
- `next.config.ts` 의 `outputFileTracingIncludes['/api/view']`: 라우트가 요청 때 글 목록(`getPosts`)을 읽으므로 글 MDX 를 함수 번들에 싣는다

## 1. 컨텍스트 내부

### 표

| 표 | 열 | 기본 키 | 뜻 |
| --- | --- | --- | --- |
| `site_visits` | `day date`, `visitor text` | `(day, visitor)` | 그날 사이트에 온 사람 한 줄 |
| `post_views` | `slug text`, `day date`, `visitor text` | `(slug, day, visitor)` | 그날 그 글을 읽은 사람 한 줄. `post_views_day` 색인 |

- 처음 쓸 때 `ensureSchema` 가 `create table if not exists` 로 만든다(SQL Editor 에서 따로 돌리지 않는다). 인스턴스마다 한 번, 실패하면 다음 호출에서 다시 한다.
- **두 표 모두 RLS 를 켠다**(정책 없음). public 스키마는 Supabase REST API 로 보이는데, 브라우저에 공개된 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 로는 읽지도 쓰지도 못하게 하려는 것이다. 서버의 `POSTGRES_URL`(표 주인 `postgres`)만 쓴다.
- 같은 사람이 같은 날 다시 와도 `on conflict do nothing` 으로 한 줄만 남는다.

### 세는 규칙

- **날짜**: 한국 시간. `kstDay()` = UTC + 9시간의 `YYYY-MM-DD`.
- **사람**: `visitorHash` = sha256(`소금|날짜|IP|User-Agent`) 앞 32자. IP 는 `x-forwarded-for` 첫 값 → `x-real-ip` → `'local'`. 소금은 `POSTGRES_URL` 의 sha256 이라 서버 밖에서는 IP 를 되짚을 수 없고, 날짜가 섞여 다음 날에는 다른 값이 된다. **IP·User-Agent 원문은 저장하지 않는다.**
- **로봇**: User-Agent 가 비었거나 `bot|crawl|spider|slurp|preview|fetch|headless|lighthouse|monitor|curl|wget|python|axios|node-fetch` 에 걸리면 세지 않는다(`HeadlessChrome` 도 걸린다).
- **방문**: `VisitCounter` 가 화면을 열 때 한 번 `POST /api/visit`. 레이아웃이 유지되는 클라이언트 이동에서는 다시 부르지 않는다.
- **조회**: `ViewBeacon` 이 탭이 보이는 동안만 1초마다 시간을 더해 `READ_MS = 10_000`(10초)를 넘으면 `POST /api/view` 를 한 번(`keepalive`) 보낸다. 글 페이지와 박물관 두루마리 모두 `PostArticle` 을 쓰므로 둘 다 센다. 연구실 항목은 사이트 밖이라 세지 않는다.

### 순위 규칙(`RANK_RULES`, 처음 값)

| 표식 | 기준 |
| --- | --- |
| HOT | 최근 `HOT_DAYS = 7` 일(오늘 포함) 조회 상위 `HOT_COUNT = 3` 편, 그 기간 `HOT_MIN = 5` 명 이상 |
| BEST | 누적 조회 상위 `BEST_COUNT = 3` 편, 누적 `BEST_MIN = 20` 명 이상, HOT 인 글은 빼고 |

- 한 글에는 표식 하나만. HOT 을 먼저 정하고 남은 글에서 BEST 를 고른다.
- 지금 공개된 글(`getPosts()`)만 본다. 지운 글·초안의 기록은 무시한다.
- 문턱은 데이터가 쌓이면 다시 본다(`stats.ts` 의 `@MX:TODO`).

### 설계 결정

- **순위는 페이지를 한 시간마다 다시 만들 때(ISR, `revalidate = 3600`) 서버에서 읽는다.** 첫 화면(`app/page.tsx`)과 박물관(`app/museum/page.tsx`)이 같은 주기다. 방문자는 표식이 이미 붙은 HTML 을 받아 화면이 흔들리지 않고, 방문마다 DB 를 읽지 않는다.
- **DB 가 없거나 실패하면 통계 없이 그린다.** `POSTGRES_URL` 이 없으면(로컬·CI 빌드) `db()` 가 null, `getPostStats()` 는 빈 값(`{ views: {}, ranks: {} }`)을 돌려준다. API 는 `/api/visit` 503, `/api/view` 204.
- **화면의 숫자는 모두 DB 에 쌓인 실제 값이다.** 받기 전이나 실패하면 `VisitCounter` 는 아무것도 그리지 않는다(지어낸 0 을 보이지 않는다). 연동한 날(2026-11-07)부터 센다. Vercel Analytics 의 지난 기록은 옮겨 오지 않았다.
- **조회수 숫자는 목록에 보이지 않는다.** 첫 화면은 표식만, 숫자는 박물관 설명판에서만(`VIEWS_SHOW = 10` 명 이상일 때) 보인다. 초반의 작은 숫자가 진열대·목록에 박히지 않게 하려는 것이다.
- 연결: `postgres`(postgres.js) 클라이언트 하나를 인스턴스에서 같이 쓴다. Supabase 트랜잭션 풀러(6543)라 `prepare: false`, `max: 1`, `idle_timeout: 20`, `connect_timeout: 5`. 접속 문자열의 쿼리(`supa=…` 등)는 지우고 `sslmode=disable` 일 때만 SSL 을 끈다(로컬 테스트용).

## 2. 외부 노출(Published Language)

### export

```ts
// src/lib/db.ts
export function db(): postgres.Sql | null
export function ensureSchema(sql: postgres.Sql): Promise<void>
export function kstDay(offsetDays?: number): string
export function visitorHash(request: Request, day: string): string
export function isBot(request: Request): boolean
export function foreignOrigin(request: Request): boolean

// src/lib/stats.ts
export type Rank = 'hot' | 'best'
export type PostStats = { views: Record<string, number>; ranks: Record<string, Rank> }
export const RANK_RULES
export function getPostStats(): Promise<PostStats>

// src/components/VisitCounter.tsx ('use client')
export function VisitCounter(): JSX.Element | null
// src/components/ViewBeacon.tsx ('use client')
export function ViewBeacon({ slug }: { slug: string }): null
```

### HTTP

`POST /api/visit` (본문 없음)

| 상태 | 응답 |
| --- | --- |
| 200 | `{ "today": number, "total": number }` (로봇이면 기록 없이 숫자만) |
| 403 | Origin host ≠ 요청 host: `{ "error": "허용되지 않은 요청입니다." }` |
| 503 | `POSTGRES_URL` 없음: `{ "error": "통계를 쓰지 않는 환경입니다." }` |
| 502 | DB 실패(서버 로그 `[visit]`): `{ "error": "지금은 셀 수 없습니다." }` |

`POST /api/view` 본문 `{ "slug": "<공개 글 slug>" }`

| 상태 | 응답 |
| --- | --- |
| 204 | 기록함, 또는 로봇·DB 없음이라 건너뜀 |
| 400 | 공개 글 slug 가 아님: `{ "error": "없는 글입니다." }` |
| 403 | Origin host ≠ 요청 host |
| 502 | DB 실패(서버 로그 `[view]`) |

### 환경변수

Vercel 의 Supabase 연동이 넣는다. 코드는 `POSTGRES_URL` 만 읽는다(서버 전용). 값은 코드·문서에 옮겨 적지 않는다. 박물관 실시간 접속(아직 없음)은 `SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_ANON_KEY` 를 쓸 예정이다.

## 3. Context Map

| 방향 | 상대 | 방식 |
| --- | --- | --- |
| stats → posts | `getPosts()` 로 공개 글만 순위·조회에 넣는다 | `stats.ts`, `api/view` 가 import |
| posts → stats | `PostArticle` 이 `<ViewBeacon slug>` 를 본문 끝에 둔다 | import |
| browse → stats | `app/page.tsx` 가 `getPostStats()` 의 `ranks` 를 `BrowserPost.rank` 로 넘기고 `PostBrowser` 가 `HOT`/`BEST` 를 그린다. `revalidate = 3600` | import |
| museum → stats | `app/museum/page.tsx` 가 `getPostStats()` 를 `withStats` 로 진열품 `rank`·`views` 에 얹는다. 엔진이 HOT 빛 테·BEST 메달과 설명판 문구를 그린다. `revalidate = 3600` | import |
| shell → stats | `layout.tsx` 바닥글에 `<VisitCounter />` | import |
| stats → 외부 | Supabase Postgres(서울), `postgres` 패키지 | TCP |

최종 갱신: 2026-11-07
