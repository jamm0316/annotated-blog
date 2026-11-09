# posts

`content/posts/<slug>/index.mdx` 를 읽어 frontmatter 를 검증한 `PostMeta` 로 만들고, 글 페이지(`/posts/[slug]`)에 본문·목차·EOF·이어서 읽기를 그린다.

## 코드 위치

- `src/lib/posts.ts` — 글 읽기·검증, `getPosts`·`getPost`·`getNeighbours`·`formatDate`
- `src/lib/areas.ts` — 역량 칩 이름 목록 `AREAS`
- `src/lib/remark-unnest-links.mjs` — `<a>` 안의 마크다운 링크를 풀어 중첩 `<a>` 를 막는 remark 플러그인
- `src/mdx-components.tsx` — 글 안에서 import 없이 쓰는 컴포넌트 등록(`useMDXComponents`)
- `src/components/PostArticle.tsx` — 글 머리·MDX 본문·EOF (글 페이지와 박물관 읽기 창이 함께 씀)
- `src/components/Toc.tsx` — 목차와 지금 읽는 소제목 표시
- `src/components/NextNav.tsx` — 바닥에서 올라오는 이어서 읽기 카드
- `src/components/EndMark.tsx` — 본문 끝 `EOF` 표시
- `src/components/ShareButton.tsx` — 글 머리 메타 줄 오른쪽 끝 '공유' 버튼
- `src/app/posts/[slug]/page.tsx` — 글 페이지 라우트
- 참고: `next.config.ts` 의 MDX 설정, `content/posts/*/index.mdx`, AGENTS.md '글 추가'

## 1. 컨텍스트 내부

### 엔티티

`PostMeta` (`src/lib/posts.ts`)

| 필드 | 타입 | frontmatter 에서 | 기본값 |
| --- | --- | --- | --- |
| `slug` | string | 폴더 이름 | — |
| `title` | string | `title` (필수) | 없으면 빌드 중단 |
| `description` | string | `description` | `''` |
| `category` | `'note' \| 'book'` | `category` | `'book'` 이 아니면 모두 `'note'` |
| `topic` | string | `topic` | `''` |
| `short` | string | `short`, 없으면 `topic` | 10자 초과 시 빌드 중단 |
| `areas` | `Area[]` | `area` (배열) | `[]`, `AREAS` 밖 이름이면 빌드 중단 |
| `series` | string | `series` | `''` |
| `badge` | string | `badge` | `''` |
| `date` | string `YYYY-MM-DD` | `date` (필수) | gray-matter 가 Date 로 읽으면 `toISOString().slice(0, 10)` |
| `tags` | string[] | `tags` | `[]` |
| `lang` | string | `lang` | `'ko'` |
| `draft` | boolean | `draft` | `false` |
| `readingTime` | number (분) | 본문에서 계산 | 최소 1 |
| `summary` | string | `summary` | `''` |
| `hook` | string | `hook` | `''` |
| `excerpt` | string | 본문에서 계산 | — |
| `quiz` | `Quiz \| null` | `quiz` | `null` |

`Quiz = { q: string; choices: string[]; answer: number }` — 보기 3개, `answer` 는 0~2.

`Area = (typeof AREAS)[number]`. `AREAS` 는 `'성능 최적화' · '캐싱 전략' · '동시성·트랜잭션' · '객체지향 설계' · '인증·인가·보안' · 'AI 활용 개발' · '협업·회고'` 7개이고, 칩 순서는 글 수가 아니라 이 배열 순서다.

`Neighbour = { post: PostMeta; reason: string }`.

### 비즈니스 규칙

- **초안 노출**: `NODE_ENV === 'development'` 또는 `VERCEL_ENV === 'preview'` 일 때만 `draft: true` 글이 보인다. 이 조건은 `getPosts` 와 `getPost` 두 곳에 같은 식으로 적혀 있다.
- **정렬**: `getPosts` 는 `date` 문자열 내림차순(최신순). `category` 를 주면 그 분류만.
- **읽기 시간**: 코드 블록(```` ``` ````)과 `<...>` 태그를 뺀 본문에서 공백을 지운 글자 수 / 500, 반올림, 최소 1분.
- **excerpt**: 최대 150자. 코드 블록·MDX 주석(`{/* */}`)·HTML 주석을 지우고, 빈 줄로 나눈 블록 중 `#`·`|`·`<`·`import `·`export `·`![`·`---` 로 시작하는 블록(소제목·표·컴포넌트·그림)은 건너뛴다. 인용·목록 기호·링크 문법·`*`·`` ` ``·`~~` 를 걷어내고, 글자·숫자가 없는 블록은 버린다. 150자를 넘으면 자르되 마지막 공백이 90자(0.6) 뒤에 있으면 그 공백에서 자르고, 끝의 공백·`,.·:;` 를 지운다.
- **short**: `SHORT_MAX = 10`. 글자 수는 코드 포인트(`[...text].length`)로 센다.
- **이어서 읽기(`getNeighbours`, 기본 `limit = 2`)**: 공개 글 중에서 순서대로 채운다.
  1. 같은 연재: `series` 의 `' · '` 앞을 연재 이름으로 보고(예: `'캐시 · 2/3'` → `'캐시'`), 오래된 순으로 뒤집은 목록에서 다음 편(`'같은 연재 · 다음 편'`), 이전 편(`'같은 연재 · 이전 편'`).
  2. 같은 `topic`: 최신순 목록에서 바로 뒤·앞 글(`'같은 topic · <topic>'`).
  3. 그래도 모자라면 같은 `category` 에서 날짜 차이가 작은 순(`'가까운 기술 노트'` / `'가까운 독후감'`).
  이미 고른 글과 자기 자신은 빠진다.
- **날짜 표기**: `formatDate` 는 `-` 를 `.` 으로 바꾼다(`2026-11-06` → `2026.11.06`).
- **목차**: `[data-prose]` 안의 `h2[id]`·`h3[id]` 를 모은다(id 는 `rehype-slug`). 화면 높이 30% 선을 지난 마지막 소제목이 지금 읽는 소제목이고, 그 본문 소제목에 `data-current` 를 단다. 왼쪽 선은 본문을 읽은 비율만큼 `scaleY` 로 찬다.
- **이어서 읽기 카드 등장**: `scrollY + innerHeight >= scrollHeight - 24` 이면 `data-state="in"` 이고 `<html>` 에 `data-reading-done` 을 단다(globals.css 가 본문·목차를 흐린다).
- **공유 버튼**: 글 머리 메타 줄(날짜 · 읽는 시간 · 조회 · 연재) 오른쪽 끝(`margin-left: auto`). 공유하는 주소는 서버에서 만든 `postUrl(slug)`(운영 절대 주소)이고, 주소창 값을 쓰지 않는다(박물관 두루마리의 `?from=museum`·미리보기 도메인이 새지 않게). 터치 화면(`pointer: coarse`)에 `navigator.share` 가 있으면 공유 시트를 띄우고, 시트를 닫은 것(`AbortError`)은 아무것도 하지 않는다. 그 밖에는 클립보드에 복사하고 2초 동안 '링크 복사됨'(실패하면 '복사 실패')을 보인다.
- **EOF**: `IntersectionObserver`(`rootMargin: '0px 0px -20% 0px'`)로 한 번 들어오면 `is-drawn` 을 달고 관찰을 끊는다.

### 핵심 설계 결정

- **글 파일이 곧 DB**: 웹 에디터 없이 에이전트가 MDX 파일을 더하는 것이 발행 절차이므로, 형식이 틀린 frontmatter 는 런타임이 아니라 빌드에서 멈춘다(`throw`).
- **본문 컴포넌트 하나**: `PostArticle` 은 글 페이지와 박물관 두루마리(`app/museum/@reader/(..)posts/[slug]`)가 함께 쓴다. 본문은 `import(\`../../content/posts/${slug}/index.mdx\`)` 로 서버에서 불러온다.
- **MDX 파이프라인**(`next.config.ts`): `pageExtensions: ['ts','tsx','mdx']`. remark: `remark-frontmatter` → `remark-gfm` → `src/lib/remark-unnest-links.mjs`. rehype: `rehype-slug` → `rehype-pretty-code`(테마는 `createCssVariablesTheme({ name: 'evan-log', variablePrefix: '--code-' })`, `defaultLang: 'text'`, `keepBackground: false`). Turbopack 이 옵션을 직렬화하므로 플러그인은 이름 문자열, 로컬 플러그인은 `process.cwd()` 기준 절대 경로 문자열로 넘긴다. `cacheComponents` 는 끈다(공개 글 0편이면 `generateStaticParams` 가 빈 배열이라 빌드 실패).
- **중첩 링크 제거**: 글 안에 직접 쓴 `<a>` 의 글자가 URL 이면 `remark-gfm` 이 다시 링크로 만들어 `<a>` 안에 `<a>` 가 생기고, 하이드레이션이 깨져 `<html data-theme>` 까지 지워진다. `remark-unnest-links` 가 `<a>`(mdxJsx 요소) 안의 `link` 노드를 글자만 남긴다.

## 2. 외부 노출 (Published Language)

### 라우트

- `/posts/[slug]` — `generateStaticParams` 는 `getPosts()` 의 slug, `dynamicParams = false`(목록 밖 slug 는 404). `generateMetadata` 는 `title`, `description`, `openGraph: { type: 'article', title, description, publishedTime: date }`. 비공개·없는 글은 `notFound()`.
- `/posts/[slug]/opengraph-image` — 글 링크 미리보기 카드(shell 의 `renderOg`). `[topic]`·제목·`날짜 · N분`·배지(있을 때만). `generateStaticParams` 로 빌드 때 글마다 만든다.
- 레이아웃: `.post-shell` 안에 `aside.post-shell__toc > Toc` 와 `PostArticle`, 그 아래 이웃이 있으면 `NextNav`.

### export

```ts
// src/lib/posts.ts
type Category = 'note' | 'book';
type Quiz = { q: string; choices: string[]; answer: number };
type PostMeta = { ...위 표 };
type Neighbour = { post: PostMeta; reason: string };
const SHORT_MAX = 10;
function getPosts(category?: Category): PostMeta[];       // 공개 글, 최신순
function getPost(slug: string): PostMeta | null;           // 없거나 비공개면 null
function getNeighbours(slug: string, limit = 2): Neighbour[];
function formatDate(date: string): string;

// src/lib/areas.ts
const AREAS: readonly [...7개];
type Area;

// src/mdx-components.tsx  (@next/mdx 가 요구하는 파일·함수 이름)
function useMDXComponents(): MDXComponents;  // BatchPlayground, Figure, HeapPlayground, LoaderPlayground, NextStepPlayground, pre → CodeBlock, table → div.table-wrap 로 감싼 table

// src/lib/remark-unnest-links.mjs
default function remarkUnnestLinks(): (tree) => void;
```

### 컴포넌트 props

- `PostArticle({ post: PostMeta })` — async 서버 컴포넌트. `<article class="article" lang={post.lang}>`, 머리(`[topic]`, `#tag`, 제목, 설명, 날짜·`N분`·연재), `<div class="prose" data-prose>` 본문, `EndMark`, `<ViewBeacon slug>`(stats 도메인: 10초 넘게 읽으면 조회 한 번, 글 페이지와 두루마리 모두).
- `Toc()` — props 없음. 'use client'. 소제목이 없으면 아무것도 그리지 않는다.
- `NextNav({ items: { slug; title; description; date; reason }[] })` — 'use client'. `date` 는 호출하는 쪽이 `formatDate` 로 바꿔 넘긴다.
- `EndMark()` — props 없음. 'use client'.

### 본문 링크

- MDX 의 `a` 는 `src/mdx-components.tsx` 가 바꿔 끼운다. `/` 로 시작하는 내부 링크는 `next/link`(`prefetch={false}`), 나머지는 일반 `<a>`.
- prefetch 를 끄는 까닭: 박물관 두루마리 안에서 미리 받으면 가로채기 응답이 `/posts/<slug>` 캐시로 남아(Vary 에 `Next-Url` 없음) 박물관 밖에서 그 글을 열 때 섞일 수 있다.
- 내 Medium 글(`medium.com/@evanbackeng/...`)로 가는 링크는 이 블로그의 같은 글 `/posts/<slug>` 로 쓴다. 다른 사람의 Medium 프로필(`medium.com/u/...`)은 그대로 둔다.

### DOM 계약

- `[data-prose]`: `PostArticle` 이 달고 `Toc` 가 찾는다.
- 본문 `h2/h3[data-current]`: `Toc` 가 달고 `globals.css` 가 그린다.
- `<html data-reading-done>`: `NextNav` 가 달고 `globals.css` 가 `.post-shell__toc, .article__header, .prose` 를 흐린다. 언마운트 때 지운다.

### 에러 계약(빌드를 멈추는 조건)

`readPost` 가 `throw` 한다. 메시지는 모두 `[posts] <slug>/index.mdx ...` 로 시작한다.

- `title` 또는 `date` 가 없다.
- `short`(없으면 `topic`)가 `SHORT_MAX`(10)자를 넘는다.
- `area` 에 `AREAS` 에 없는 이름이 있다.
- `quiz` 가 있는데 `q` 가 비었거나, `choices` 가 3개가 아니거나, `answer` 가 0~2 정수가 아니다.

## 3. Context Map

- **posts → playgrounds**: `src/mdx-components.tsx` 가 `src/components/mdx/*` 의 `BatchPlayground`·`CodeBlock`·`Figure`·`HeapPlayground`·`LoaderPlayground`·`NextStepPlayground` 를 import 해 MDX 태그로 등록한다.
- **browse → posts**: `src/app/page.tsx` 가 `getPosts()` 를 불러 `slug, title, category, topic, areas, series, badge, date, lang, summary, hook, excerpt` 를 골라 넘긴다. `src/components/PostBrowser.tsx` 가 `AREAS` 를 import 해 칩 순서로 쓴다.
- **search → posts**: `src/lib/search.ts` 가 `getPosts()` 로 검색 목록과 `/api/ask` 카탈로그(`topic`, `areas`, `tags`, `series`, `description`, `summary`, `excerpt`)를 만든다. `/api/ask` 함수에 글 파일을 싣기 위해 `next.config.ts` 의 `outputFileTracingIncludes` 가 `./content/posts/**/*.mdx` 를 포함한다.
- **museum → posts**: `src/lib/museum.ts` 가 `getPosts()` 와 `Quiz` 를 import 해 진열품을 만든다(`short`, `quiz` 사용). `src/app/museum/@reader/(..)posts/[slug]/page.tsx` 가 `getPosts`·`getPost`·`PostArticle` 을 써서 두루마리에 본문을 싣는다(이쪽은 `dynamicParams` 를 false 로 두지 않는다).
- **posts → shell**: 레이아웃·토큰·`data-current`·`data-reading-done`·`.prose` 스타일은 `src/app/globals.css` 에 있다.

최종 갱신: 2026-11-07
