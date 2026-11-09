<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# evan.log — 에이전트 작업 지침

글을 쓰거나 컴포넌트를 건드리기 전에 끝까지 읽는다. (초안 v0 — 디자인 확정 후 보강)

## 이 사이트

백엔드 개발자 Evan 의 기술 노트와 독후감. 한국어만 쓴다.
웹 에디터는 없다. 주제와 자료를 받은 에이전트가 MDX 파일을 추가하는 것이 발행 절차의 전부다.

## 반드시 지킬 것

1. **공개 저장소다.** 커밋한 순간 초안까지 공개된다. 회사 일을 다룬 글은 회사명·고객사명·내부 티켓 번호·내부 주소를 지운 뒤에만 커밋한다. `draft: true` 는 사이트에서만 숨길 뿐 저장소에서는 다 보인다.
2. **숫자를 지어내지 않는다.** 글의 모든 수치는 작성자가 준 자료로 추적돼야 한다. 추정치면 본문에 추정이라고 쓴다.
3. **`main` 이 운영이다.** push 하면 Vercel 이 운영에 배포한다. 쓰다 만 글은 `draft: true` 로 둔다.
4. 커밋 전에 `npx tsc --noEmit && npm run lint && npm run build` 를 통과시킨다.

## 도메인 spec 과 @MX 주석

코드를 고치기 전에 `.claude/docs/README.md` 와 고칠 도메인의 `.claude/docs/domains/<도메인>.md` 를 먼저 읽는다. 코드 파일 머리의 `@MX:SPEC` 이 그 파일의 도메인을 가리킨다.
작업이 끝나면 바뀐 사실을 spec 과 `@MX` 주석(`NOTE`·`ANCHOR`·`WARN`·`TODO`)에 같이 반영한다. 규칙은 `.claude/docs/README.md` 에 있다.

## 글 추가

```
content/posts/<slug>/index.mdx
```

`<slug>` 는 영어 소문자·하이픈, 날짜를 넣지 않으며 한번 정하면 바꾸지 않는다.

`summary`·`hook` 은 글을 추가하는 에이전트가 본문을 끝까지 읽고 쓴다.
- `summary`: 결론·핵심을 먼저. description 을 옮겨 적지 않는다. 수치는 본문에 있는 값만.
- `hook`: 독자가 더 읽고 싶어질 문장(질문·반전·강한 주장·인상적인 결과). 마크다운 기호만 빼고 본문과 한 글자도 다르지 않게 옮긴다. 코드·표·소제목에서는 고르지 않는다. 따옴표는 넣지 않는다.
- 둘 다 없으면 본문 앞부분이 대신 타이핑된다.
- `short`: 박물관 진열대에 다가가면 뜨는 이름표. 글을 고를지 판단할 수 있게 주제를 10자 이내로 줄인다(넘으면 빌드가 멈춘다). 없으면 `topic` 이 대신 뜬다.
- `quiz`: 박물관에서 글을 끝까지 읽고 나오면 부엉이가 내는 한 문제. 본문을 다 읽고 글의 핵심(결론·결정·원인)을 묻는다. 정답은 본문에 적힌 내용이어야 하고, 숫자는 본문에 있는 값만 쓴다. 보기는 셋, `answer` 는 0부터 센 정답 위치(모양이 틀리면 빌드가 멈춘다). 없으면 퀴즈 없이 도장만 찍힌다.

`area` 는 기술 노트를 채용 공고(JD) 역량 이름으로 묶는 칩이다. `topic` 은 시스템 단위(목록 라벨·이어서 읽기)이고, `area` 는 글이 보여 주는 역량이다.
- `src/lib/areas.ts` 의 이름만 쓴다. 없는 이름을 쓰면 빌드가 멈춘다.
- 글이 실제로 보여 주는 역량에만 붙인다. 예를 들어 트래픽 규모를 다루지 않은 글에 '대용량 트래픽'을 붙이지 않는다. 새 역량은 근거가 되는 글이 생길 때 `areas.ts` 에 더한다.

```yaml
---
title: '캐시가 Redis가 아니었다'
description: '한 줄 요약. 목록·검색 결과·OG 에 그대로 나간다.'
summary: '본문을 다 읽고 쓴 핵심 1~2문장(120자 이내, ~다). 목록 미리보기에 타이핑된다.'
hook: '본문에서 글자 그대로 옮긴 한 문장(80자 이내). 화면에서 summary 뒤에 따옴표로 붙는다.'
category: 'note' # note = 기술 노트, book = 독후감
topic: '캐시' # 시스템 단위. 같은 시스템은 항상 같은 문자열
short: '캐시 전 세 질문' # 박물관 이름표. 10자 이내
quiz: # 박물관 퀴즈. 보기 3개, answer 는 0부터
  q: '캐시를 붙이기 전에 먼저 확인한 것은?'
  choices: ['보기1', '보기2', '보기3']
  answer: 1
area: ['캐싱 전략'] # 기술 노트만. 첫 화면 2단계 칩(JD 역량). src/lib/areas.ts 에 있는 이름만, 여럿 가능
series: '캐시 연재 1편' # 없으면 ''
badge: 'TTFB −96%' # 목록에 붙는 핵심 수치. 없으면 ''
date: 2026-10-23
tags: ['Spring Cache', 'Redis', '진단']
draft: false
---
```

## 연구실 추가

첫 화면 `연구실` 탭은 GitHub Pages 에 올린 실험(배포 주소가 없는 로컬 도구는 `url` 을 비워 저장소로 연결)을 썸네일 카드로 모은다. 글이 아니다.
`src/lib/lab.ts` 의 `LAB` 에 한 항목을 더하고(`short` 는 박물관 이름표, 10자 이내), 1200×750 첫 화면 스크린샷을 `public/lab/<repo>.png` 로 둔다.
설명은 저장소 README 와 배포된 페이지에 적힌 사실만 쓴다. 남의 상표를 베낀 연습물은 올리지 않고, 썸네일에 회사 프로젝트 이름이나 가족 얼굴 사진이 보이면 가리거나 다른 화면을 찍는다.

## 글 안에서 쓰는 컴포넌트

`src/mdx-components.tsx` 에 등록돼 있어 import 없이 쓴다. 새 컴포넌트는 기존 것으로 안 될 때만 만든다.

| 컴포넌트 | 용도 |
| --- | --- |
| `<Figure src alt width height>캡션</Figure>` | 그림. 원본은 `public/posts/<slug>/`, 화면에는 next/image 가 줄인 WebP. 누르면 화면 가득 크게 본다 |
| `<LoaderPlayground t r pool caption />` | 동시 로더 수 ≒ T × R 을 독자가 바꿔 보는 그림 (`cache-stampede`) |
| `<HeapPlayground peak rows ratio memory caption />` | 측정 피크 힙을 건수에 비례해 늘려 컨테이너 힙 한도와 비교 (`ttlb-ttfb-download-api-bottleneck`) |
| `<BatchPlayground n batch batchMb caption />` | 쿼리 수 N → ⌈N/batch⌉ 와 batch 메모리 (`stream-pipeline-download-oom`) |
| `<NextStepPlayground caption />` | 1차 인증 뒤 판정 서비스가 돌려줄 다음 단계. 분기는 글의 흐름도(`08-next-step.png`)와 같다 (`two-factor-auth-design`) |

- 컴포넌트에 함수를 props 로 넘기지 않는다. 서버에서 그리는 MDX 가 클라이언트 컴포넌트로 함수를 넘기면 오류가 난다.
- 그림에 쓰는 숫자도 본문에 있는 값만 쓴다.
- 내 Medium 글로 가는 링크는 이 블로그의 같은 글 `/posts/<slug>` 로 바꿔 쓴다(Medium 에서 옮겨 온 글도). 글 페이지에서는 그 글로, 박물관 두루마리에서는 그 글의 두루마리로 열린다. 이 블로그에 없는 글이면 Medium 주소를 그대로 둔다.

목차, 테마 전환, 이어서 읽을 글, 링크 미리보기 카드(OG 이미지), sitemap·RSS(`/feed.xml`) 항목은 모든 글에 자동으로 붙는다. 글에 따로 넣지 않는다.

## 문체

- 기술 노트, 경험·컨퍼런스 글, 개발 회고: `tech-blog-evan` 스킬을 먼저 불러온다.
- 독후감, 에세이: `book-essay-evan` 스킬을 먼저 불러온다.
- 문체와 구조 규칙은 스킬이 정한다. 이 파일은 발행 형식(frontmatter, 컴포넌트, 커밋 규칙)만 다룬다.
- 글 안의 할 일 메모는 HTML 주석(`<!-- -->`)이 아니라 MDX 주석(`{/* */}`)으로 쓴다. 발행 전에는 지운다.

## 디자인 규칙 (v4 — 블랙 + 주황, 로그 컨셉)

토큰은 `src/app/globals.css` 에 있다. 값을 직접 쓰지 말고 변수를 쓴다.

- **색은 바탕·글자·강조 세 가지뿐이다.** 강조(`--accent`, 다크는 주황 · 밝음은 남색)는 강조에만 쓴다: 주제 라벨, 핵심 수치 배지, 지금 읽는 소제목, 링크 밑줄. 강조색을 새로 만들지 않는다.
- **글자 투명도는 70% 아래로 내리지 않는다.** 강조색은 글자로 써도 바탕 대비 4.5:1 을 넘게 잡았다(다크 주황 `#ff7a1a` 7.5, 밝음 남색 `#10286a` 10.7).
- 기본은 다크(검정 바탕에 흰 글자), 밝음은 선택. 밝음도 새하얀 바탕을 쓰지 않는다: 크림 `#ece2d6` 바탕에 짙은 회색 `#2b2b2b` 글자(새까만 글자는 쓰지 않는다, 흐린 글자는 75%), 강조는 남색 `#10286a`. 밝음에서는 주황을 강조색으로 쓰지 않는다. 전환은 빗방울이 화면 곳곳에 떨어져 번지며 약 1.7초에 걸쳐 바뀐다. 코드 블록은 테마와 상관없이 늘 어둡다.
- 글꼴: 본문·제목은 명조 Noto Serif KR(가독성), 날짜·라벨·수치·코드는 IBM Plex Mono. 고정폭 라벨 속 한글은 IBM Plex Sans KR 로 채운다.
- 글자 크기: 본문 16 · 소제목 21 · 제목 32.
- 목록 한 줄은 로그 한 줄처럼: 날짜 · `[주제]` · 제목 · 배지. 본문 끝 표시는 `EOF`.
- 움직임: 반응 150ms, 상태 변화 200ms, 입장 640ms, 물방울 480ms(`--ease-liquid`, 살짝 지나쳤다 돌아옴). 반복 애니메이션 금지(커서 막대도 깜빡이지 않는다). `prefers-reduced-motion` 을 지킨다.
- 물방울 인터랙션: 큰 분류 탭은 하나만 고르는 `LiquidTabs`, 2단계 칩은 여러 개를 함께 고르는 `LiquidChips`(고른 것 중 하나라도 맞으면 보임, '전체'는 모두 해제)(goo 필터 `#goo` 는 `Droplets` 가 깐다), 누른 자리 물방울과 행·카드의 차오르는 바탕은 `Droplets` 가 전역으로 붙인다. 새 요소에 넣으려면 `Droplets.tsx` 의 선택자에 더한다.
- 검색은 공개 글과 연구실 항목을 함께 찾는다(`src/lib/search.ts`, 연구실은 새 탭으로 연다). 검색 결과 맨 아래 '자연어로 묻기' 줄을 고르면 `/api/ask` 가 이 목록과 질문을 Claude Haiku 에 넘겨 짧은 답과 관련 글을 받는다. 글 찾기뿐 아니라 블로그·Evan 에 관한 물음('이 사람은 어떤 개발자야?')에도 글에 드러난 것만 근거로 '글로 보면 ~ 같아요'처럼 답하고, 그 밖의 물음(코드 대신 짜기·일반 상식 등)은 기록관 안내만 한다며 돌려 보낸다(지시문은 route.ts 의 `INSTRUCTIONS`). API 키는 없다: Claude Console 의 Workload Identity Federation 에 Vercel 을 OIDC 발급자로 등록해 Vercel 토큰으로 인증하고, 비용은 Console 의 `evan-log` 워크스페이스 월 한도 안에서만 나간다. 이 API 에 키를 새로 넣지 않는다.
- 키보드: `/` 나 ⌘K(Ctrl+K)는 어디서든 `$ grep` 검색(`SearchPalette`, 제목·주제·칩·태그·요약·설명에서 찾는다)을 열고(열면 예시 질문이 한 바퀴 타이핑됐다 지워지고 마지막 질문에서 멈춘다. 빈 칸에서 `Tab` 을 누르면 그 질문이 들어가고 `Enter` 로 AI 에 묻는다. 예시는 `SearchPalette` 의 `SUGGESTIONS`, 실제 글로 답이 나오는 질문만 둔다), 첫 화면 목록은 `j`/`k` 로 한 줄씩 오르내리며 `Enter` 로 연다.
- **박물관 모드**(`/museum`, 첫 화면 히어로 오른쪽 입구나 머리말 오른쪽 끝 `모드` 메뉴에서 들어간다. 처음 온 방문자에게는 한 번만 `모드` 버튼 아래 안내 말풍선이 뜬다: `ModeMenu` 의 `HINT_KEY`): 글 한 편이 진열대 하나인 3D 기록관(three.js, `src/components/museum/engine.ts`). 진열품은 `src/lib/museum.ts` 가 글·연구실에서 자동으로 만들고, 주제별 소품은 `PROP_BY_TOPIC` 에서 정한다. 리셉션 부엉이는 `/` 로 어디서든 부르고, 첫 인사는 세 줄 안에서 끝나 '질문하기'(`/api/ask`, 답을 먼저 말하고 고른 진열대가 있으면 안내한다)·'그만 대화하기' 두 버튼만 낸다. 대화창은 오른쪽 위 '닫기'(Esc)로 언제든 닫는다. 관(기술 노트관·연구실 별관·로비 책장)에 들어서면 관 이름이 화면 가운데 한 번 떴다 사라진다(`announce`). 고른 진열대는 바닥에 주황의 보색인 파란 고리(`C.mark`)로 표시한다(주황 카펫·나무 바닥 위에서 주황은 묻힌다). '글 읽기'는 글 페이지로 넘어가지 않고 `app/museum/@reader/(..)posts/[slug]` 가 `/posts/<slug>?from=museum` 을 가로채(쿼리는 첫 화면이 미리 받아 둔 글 캐시를 피하려고 붙인다. 빼면 첫 화면에 보이던 글이 글 페이지로 열린다) 장면 위에 펼친 두루마리(`Reader`, 위아래 나무 축 사이 종이)에 싣고 위에서 아래로 스크롤해 읽는다. 뒤로 가기·Esc 로 닫으면 서 있던 자리로 돌아오고, 새로고침이나 공유한 주소는 원래 글 페이지를 연다. 글 본문은 `PostArticle` 하나를 글 페이지와 함께 쓴다. 놀이 요소(진행은 모두 이 브라우저의 localStorage `evan-log:museum-passport` 에만 남고 서버로 보내지 않는다, `src/components/museum/passport.ts`):
  - 실시간 관람객(`presence.ts`): 같은 시각 박물관에 있는 다른 사람을 반투명 캐릭터(후드 색이 다르다)로 보여 주고 수첩 버튼 아래 '지금 N명 관람 중'을 띄운다. Supabase Realtime(Presence·Broadcast)에 탭마다 뽑는 임의 번호와 자리만 보내며, 걷는 동안 0.4초에 한 번, 멈추면 보내지 않는다. 관람 수첩은 보내지 않는다. 공개 주소·공개 키가 없으면 혼자 관람한다.
  - 들어올 때 장면이 두루마리처럼 위에서 펼쳐지고(`museum-unroll`) 캐릭터가 문턱에서 리셉션까지 걸어 들어온 뒤 부엉이가 말을 건다. 박물관을 떠나는 링크를 누르면 말려 올라간 뒤 이동한다(`Museum.tsx`).
  - 관람 수첩(`P`, 왼쪽 위 버튼): 두루마리를 끝까지 내리면 도장, 부엉이 퀴즈(frontmatter `quiz`)까지 맞히면 금도장(두루마리 끝 도장도 금색으로 바뀐다). 연구실은 열어 보면 찍힌다. 한 관을 다 모으면 출구 옆 명예의 전당 받침대의 가림천이 벗겨진다.
  - 숨은 버그: `engine.ts` 의 `bugs` 다섯 자리. 가까이 가면 잡히고, 다 잡으면 명예의 전당에 금 딱정벌레가 오른다.
  - 출구 문턱을 넘으면 관람 영수증(입장 시각·머문 시간·둘러본 진열대·읽은 글·잡은 버그·도장)이 나오고 이미지로 저장할 수 있다. 수치는 모두 이번 관람에서 실제로 잰 값이다.
  - 진열대 앞 `E`: 유리 돔이 올라가고 소품이 한 번 움직인 뒤 멈춘다. 같은 연재 진열대 사이 길은 평소 꺼져 있다가, 그 진열대에 다가가면 선 자리에서부터 점선과 편 번호가 한 칸씩 켜지며 다른 편 쪽으로 뻗고 길에서 멀어지면 꺼진다(`updateTrails`). 가장 최근 글 하나에 NEW 리본과 빛기둥(다 읽으면 꺼진다). 빛은 들어온 시각(아침·낮·저녁·밤)으로 한 번 정한다. **이 모드만 세 가지 색 규칙에서 빠진다**: 장난감 같은 느낌에 나무·풀·크림 색이 필요해서다. 색은 `engine.ts` 의 `C` 와 globals.css 의 `--m-*` 토큰에만 두고 다른 화면에 가져가지 않는다. 걷는 동안만 팔다리가 흔들리고 멈추면 멈춘다(반복 애니메이션 금지는 그대로). 부엉이와 캐릭터는 직접 만든 것이며 다른 게임의 캐릭터·건물·말풍선을 본뜨지 않는다.
- **방문자 수·조회수**(`src/lib/db.ts`·`src/lib/stats.ts`, spec `stats`): Vercel 마켓플레이스로 연동한 Supabase Postgres(서울)에 쌓는다. 서버는 `POSTGRES_URL` 만 읽고, 접속 문자열·비밀번호는 코드·문서에 적지 않는다. 표는 처음 쓸 때 만들고 RLS 를 켠다(공개 키로 못 읽게). 사람은 IP·브라우저 원문 대신 날짜를 섞은 해시로 하루 한 번만 세고 로봇은 빼며, 글은 10초 넘게 읽어야 조회 한 번이다. 바닥글에 `today · total`, 첫 화면 행과 박물관 진열대에 `HOT`(최근 7일)·`BEST`(누적) 표식을 단다(첫 화면·박물관은 한 시간마다 다시 만든다). 조회수 숫자는 목록·진열대에 새기지 않고 박물관 설명판에만(10명 이상) 보인다. 화면의 숫자는 모두 실제로 잰 값이다.
- 목록 행에 손을 올리면 본문 앞부분(`excerpt`, `src/lib/posts.ts` 에서 뽑음)이 타이핑되고 끝에 `… 더보기` 가 붙는다. 첫 화면 문구는 "백엔드 개발자 Evan 의 기술 노트와 독후감" 한 줄뿐이다. 그 오른쪽(좁은 화면에서는 아래)에 박물관 입구(`MuseumDoor`, 실제 진열대 수를 보여 준다) 하나만 둔다. 누르도록 이끄는 자리라 테두리·아이콘·라벨·입장 버튼을 강조색으로 두고, 들어올 때 테두리 빛이 한 번만 퍼진다.
