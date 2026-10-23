'use client';

import { useState } from 'react';

type Props = {
  /** 처리 건수 N — 본문 값 */
  n: number;
  /** batch 크기 — 본문 값 */
  batch: number;
  /** batch 크기일 때 1묶음이 점유하는 메모리 (MB) — 본문 실측값 */
  batchMb: number;
  caption?: string;
};

const fmt = (n: number) => n.toLocaleString('ko-KR');

// 쿼리 수 N → ⌈N/batch⌉ 와 batch 1묶음의 메모리를 독자가 바꿔 보는 그림. 메모리는 실측값을 batch 크기에 비례해 늘린 추정이다.
export function BatchPlayground({ n: n0, batch: b0, batchMb, caption }: Props) {
  const [n, setN] = useState(n0);
  const [batch, setBatch] = useState(b0);

  const flushes = Math.ceil(n / batch);
  const memory = Math.round((batchMb * batch) / b0);
  const changed = n !== n0 || batch !== b0;

  return (
    <figure className="figure frame playground">
      <div className="playground__controls">
        <label className="playground__field">
          <span className="mono">처리 건수 N</span>
          <input type="range" min={1000} max={200000} step={100} value={n} onChange={(e) => setN(Number(e.target.value))} />
          <output className="mono">{fmt(n)}건</output>
        </label>
        <label className="playground__field">
          <span className="mono">batch 크기</span>
          <input type="range" min={100} max={10000} step={100} value={batch} onChange={(e) => setBatch(Number(e.target.value))} />
          <output className="mono">{fmt(batch)}건</output>
        </label>
      </div>

      <p className="playground__result mono" aria-live="polite">
        쿼리 수 {fmt(n)}회 → ⌈{fmt(n)} / {fmt(batch)}⌉ = <strong>{fmt(flushes)}회</strong>
      </p>
      <p className="playground__legend mono">
        <span>약 {fmt(Math.round(n / flushes))}배 감소</span>
        <span>
          batch 1묶음 ≈ {fmt(memory)}MB{batch !== b0 && ' (추정)'}
        </span>
        <button
          type="button"
          onClick={() => {
            setN(n0);
            setBatch(b0);
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
