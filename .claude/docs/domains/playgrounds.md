# playgrounds

글(MDX) 안에서 import 없이 쓰는 컴포넌트: 그림(`Figure`·`ZoomImage`), 코드 블록(`CodeBlock`), 독자가 본문 숫자를 바꿔 보는 Playground 넷과 그 막대(`PlaygroundBar`).

## 코드 위치

- `src/components/mdx/Figure.tsx` — 그림과 캡션(서버 컴포넌트)
- `src/components/mdx/ZoomImage.tsx` — next/image 그림, 누르면 `<dialog>` 로 크게 보기
- `src/components/mdx/CodeBlock.tsx` — 코드 블록 위 언어 이름·복사 버튼(`pre` 대체)
- `src/components/mdx/LoaderPlayground.tsx` — 동시 로더 수 ≒ T × R 과 커넥션 풀 (`cache-stampede`)
- `src/components/mdx/HeapPlayground.tsx` — 측정 피크 힙을 건수에 비례해 늘려 힙 한도와 비교 (`ttlb-ttfb-download-api-bottleneck`)
- `src/components/mdx/BatchPlayground.tsx` — 쿼리 수 N → ⌈N/batch⌉ 와 batch 메모리 (`stream-pipeline-download-oom`)
- `src/components/mdx/NextStepPlayground.tsx` — 1차 인증 뒤 다음 단계 판정 (`two-factor-auth-design`)
- `src/components/mdx/PlaygroundBar.tsx` — Playground 공용 막대(한도선·초과 빗금)
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
- **PlaygroundBar**: 눈금 끝 `scale = max(value, limit × 1.25)`. 한도 안은 칠하고(`playground__acquired`) 넘친 만큼은 빗금(`playground__waiting`). 한도선 위치가 60% 를 넘으면 라벨을 선 왼쪽에 붙인다(`playground__pool--end`).
- **CodeBlock**: `data-language` 를 `LABELS`(bash→Shell, dockerfile, html, http, java, json·jsonc→JSON, text, xml)로 바꿔 보이고, 없는 언어는 그대로, 속성이 없으면 `text`. 복사는 `pre.innerText` 를 클립보드에 쓰고 1500ms 동안 `복사됨`.
- **ZoomImage**: 본문 그림은 `sizes="(max-width: 760px) 100vw, 680px"`, 확대 그림은 `sizes="min(100vw, <width>px)"`·`loading="lazy"`·`maxWidth: <width>px`(원본보다 크게 늘리지 않음). `<dialog>.showModal()` 로 열고 아무 데나 누르거나 Esc 로 닫는다.

### 핵심 설계 결정

- **숫자는 본문 값만**: Playground 초기값과 고정값(`pool`, `peak`, `rows`, `ratio`, `batchMb`)은 MDX 에서 본문 숫자를 넘기고, 독자가 바꾼 결과는 그 비례 추정이다. 컴포넌트 안에 글의 수치를 박지 않는다.
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
CodeBlock(props: ComponentProps<'pre'> & { 'data-language'?: string }) // MDX 의 pre 대체
```

내부용: `ZoomImage({ src, alt, width, height })`(Figure 가 씀), `PlaygroundBar({ value, limit, limitLabel, label })`(Loader·Heap 이 씀).

### 지금 글에서 쓰는 곳

| 컴포넌트 | 글 |
| --- | --- |
| `LoaderPlayground` | `cache-stampede` |
| `HeapPlayground` | `ttlb-ttfb-download-api-bottleneck` |
| `BatchPlayground` | `stream-pipeline-download-oom` |
| `NextStepPlayground` | `two-factor-auth-design` |
| `Figure` | 그림이 있는 글 대부분 |

### DOM·스타일 계약

클래스(`figure`, `card`, `playground`, `playground__controls/field/result/legend/bar/acquired/waiting/pool`, `stepper*`, `code`, `code__bar`, `zoom*`)의 모양은 `src/app/globals.css` 에 있다.

### 에러 계약

빌드를 멈추는 검증은 없다. 등록되지 않은 태그를 MDX 에 쓰면 MDX 컴파일·렌더 단계에서 오류가 난다. 클립보드 쓰기 실패는 조용히 무시한다.

## 3. Context Map

- **posts → playgrounds**: `src/mdx-components.tsx` 가 `Figure`·`CodeBlock`·`LoaderPlayground`·`HeapPlayground`·`BatchPlayground`·`NextStepPlayground` 를 import 해 등록한다. 다른 도메인은 이 폴더를 직접 import 하지 않는다.
- **posts(MDX 설정) → CodeBlock**: `next.config.ts` 의 `rehype-pretty-code` 가 만든 `pre`(`data-language` 속성, `--code-*` CSS 변수 색)를 받는다.
- **playgrounds → shell**: 색·글꼴·모양은 `src/app/globals.css` 토큰과 클래스에 기댄다.
- **museum**: 박물관 두루마리도 `PostArticle` 을 거쳐 같은 컴포넌트를 그린다(직접 import 는 없다).

최종 갱신: 2026-11-06
