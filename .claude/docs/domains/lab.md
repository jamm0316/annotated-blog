# lab

연구실: GitHub Pages 에 올린 실험과 로컬 전용 도구의 목록(`LAB`)과, 첫 화면 `연구실` 탭의 썸네일 카드(`LabGrid`). 글이 아니다.

## 코드 위치

- `src/lib/lab.ts` — `LabItem` 타입과 목록 `LAB`
- `src/components/LabGrid.tsx` — 썸네일 카드 그리드(서버 컴포넌트, `'use client'` 없음)
- `public/lab/<repo>.png` — 카드 썸네일. 1200×750 첫 화면 스크린샷
- 스타일: `src/app/globals.css` 의 `/* 연구실: 썸네일 카드 두 줄 … */` 섹션 (파일 자체는 shell 소속)

## 1. 컨텍스트 내부

### 엔티티

`LabItem`

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| repo | `string` | GitHub 저장소 이름. 썸네일 파일 이름·카드 key·검색/박물관 id(`lab:<repo>`)로 쓰인다 |
| title | `string` | 카드 제목 |
| short | `string` | 박물관 진열대 이름표. 10자 이내(주석 규칙. 코드에서 검사하지 않는다) |
| kind | `string` | 2단계 칩으로 묶는 종류. 지금 값: `기록`, `도구`, `팀메이트`, `놀이` |
| pitch | `string` | 한 줄 미끼. 카드 제목 아래 |
| description | `string` | 무엇을 하는지 1~2문장 |
| stack | `string[]` | 사용한 기술 |
| date | `string` | 저장소를 만든 날 `YYYY-MM-DD`. 카드에는 `YYYY.MM` |
| url? | `string` | 배포 주소. 로컬 전용이면 비운다 |

### 비즈니스 규칙

- 배포 주소는 `pages(repo, path = '')` 가 `https://jamm0316.github.io/<repo>/<path>` 로 만든다.
- 저장소 주소는 `https://github.com/jamm0316/<repo>`.
- `url` 이 있으면 카드 전체가 배포 주소로 가고, 발에 `열어 보기 ↗` 와 따로 얹은 `저장소` 링크가 있다. 없으면 카드 전체가 저장소로 가고 `저장소에서 보기 ↗ · 로컬 실행` 이 뜬다. 지금 `url` 이 없는 항목은 `pixel-agents` 하나.
- 모든 링크는 새 탭(`target="_blank" rel="noopener noreferrer"`).
- 썸네일은 `next/image` 로 `width=1200 height=750`, `sizes="(max-width: 720px) 100vw, 360px"`, alt 는 `<title> 첫 화면`.
- 카드 입장 지연 `--i` 는 목록 순서 그대로(상한 없음).
- 설명의 사실은 저장소 README 와 배포된 페이지에 적힌 것만 쓴다. 남의 상표를 베낀 연습물은 올리지 않고, 썸네일에 회사 프로젝트 이름이나 가족 얼굴이 보이면 가린다(AGENTS.md).

### 핵심 설계 결정

- **링크 안에 링크를 넣지 않는다**: 카드 전체를 누를 수 있게 제목 링크 `.lab-card__link` 의 `::after` 를 카드 크기로 펼치고, `저장소` 링크만 그 위에 얹는다.
- **목록 순서 = 화면 순서**: `LAB` 배열 순서대로 그린다(날짜 정렬 없음). 검색은 따로 날짜순으로 섞는다.

## 2. 외부 노출 (Published Language)

```ts
// src/lib/lab.ts
export type LabItem = { repo; title; short; kind; pitch; description; stack: string[]; date; url?: string };
export const LAB: LabItem[];

// src/components/LabGrid.tsx
export function LabGrid(props: { items: LabItem[] }): JSX.Element;
```

### 파일·DOM 계약

- 새 항목 추가 = `LAB` 에 한 줄 + `public/lab/<repo>.png`(1200×750). 파일 이름은 `repo` 와 대소문자까지 같아야 한다.
- `.lab-card__link`: browse 의 `j`/`k` 가 `#posts .lab-card__link` 로 초점을 옮긴다. 이름을 바꾸면 키보드 이동이 끊긴다.
- `.lab-card`: Droplets 의 `RIPPLE`·`FILL` 선택자에 들어 있다(누른 자리 물방울, 손이 들어온 자리에서 차오르는 바탕).

### 에러 계약

- 빌드를 멈추는 검사는 없다. 썸네일이 없으면 이미지가 깨진 채로 빌드된다.

## 3. Context Map

| 상대 도메인 | 방향 | 방식 |
| --- | --- | --- |
| browse | browse → lab | `page.tsx` 가 `LAB` 을 `PostBrowser` 에 넘기고, `PostBrowser` 가 `kind` 로 칩을 만들어 `LabGrid` 를 그린다 |
| search | search → lab | `src/lib/search.ts` 가 `LAB` 을 검색 항목(`id: lab:<repo>`, `external: true`, 새 탭)과 자연어 질문용 목록에 넣는다. `kind`·`pitch`·`description`·`stack` 을 쓴다 |
| museum | museum → lab | `src/lib/museum.ts` 가 `LAB` 을 연구실 별관 진열품(`hall: 'lab'`, `short`, 소품 `monitor`)으로 만든다 |
| shell | shell → lab | 카드 스타일은 `globals.css` |

최종 갱신: 2026-11-06
