'use client';

// @MX:NOTE: 작업 문서 상태 전이도(상태 다이어그램 모양 그대로). 화면에 들어오면 화살표가 한 번 그려지고, 상태에 올리면 들고 나는 전이가 강조된다 (async-job-queue-without-broker)
// @MX:SPEC: .claude/docs/domains/playgrounds.md

import { useState } from 'react';
import { useDrawOnce } from './useDrawOnce';

// 상태·전이·라벨과 배치는 원문 Medium 의 상태 다이어그램과 같다. 본문 그림을 바꾸면 여기도 같이 바꾼다.
const STATES: { id: string; x: number; y: number; w: number }[] = [
  { id: 'RECEIVED', x: 205, y: 120, w: 190 },
  { id: 'PROCESSING', x: 180, y: 290, w: 240 },
  { id: 'DONE', x: 105, y: 460, w: 140 },
  { id: 'FAILED', x: 355, y: 460, w: 140 },
  { id: 'NOTIFIED', x: 40, y: 640, w: 180 },
  { id: 'NOTIFY_FAILED', x: 330, y: 640, w: 240 },
];
const H = 56;

// from·to 가 'start'·'end' 면 시작·끝 점
const EDGES: {
  from: string;
  to: string;
  label?: string;
  d: string;
  lx?: number;
  ly?: number;
}[] = [
  {
    from: 'start',
    to: 'RECEIVED',
    label: '접수',
    d: 'M300 32 L300 120',
    lx: 300,
    ly: 80,
  },
  {
    from: 'RECEIVED',
    to: 'PROCESSING',
    label: '폴러 선점',
    d: 'M270 176 C240 215 240 255 270 290',
    lx: 228,
    ly: 238,
  },
  {
    from: 'PROCESSING',
    to: 'RECEIVED',
    label: '재시도 예약·회수',
    d: 'M335 290 C375 255 375 215 335 176',
    lx: 400,
    ly: 238,
  },
  {
    from: 'PROCESSING',
    to: 'DONE',
    label: '판독 성공',
    d: 'M255 346 C205 385 180 420 175 460',
    lx: 195,
    ly: 408,
  },
  {
    from: 'PROCESSING',
    to: 'FAILED',
    label: '판독 실패',
    d: 'M345 346 C395 385 420 420 425 460',
    lx: 405,
    ly: 408,
  },
  {
    from: 'DONE',
    to: 'NOTIFIED',
    label: '통지',
    d: 'M155 516 C135 560 130 600 130 640',
    lx: 128,
    ly: 580,
  },
  {
    from: 'FAILED',
    to: 'NOTIFIED',
    label: '통지',
    d: 'M390 516 C310 560 220 600 170 640',
    lx: 262,
    ly: 574,
  },
  {
    from: 'DONE',
    to: 'NOTIFY_FAILED',
    label: '소진',
    d: 'M210 516 C290 560 380 600 430 640',
    lx: 338,
    ly: 574,
  },
  {
    from: 'FAILED',
    to: 'NOTIFY_FAILED',
    label: '소진',
    d: 'M450 516 C470 560 475 600 475 640',
    lx: 482,
    ly: 580,
  },
  { from: 'NOTIFIED', to: 'end', d: 'M130 696 C135 760 230 790 288 800' },
  { from: 'NOTIFY_FAILED', to: 'end', d: 'M450 696 C445 760 370 790 312 800' },
];

export function JobStateDiagram({ caption }: { caption?: string }) {
  const { ref, drawn } = useDrawOnce<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const on = (e: (typeof EDGES)[number]) => hover !== null && (e.from === hover || e.to === hover);
  const linked = new Set(EDGES.filter(on).flatMap((e) => [e.from, e.to]));

  return (
    <figure className="figure card">
      <div
        ref={ref}
        className={`diagram__scroll diagram__scroll--state${drawn ? ' is-drawn' : ''}${hover ? ' is-hovering' : ''}`}
      >
        <svg className="diagram diagram--state" viewBox="0 0 600 820" role="img" aria-label="작업 문서 상태 전이도">
          <defs>
            <marker
              id="st-arrow"
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
              id="st-arrow-on"
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

          <circle cx={300} cy={20} r={11} className="diagram__dot" />

          {EDGES.map((e) => (
            <g key={e.from + e.to} className={`diagram__edge${on(e) ? ' is-on' : ''}`}>
              <path d={e.d} pathLength={1} markerEnd={`url(#${on(e) ? 'st-arrow-on' : 'st-arrow'})`} />
              {e.label && (
                <text x={e.lx} y={e.ly} textAnchor="middle">
                  {e.label}
                </text>
              )}
            </g>
          ))}

          {STATES.map((s) => (
            <g
              key={s.id}
              className={`diagram__box diagram__box--state${hover === s.id ? ' is-picked' : linked.has(s.id) ? ' is-on' : ''}`}
              tabIndex={0}
              onMouseEnter={() => setHover(s.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(s.id)}
              onBlur={() => setHover(null)}
            >
              <rect x={s.x} y={s.y} width={s.w} height={H} rx={8} />
              <text x={s.x + s.w / 2} y={s.y + H / 2 + 6} textAnchor="middle" className="diagram__name">
                {s.id}
              </text>
            </g>
          ))}

          <circle cx={300} cy={802} r={12} className="diagram__end" />
          <circle cx={300} cy={802} r={7} className="diagram__dot" />
        </svg>
      </div>
      {caption && <figcaption className="mono">{caption}</figcaption>}
    </figure>
  );
}
