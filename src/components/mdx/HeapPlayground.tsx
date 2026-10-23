'use client';

import { useState } from 'react';
import { PlaygroundBar } from './PlaygroundBar';

type Props = {
  /** 측정한 피크 힙 (MB) — 본문 값 */
  peak: number;
  /** 피크를 잰 데이터 건수 — 본문 값 */
  rows: number;
  /** 컨테이너 메모리 중 JVM 힙 비율 (%) — 본문 값 */
  ratio: number;
  /** 컨테이너 메모리 (GB) — 본문 값 */
  memory: number;
  caption?: string;
};

const fmt = (n: number) => n.toLocaleString('ko-KR');
const mb = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}GB` : `${Math.round(n)}MB`);

// 측정 피크를 건수에 비례해 늘려 컨테이너 힙 한도와 비교하는 그림. 비례는 본문의 추정 방식 그대로다.
export function HeapPlayground({ peak, rows, ratio, memory: m0, caption }: Props) {
  const [n, setN] = useState(rows);
  const [memory, setMemory] = useState(m0);

  const estimated = (peak * n) / rows;
  const limit = memory * 1000 * (ratio / 100);
  const usage = Math.round((estimated / limit) * 100);
  const changed = n !== rows || memory !== m0;

  return (
    <figure className="figure frame playground">
      <div className="playground__controls">
        <label className="playground__field">
          <span className="mono">데이터 건수</span>
          <input type="range" min={1000} max={200000} step={100} value={n} onChange={(e) => setN(Number(e.target.value))} />
          <output className="mono">{fmt(n)}건</output>
        </label>
        <label className="playground__field">
          <span className="mono">컨테이너 메모리</span>
          <input type="range" min={1} max={8} step={1} value={memory} onChange={(e) => setMemory(Number(e.target.value))} />
          <output className="mono">{memory}GB</output>
        </label>
      </div>

      <p className="playground__result mono" aria-live="polite">
        추정 피크 ≒ {fmt(peak)}MB × {fmt(n)} / {fmt(rows)}건 ≈ {mb(estimated)} · 힙 한도 {mb(limit)}의{' '}
        <strong>{fmt(usage)}%</strong>
      </p>

      <PlaygroundBar
        value={estimated}
        limit={limit}
        limitLabel={`힙 한도 ${mb(limit)}`}
        label={`추정 피크 ${mb(estimated)}, 힙 한도 ${mb(limit)}`}
      />
      <p className="playground__legend mono">
        <span>{usage > 100 ? 'OOM' : '한도 안'}</span>
        <span>초과 {mb(Math.max(0, estimated - limit))}</span>
        <button
          type="button"
          onClick={() => {
            setN(rows);
            setMemory(m0);
          }}
          disabled={!changed}
        >
          본문 가정으로
        </button>
      </p>

      {caption && <figcaption className="mono">{caption}</figcaption>}
    </figure>
  );
}
