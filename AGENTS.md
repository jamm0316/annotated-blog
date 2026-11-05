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

## 글 추가

```
content/posts/<slug>/index.mdx
```

`<slug>` 는 영어 소문자·하이픈, 날짜를 넣지 않으며 한번 정하면 바꾸지 않는다.

```yaml
---
title: '캐시가 Redis가 아니었다'
description: '한 줄 요약. 목록·검색 결과·OG 에 그대로 나간다.'
category: 'note' # note = 기술 노트, book = 독후감
topic: '캐시' # 시스템 단위. 같은 시스템은 항상 같은 문자열
series: '캐시 연재 1편' # 없으면 ''
badge: 'TTFB −96%' # 목록에 붙는 핵심 수치. 없으면 ''
date: 2026-10-23
tags: ['Spring Cache', 'Redis', '진단']
draft: false
---
```

## 글 안에서 쓰는 컴포넌트

`src/mdx-components.tsx` 에 등록돼 있어 import 없이 쓴다. 새 컴포넌트는 기존 것으로 안 될 때만 만든다.

| 컴포넌트 | 용도 |
| --- | --- |
| `<Figure src alt width height>캡션</Figure>` | 그림. 원본은 `public/posts/<slug>/`, 화면에는 next/image 가 줄인 WebP |
| `<LoaderPlayground t r pool caption />` | 동시 로더 수 ≒ T × R 을 독자가 바꿔 보는 그림 (`cache-stampede`) |
| `<HeapPlayground peak rows ratio memory caption />` | 측정 피크 힙을 건수에 비례해 늘려 컨테이너 힙 한도와 비교 (`ttlb-ttfb-download-api-bottleneck`) |
| `<BatchPlayground n batch batchMb caption />` | 쿼리 수 N → ⌈N/batch⌉ 와 batch 메모리 (`stream-pipeline-download-oom`) |

- 컴포넌트에 함수를 props 로 넘기지 않는다. 서버에서 그리는 MDX 가 클라이언트 컴포넌트로 함수를 넘기면 오류가 난다.
- 그림에 쓰는 숫자도 본문에 있는 값만 쓴다.

목차, 테마 전환, 이어서 읽을 글은 모든 글에 자동으로 붙는다. 글에 따로 넣지 않는다.

## 문체

- 기술 노트, 경험·컨퍼런스 글, 개발 회고: `tech-blog-evan` 스킬을 먼저 불러온다.
- 독후감, 에세이: `book-essay-evan` 스킬을 먼저 불러온다.
- 문체와 구조 규칙은 스킬이 정한다. 이 파일은 발행 형식(frontmatter, 컴포넌트, 커밋 규칙)만 다룬다.
- 글 안의 할 일 메모는 HTML 주석(`<!-- -->`)이 아니라 MDX 주석(`{/* */}`)으로 쓴다. 발행 전에는 지운다.

## 디자인 규칙 (v4 — 블랙 + 주황, 로그 컨셉)

토큰은 `src/app/globals.css` 에 있다. 값을 직접 쓰지 말고 변수를 쓴다.

- **색은 검정·흰 글자·주황 세 가지뿐이다.** 주황(`--accent`)은 강조에만 쓴다: 주제 라벨, 핵심 수치 배지, 지금 읽는 소제목, 링크 밑줄. 강조색을 새로 만들지 않는다.
- **글자 투명도는 70% 아래로 내리지 않는다.** 주황은 글자로 써도 바탕 대비 4.5:1 을 넘게 잡았다(다크 `#ff7a1a` 7.5, 라이트 `#b83a06` 5.2).
- 기본은 다크(검정 바탕에 흰 글자), 라이트는 선택. 코드 블록은 테마와 상관없이 늘 어둡다.
- 글꼴: 본문·제목은 IBM Plex Sans KR, 날짜·라벨·수치·코드는 IBM Plex Mono.
- 글자 크기: 본문 16 · 소제목 21 · 제목 32.
- 목록 한 줄은 로그 한 줄처럼: 날짜 · `[주제]` · 제목 · 배지. 본문 끝 표시는 `EOF`.
- 움직임: 반응 150ms, 상태 변화 200ms, 입장 640ms. 입장 효과는 제목에만, 아래에서 살짝 떠오른다. 반복 애니메이션 금지(커서 막대도 깜빡이지 않는다). `prefers-reduced-motion` 을 지킨다.
