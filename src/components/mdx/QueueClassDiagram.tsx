'use client';

// @MX:NOTE: 작업 큐 클래스 다이어그램(UML 모양 그대로). 화면에 들어오면 화살표가 한 번 그려지고, 클래스에 올리면 관계가 강조된다 (async-job-queue-without-broker)
// @MX:SPEC: .claude/docs/domains/playgrounds.md

import { useState } from 'react';
import { useDrawOnce } from './useDrawOnce';

// 클래스·관계·라벨은 원문 Medium 의 클래스 다이어그램과 같고 배치도 그 그림을 따랐다. 본문 그림을 바꾸면 여기도 같이 바꾼다.
type Box = {
  id: string;
  x: number;
  y: number;
  w: number;
  attrs?: string[];
  methods?: string[];
};
const ROW = 18;
const HEAD = 30;
const BOXES: Box[] = [
  { id: 'JobReceiveService', x: 240, y: 10, w: 180 },
  { id: 'WorkerPoller', x: 10, y: 170, w: 150 },
  { id: 'CallbackPoller', x: 250, y: 170, w: 160 },
  { id: 'StaleJobRecoverer', x: 240, y: 300, w: 180 },
  { id: 'JobProcessor', x: 250, y: 430, w: 160 },
  {
    id: 'JobQueueRepository',
    x: 490,
    y: 30,
    w: 285,
    methods: ['save(job)', 'claimNext()', 'claimCallback()', 'recoverStale()', 'markDone(jobId, expectedStartedAt)'],
  },
  {
    id: 'Job',
    x: 797,
    y: 10,
    w: 180,
    attrs: [
      'status',
      'receivedAt',
      'processingStartedAt',
      'nextAttemptAt',
      'retryCount',
      'callbackStartedAt',
      'callbackNextAttemptAt',
      'callbackRetryCount',
      'result',
    ],
  },
  { id: 'CallbackProcessor', x: 570, y: 300, w: 180 },
  { id: 'CallbackClient', x: 820, y: 300, w: 150 },
  { id: 'AiClient', x: 610, y: 430, w: 110 },
];

// 칸: 이름 · 필드 · 메서드. 비어 있는 칸도 UML 처럼 얇게 남긴다
const height = (b: Box) =>
  HEAD + Math.max(1, b.attrs?.length ?? 0) * ROW + 8 + Math.max(1, b.methods?.length ?? 0) * ROW + 8;

type Edge = {
  from: string;
  to: string;
  label: string;
  d: string;
  lx: number;
  ly: number;
  method?: string;
};
const EDGES: Edge[] = [
  {
    from: 'JobReceiveService',
    to: 'JobQueueRepository',
    label: '넣기',
    d: 'M420 40 C455 40 460 60 490 60',
    lx: 455,
    ly: 44,
    method: 'save(job)',
  },
  {
    from: 'WorkerPoller',
    to: 'JobQueueRepository',
    label: '선점',
    d: 'M160 185 C280 110 380 95 490 95',
    lx: 330,
    ly: 112,
    method: 'claimNext()',
  },
  {
    from: 'CallbackPoller',
    to: 'JobQueueRepository',
    label: '리스 선점',
    d: 'M410 185 C440 165 455 140 490 135',
    lx: 450,
    ly: 160,
    method: 'claimCallback()',
  },
  {
    from: 'CallbackPoller',
    to: 'CallbackProcessor',
    label: '전용 스레드풀에 제출',
    d: 'M410 215 C470 230 520 300 570 320',
    lx: 500,
    ly: 268,
  },
  {
    from: 'StaleJobRecoverer',
    to: 'JobQueueRepository',
    label: '회수',
    d: 'M420 330 C480 330 510 250 530 184',
    lx: 478,
    ly: 318,
    method: 'recoverStale()',
  },
  {
    from: 'JobProcessor',
    to: 'JobQueueRepository',
    label: '조건부 갱신',
    d: 'M410 445 C520 430 545 300 560 184',
    lx: 520,
    ly: 400,
    method: 'markDone(jobId, expectedStartedAt)',
  },
  {
    from: 'JobProcessor',
    to: 'AiClient',
    label: '판독 요청',
    d: 'M410 470 L610 470',
    lx: 520,
    ly: 462,
  },
  {
    from: 'WorkerPoller',
    to: 'JobProcessor',
    label: '전용 스레드풀에 제출',
    d: 'M85 230 C95 400 170 470 250 470',
    lx: 130,
    ly: 420,
  },
  {
    from: 'CallbackProcessor',
    to: 'CallbackClient',
    label: '결과 통지',
    d: 'M750 330 L820 330',
    lx: 785,
    ly: 322,
  },
  {
    from: 'JobQueueRepository',
    to: 'Job',
    label: '',
    d: 'M775 120 L797 120',
    lx: 0,
    ly: 0,
  },
];

export function QueueClassDiagram({ caption }: { caption?: string }) {
  const { ref, drawn } = useDrawOnce<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const on = (e: Edge) => hover !== null && (e.from === hover || e.to === hover);
  const linked = new Set(EDGES.filter(on).flatMap((e) => [e.from, e.to]));
  const methods = new Set(EDGES.filter(on).map((e) => e.method));

  return (
    <figure className="figure card">
      <div ref={ref} className={`diagram__scroll${drawn ? ' is-drawn' : ''}${hover ? ' is-hovering' : ''}`}>
        <svg className="diagram diagram--class" viewBox="0 0 980 525" role="img" aria-label="작업 큐 클래스 다이어그램">
          <defs>
            <marker
              id="cls-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0 0 L10 5 L0 10 z" className="diagram__head" />
            </marker>
            <marker
              id="cls-arrow-on"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0 0 L10 5 L0 10 z" className="diagram__head diagram__head--on" />
            </marker>
          </defs>

          {EDGES.map((e) => (
            <g key={e.from + e.to + e.label} className={`diagram__edge${on(e) ? ' is-on' : ''}`}>
              <path d={e.d} pathLength={1} markerEnd={`url(#${on(e) ? 'cls-arrow-on' : 'cls-arrow'})`} />
              {e.label && (
                <text x={e.lx} y={e.ly} textAnchor="middle">
                  {e.label}
                </text>
              )}
            </g>
          ))}

          {BOXES.map((b) => {
            const h = height(b);
            const attrsH = Math.max(1, b.attrs?.length ?? 0) * ROW + 8;
            return (
              <g
                key={b.id}
                className={`diagram__box${hover === b.id ? ' is-picked' : linked.has(b.id) ? ' is-on' : ''}`}
                tabIndex={0}
                onMouseEnter={() => setHover(b.id)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(b.id)}
                onBlur={() => setHover(null)}
              >
                <rect x={b.x} y={b.y} width={b.w} height={h} rx={2} />
                <text x={b.x + b.w / 2} y={b.y + 20} textAnchor="middle" className="diagram__name">
                  {b.id}
                </text>
                <line x1={b.x} x2={b.x + b.w} y1={b.y + HEAD} y2={b.y + HEAD} />
                {b.attrs?.map((a, i) => (
                  <text key={a} x={b.x + 12} y={b.y + HEAD + 18 + i * ROW} className="diagram__member">
                    {a}
                  </text>
                ))}
                <line x1={b.x} x2={b.x + b.w} y1={b.y + HEAD + attrsH} y2={b.y + HEAD + attrsH} />
                {b.methods?.map((m, i) => (
                  <text
                    key={m}
                    x={b.x + 12}
                    y={b.y + HEAD + attrsH + 18 + i * ROW}
                    className={`diagram__member${methods.has(m) ? ' is-hit' : ''}`}
                  >
                    {m}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="seq__hint mono">그림을 옆으로 밀어 나머지를 본다</p>
      {caption && <figcaption className="mono">{caption}</figcaption>}
    </figure>
  );
}
