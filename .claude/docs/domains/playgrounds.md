# playgrounds

글(MDX) 안에서 import 없이 쓰는 컴포넌트: 그림(`Figure`·`ZoomImage`), 코드 블록(`CodeBlock`), 독자가 본문 숫자를 바꿔 보는 Playground 와 그 막대(`PlaygroundBar`), 원래 모양 그대로 그린 다이어그램(클래스·상태)과 스스로 재생되는 장면 그림(시퀀스·선점·회수), 그 공용 부품(`SequenceDiagram`·`usePlay`·`useDrawOnce`).

## 코드 위치

- `src/components/mdx/Figure.tsx` — 그림과 캡션(서버 컴포넌트)
- `src/components/mdx/ZoomImage.tsx` — next/image 그림, 누르면 `<dialog>` 로 크게 보기
- `src/components/mdx/CodeBlock.tsx` — 코드 블록 위 언어 이름·복사 버튼(`pre` 대체)
- `src/components/mdx/LoaderPlayground.tsx` — 동시 로더 수 ≒ T × R 과 커넥션 풀 (`cache-stampede`)
- `src/components/mdx/HeapPlayground.tsx` — 측정 피크 힙을 건수에 비례해 늘려 힙 한도와 비교 (`ttlb-ttfb-download-api-bottleneck`)
- `src/components/mdx/BatchPlayground.tsx` — 쿼리 수 N → ⌈N/batch⌉ 와 batch 메모리 (`stream-pipeline-download-oom`)
- `src/components/mdx/NextStepPlayground.tsx` — 1차 인증 뒤 다음 단계 판정 (`two-factor-auth-design`)
- `src/components/mdx/PlaygroundBar.tsx` — Playground 공용 막대(한도선·초과 빗금)
- `src/components/mdx/SequenceDiagram.tsx` — 시퀀스 다이어그램 HTML 부품(생명선·메시지·메모·loop, 줄마다 상태와 ×n)
- `src/components/mdx/usePlay.ts` — 장면을 스스로 한 번 재생하는 훅(화면에 처음 들어오면 자동, 장면 버튼은 처음부터 다시)
- `src/components/mdx/useDrawOnce.ts` — 화면에 처음 들어올 때 한 번 true. 다이어그램 화살표를 한 번 그려 넣는다
- `src/components/mdx/QueueClassDiagram.tsx` — 작업 큐 클래스 다이어그램(SVG, UML 모양) (`async-job-queue-without-broker`)
- `src/components/mdx/JobStateDiagram.tsx` — 작업 문서 상태 다이어그램(SVG) (`async-job-queue-without-broker`)
- `src/components/mdx/JobSequencePlayground.tsx` — 접수부터 결과 전달까지 스스로 재생되는 시퀀스 (`async-job-queue-without-broker`)
- `src/components/mdx/FailurePointPlayground.tsx` — 실패 장면별로 재생되는 시퀀스 (`async-job-queue-without-broker`)
- `src/components/mdx/ClaimPlayground.tsx` — 원자적 선점·분산 락 장면 (`async-job-queue-without-broker`)
- `src/components/mdx/RecoveryPlayground.tsx` — 회수 장면 타임라인 (`async-job-queue-without-broker`)
- 등록은 posts 도메인의 `src/mdx-components.tsx`

## 1. 컨텍스트 내부

### 엔티티

Playground 의 상태는 모두 컴포넌트 안의 `useState` 뿐이다. 서버·저장소에 남기지 않는다. 초기값은 MDX 에서 넘긴 props(본문 숫자)이고, 바꾼 값이 있으면 `본문 가정으로`(NextStep 은 `처음 값으로`) 버튼이 켜져 초기값으로 되돌린다.

`NextStepPlayground` 의 `Values`:

| 키 | 라벨 | 보기 | 처음 값(`START`) |
| --- | --- | --- | --- |
| `policy` | 전역 정책 사용 | ON / OFF | ON |
| `mode` | 적용 방식 | 선택 적용 / 강제 적용 | 강제 적용 |
| `personal` | 개인 2FA 사용 | 사용 / 사용 안 함 / 미선택 | 미선택 |
| `appAllowed` | 정책이 인증 앱 허용 | 예 / 아니오 | 예 |
| `personalApp` | 개인 인증 앱 선택 | 인증 앱 / 이메일 / 미선택 | 인증 앱 |
| `registered` | 인증 앱 등록 완료 | 예 / 아니오 | 예 |

### 비즈니스 규칙(계산식과 상수)

- **LoaderPlayground**: `loaders = round(t / 1000 × r)`, `acquired = min(loaders, pool)`, `waiting = max(0, loaders − pool)`. 슬라이더 T `50~1000ms` step 1, R `0~1000건` step 10. `pool` 은 바꿀 수 없다.
- **HeapPlayground**: `estimated = peak × n / rows`(MB), `limit = memory × 1000 × ratio / 100`(MB), `usage = round(estimated / limit × 100)`%. 100% 를 넘으면 `OOM`, 아니면 `한도 안`. 슬라이더 건수 `1000~200000` step 100, 메모리 `1~8GB` step 1. 1000MB 이상은 `x.xGB` 로 표기.
- **BatchPlayground**: `flushes = ceil(n / batch)`, `memory = round(batchMb × batch / b0)`(batch 크기에 비례한 추정, batch 를 바꾸면 `(추정)` 표시), 감소 배수 `round(n / flushes)`. 슬라이더 N `1000~200000` step 100, batch `100~10000` step 100.
- **NextStepPlayground `resolve`**: 흐름도를 위에서부터 따라가며 거친 질문(`asked`)과 도착 단계(`step`)를 돌려준다.
  - `policy = OFF` → 정식 토큰 발급
  - `mode = 선택 적용` 이면 `personal`: `사용 안 함` → 정식 토큰 발급, `미선택` → 2FA 사용 여부 묻기, `사용` → 아래로
  - `appAllowed = 아니오` → 이메일 코드 입력
  - `personalApp`: `이메일` → 이메일 코드 입력, `미선택` → 인증 앱 등록 권유
  - `registered`: `예` → 인증 앱 코드 입력, `아니오` → 인증 앱 등록
  - 토큰은 `정식 토큰 발급` 일 때만 `정식 토큰`, 나머지는 `pre-auth 토큰`. `asked` 에 없는 칸은 `is-unused` 로 흐리게 그린다.
- **usePlay(total, ms)**: `step` 은 보여 준 장면 수(0~total). 화면의 40% 가 처음 보이면 한 번 재생하고, `play()` 는 0 부터 다시 재생한다. 끝에서 멈추고 반복하지 않는다. `prefers-reduced-motion` 이면 바로 마지막 장면.
- **JobSequencePlayground**: 10줄을 650ms 마다 한 줄씩. 지난 줄·지금 줄(강조)·앞으로 줄을 칠하고 작업 문서 상태를 따라 바꾼다. 끝나면 `다시 보기`.
- **FailurePointPlayground `SCENES`**: 장면마다 재생할 줄 순서(`frames`, 520ms). 같은 줄이 두 번 나오면 ×2. ① 판독 실패: 실패 메모 뒤 선점·판독 요청을 다시(토큰 1번), ② 묶기: 콜백 실패 뒤 선점부터 전송까지 다시(토큰 2번), ② 나누기(본문 설계, 처음 장면): 콜백 선점·전송만 다시(토큰 1번), ③ 전송 직후 기록 전 파드 종료: 콜백 선점·전송 다시(받은 결과 2번). 끝나면 토큰 차감·받은 결과 수와 장면 요점 한 줄.
- **ClaimPlayground**: 파드 3개·작업 6건 예시(그림용 값). 900ms 마다 폴링 한 번, 폴링하는 파드(락이면 A 만)가 접수 순으로 하나씩 가져간다. 회차마다 먼저 닿는 파드를 돌린다. 락이 없으면 폴링 2번, 락이면 6번에 다 가져간다.
- **RecoveryPlayground `SCENES`**: 시간 축 0~35분을 70ms 에 1분씩. 본문 설정(회수 `stale`, 판독 `longest` → AI 1번), 회수 기준이 판독보다 짧으면(기준선 위치 `longest × 0.6`, 숫자는 적지 않음 → 워커 B 가 다시 불러 AI 2번), 워커가 죽으면(워커 A 가 ✕, `stale` 에 회수 → 멈춰 있던 시간 `stale`분). 회수 스케줄러 60초 주기는 그리지 않는다.
- **QueueClassDiagram·JobStateDiagram**: 원문 그림의 배치를 SVG 좌표로 옮겼다. 화살표는 `pathLength=1` 대시로 한 번 그려지고(`--dur-slow`), 그 뒤 화살촉·라벨이 뜬다. 박스에 올리거나 포커스하면 그 박스와 이어진 화살표만 강조하고, 클래스 다이어그램은 화살표와 짝인 저장소 메서드도 강조한다. 클래스 다이어그램은 좁은 화면에서 그림만 가로로 민다(최소 620px).
- **PlaygroundBar**: 눈금 끝 `scale = max(value, limit × 1.25)`. 한도 안은 칠하고(`playground__acquired`) 넘친 만큼은 빗금(`playground__waiting`). 한도선 위치가 60% 를 넘으면 라벨을 선 왼쪽에 붙인다(`playground__pool--end`).
- **CodeBlock**: `data-language` 를 `LABELS`(bash→Shell, dockerfile, html, http, java, json·jsonc→JSON, text, xml)로 바꿔 보이고, 없는 언어는 그대로, 속성이 없으면 `text`. 복사는 `pre.innerText` 를 클립보드에 쓰고 1500ms 동안 `복사됨`.
- **ZoomImage**: 본문 그림은 `sizes="(max-width: 760px) 100vw, 680px"`, 확대 그림은 `sizes="min(100vw, <width>px)"`·`loading="lazy"`·`maxWidth: <width>px`(원본보다 크게 늘리지 않음). `<dialog>.showModal()` 로 열고 아무 데나 누르거나 Esc 로 닫는다.

### 핵심 설계 결정

- **숫자는 본문 값만**: Playground 초기값과 고정값(`pool`, `peak`, `rows`, `ratio`, `batchMb`)은 MDX 에서 본문 숫자를 넘기고, 독자가 바꾼 결과는 그 비례 추정이다. 컴포넌트 안에 글의 수치를 박지 않는다.
- **조작이 아니라 장면**: 글 안의 그림은 독자가 조작법을 익히게 하지 않는다. 스스로 한 번 움직이거나 장면 버튼 한 번으로 재생된다(모델하우스처럼 누르면 그곳이 켜진다). 슬라이더·한 칸 넘기기는 새로 만들지 않는다.
- **본문 그림과 같은 이름·숫자**: 작업 큐 그림 넷의 상태 이름·전이·관계·주기·재시도 숫자는 `async-job-queue-without-broker` 본문(원문 Medium 그림)에서 옮겼다. 컴포넌트 안에 두지만 본문을 바꾸면 같이 바꾼다.
- **흐름도와 한 칸도 다르지 않게**: `NextStepPlayground` 의 분기는 `public/posts/two-factor-auth-design/08-next-step.png` 흐름도를 옮긴 것이다. 하나를 바꾸면 다른 쪽도 바꾼다.
- **함수 props 금지**: MDX 는 서버에서 그려지므로 클라이언트 컴포넌트에 넘기는 props 는 숫자·문자열만 쓴다. `caption` 도 문자열이다(`Figure` 만 children 캡션).
- **클라이언트 경계**: `Figure`·`PlaygroundBar` 는 서버 컴포넌트, 나머지는 `'use client'`.

## 2. 외부 노출 (Published Language)

### 컴포넌트 props (MDX 에서 쓰는 이름 그대로)

```ts
Figure({ src: string; alt: string; width: number; height: number; children?: ReactNode })
// 원본은 public/posts/<slug>/, src 는 '/posts/<slug>/...' 경로
LoaderPlayground({ t: number /* ms */; r: number /* 초당 요청 */; pool: number; caption?: string })
HeapPlayground({ peak: number /* MB */; rows: number; ratio: number /* % */; memory: number /* GB */; caption?: string })
BatchPlayground({ n: number; batch: number; batchMb: number /* MB */; caption?: string })
NextStepPlayground({ caption?: string })
QueueClassDiagram({ caption?: string })
ClaimPlayground({ caption?: string })
RecoveryPlayground({ timeout: number /* 분 */; stale: number /* 분 */; longest: number /* 분 */; caption?: string })
JobStateDiagram({ caption?: string })
JobSequencePlayground({ caption?: string })
FailurePointPlayground({ caption?: string })
CodeBlock(props: ComponentProps<'pre'> & { 'data-language'?: string }) // MDX 의 pre 대체
```

내부용: `ZoomImage({ src, alt, width, height })`(Figure 가 씀), `PlaygroundBar({ value, limit, limitLabel, label })`(Loader·Heap 이 씀), `SequenceDiagram({ participants, rows, marks?, counts?, label })`(JobSequence·FailurePoint 가 씀, 좁은 화면에서는 그림만 가로로 민다).

### 지금 글에서 쓰는 곳

| 컴포넌트 | 글 |
| --- | --- |
| `LoaderPlayground` | `cache-stampede` |
| `HeapPlayground` | `ttlb-ttfb-download-api-bottleneck` |
| `BatchPlayground` | `stream-pipeline-download-oom` |
| `NextStepPlayground` | `two-factor-auth-design` |
| `QueueClassDiagram`·`JobStateDiagram`·`JobSequencePlayground`·`ClaimPlayground`·`RecoveryPlayground`·`FailurePointPlayground` | `async-job-queue-without-broker` |
| `Figure` | 그림이 있는 글 대부분 |

### DOM·스타일 계약

클래스(`figure`, `card`, `playground`, `playground__controls/field/result/legend/buttons/bar/acquired/waiting/pool`, `stepper*`, `seq*`, `diagram*`, `scene*`, `claim*`, `recov*`, `code`, `code__bar`, `zoom*`)의 모양은 `src/app/globals.css` 에 있다.

### 에러 계약

빌드를 멈추는 검증은 없다. 등록되지 않은 태그를 MDX 에 쓰면 MDX 컴파일·렌더 단계에서 오류가 난다. 클립보드 쓰기 실패는 조용히 무시한다.

## 3. Context Map

- **posts → playgrounds**: `src/mdx-components.tsx` 가 `Figure`·`CodeBlock`·`*Playground` 를 import 해 등록한다. 다른 도메인은 이 폴더를 직접 import 하지 않는다.
- **posts(MDX 설정) → CodeBlock**: `next.config.ts` 의 `rehype-pretty-code` 가 만든 `pre`(`data-language` 속성, `--code-*` CSS 변수 색)를 받는다.
- **playgrounds → shell**: 색·글꼴·모양은 `src/app/globals.css` 토큰과 클래스에 기댄다.
- **museum**: 박물관 두루마리도 `PostArticle` 을 거쳐 같은 컴포넌트를 그린다(직접 import 는 없다).

최종 갱신: 2026-11-13
