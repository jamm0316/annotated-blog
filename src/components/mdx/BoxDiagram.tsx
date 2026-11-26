'use client';

// @MX:NOTE: 상자·화살표 다이어그램(구조도·흐름도)을 원문 모양 그대로 그리는 공용 렌더러. 화면에 들어오면 화살표가 한 번 그려지고, 상자에 올리면 이어진 화살표만 강조된다
// @MX:SPEC: .claude/docs/domains/playgrounds.md

import { useState } from 'react';
import { useDrawOnce } from './useDrawOnce';

export type BoxNode = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  lines: string[];
  // box = 사각형, pill = 시작·끝(둥근 끝), db = 저장소(원통)
  shape?: 'box' | 'pill' | 'db';
  // 기울여 쓰는 줄 번호(예: 'Service 자리')
  em?: number[];
  // true 면 여러 줄이 한 문장을 이어 쓴 것이라 모든 줄을 첫 줄과 같은 모양으로 쓴다
  wrap?: boolean;
};
export type BoxGroup = { label: string; x: number; y: number; w: number; h: number };
export type BoxEdge = {
  from: string;
  to: string;
  d: string;
  label?: string;
  lx?: number;
  ly?: number;
  // 점선(예: 흐름도의 '아니오' 분기)
  dashed?: boolean;
};

type Props = {
  label: string;
  width: number;
  height: number;
  // 화면에서 그림의 최대 폭(px). 좁은 화면에서는 minWidth 아래로 줄지 않고 가로로 민다
  maxWidth?: number;
  minWidth?: number;
  nodes: BoxNode[];
  edges: BoxEdge[];
  groups?: BoxGroup[];
  caption?: string;
};

const LINE = 20;

// 함수 props 없이 숫자·문자열 데이터만 받는다(MDX 는 서버에서 그린다).
export function BoxDiagram({ label, width, height, maxWidth, minWidth, nodes, edges, groups = [], caption }: Props) {
  const { ref, drawn } = useDrawOnce<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const on = (e: BoxEdge) => hover !== null && (e.from === hover || e.to === hover);
  const linked = new Set(edges.filter(on).flatMap((e) => [e.from, e.to]));
  const mid = `bd-${label.length}-${width}-${height}`;

  return (
    <figure className="figure card">
      <div
        ref={ref}
        className={`diagram__scroll${drawn ? ' is-drawn' : ''}${hover ? ' is-hovering' : ''}`}
        style={maxWidth ? { maxWidth, margin: '0 auto' } : undefined}
      >
        <svg
          className="diagram diagram--box"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={label}
          style={minWidth ? { minWidth } : undefined}
        >
          <defs>
            {['', '-on'].map((k) => (
              <marker
                key={k}
                id={`${mid}${k}`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M0 0 L10 5 L0 10 z" className={`diagram__head${k ? ' diagram__head--on' : ''}`} />
              </marker>
            ))}
          </defs>

          {groups.map((g) => (
            <g key={g.label} className="diagram__group">
              <rect x={g.x} y={g.y} width={g.w} height={g.h} rx={6} />
              <text x={g.x + 14} y={g.y + 24}>
                {g.label}
              </text>
            </g>
          ))}

          {edges.map((e) => (
            <g
              key={e.from + e.to}
              className={`diagram__edge${e.dashed ? ' diagram__edge--dash' : ''}${on(e) ? ' is-on' : ''}`}
            >
              <path d={e.d} pathLength={e.dashed ? undefined : 1} markerEnd={`url(#${mid}${on(e) ? '-on' : ''})`} />
              {e.label && (
                <text x={e.lx} y={e.ly} textAnchor="middle">
                  {e.label}
                </text>
              )}
            </g>
          ))}

          {nodes.map((n) => {
            const top = n.y + n.h / 2 - ((n.lines.length - 1) * LINE) / 2 + 5;
            const cls = hover === n.id ? ' is-picked' : linked.has(n.id) ? ' is-on' : '';
            return (
              <g
                key={n.id}
                className={`diagram__box${cls}`}
                tabIndex={0}
                onMouseEnter={() => setHover(n.id)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(n.id)}
                onBlur={() => setHover(null)}
              >
                {n.shape === 'db' ? (
                  <>
                    <path
                      className="diagram__db"
                      d={`M${n.x} ${n.y + 8} A${n.w / 2} 8 0 0 1 ${n.x + n.w} ${n.y + 8} L${n.x + n.w} ${n.y + n.h - 8} A${n.w / 2} 8 0 0 1 ${n.x} ${n.y + n.h - 8} Z`}
                    />
                    <path className="diagram__db" d={`M${n.x} ${n.y + 8} A${n.w / 2} 8 0 0 0 ${n.x + n.w} ${n.y + 8}`} />
                  </>
                ) : (
                  <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={n.shape === 'pill' ? n.h / 2 : 6} />
                )}
                {n.lines.map((line, i) => (
                  <text
                    key={i}
                    x={n.x + n.w / 2}
                    y={top + i * LINE + (n.shape === 'db' ? 4 : 0)}
                    textAnchor="middle"
                    className={i === 0 || n.wrap ? 'diagram__name' : n.em?.includes(i) ? 'diagram__em' : 'diagram__member'}
                  >
                    {line}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
      {caption && <figcaption className="mono">{caption}</figcaption>}
    </figure>
  );
}
