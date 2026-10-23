<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Annotated — 에이전트 작업 지침

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

눈금자(▸), 테마 전환, 이어서 읽을 글은 모든 글에 자동으로 붙는다. 글에 따로 넣지 않는다.

## 문체

- 기술 노트: `tech-blog-evan` 스킬을 먼저 불러온다.
- 독후감: `book-essay-evan` 스킬을 먼저 불러온다.
- 결론을 먼저 쓴다. 정밀하고 담백하게.

## 디자인 규칙 (시안 v1 기준)

토큰은 `src/app/globals.css` 에 있다. 값을 직접 쓰지 말고 변수를 쓴다.

- **색은 남색·베이지 두 가지뿐이다.** 강조색을 새로 만들지 않는다. 링크는 밑줄, 현재 위치는 굵기와 ▸ 마커로 표시한다.
- **글자 투명도는 70% 아래로 내리지 않는다.** 70% 가 대비 4.5:1 을 겨우 넘는다(라이트 4.88, 다크 4.77). 60% 는 미달이다.
- 기본은 라이트(베이지 종이에 남색 글자), 다크는 청사진(남색 바탕에 베이지 글자).
- 글자 크기: 본문 16 · 소제목 21 · 제목 32. 고정폭 글꼴은 날짜·라벨·수치에만 쓴다.
- 움직임: 반응 150ms, 상태 변화 200ms, 입장 640ms. 입장 효과는 제목에만, 왼쪽부터 그어지듯 드러난다. 반복 애니메이션 금지. `prefers-reduced-motion` 을 지킨다.
