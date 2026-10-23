'use client';

import { useState } from 'react';
import { PlaygroundBar } from './PlaygroundBar';

type Props = {
  /** 재생성 시간 T (ms) — 본문 값 */
  t: number;
  /** 초당 요청 수 R — 본문 값 */
  r: number;
  /** 커넥션 풀 크기 — 본문 값 */
  pool: number;
  caption?: string;
};

// 동시 로더 수 ≒ T × R 을 독자가 직접 바꿔 보는 그림. 초기값과 풀 크기는 본문 숫자만 쓴다.
export function LoaderPlayground({ t: t0, r: r0, pool, caption }: Props) {
  const [t, setT] = useState(t0);
  const [r, setR] = useState(r0);

  const loaders = Math.round((t / 1000) * r);
  const acquired = Math.min(loaders, pool);
  const waiting = Math.max(0, loaders - pool);
  const changed = t !== t0 || r !== r0;

  return (
    <figure className="figure frame playground">
      <div className="playground__controls">
        <label className="playground__field">
          <span className="mono">재생성 시간 T</span>
          <input type="range" min={50} max={1000} step={1} value={t} onChange={(e) => setT(Number(e.target.value))} />
          <output className="mono">{t}ms</output>
        </label>
        <label className="playground__field">
          <span className="mono">초당 요청 수 R</span>
          <input type="range" min={0} max={1000} step={10} value={r} onChange={(e) => setR(Number(e.target.value))} />
          <output className="mono">{r}건</output>
        </label>
      </div>

      <p className="playground__result mono" aria-live="polite">
        동시 로더 ≒ {(t / 1000).toFixed(3)}초 × {r}건 ≈ <strong>{loaders}개</strong>
      </p>

      <PlaygroundBar
        value={loaders}
        limit={pool}
        limitLabel={`풀 ${pool}`}
        label={`커넥션 획득 ${acquired}개, 대기 ${waiting}개`}
      />
      <p className="playground__legend mono">
        <span>커넥션 획득 {acquired}</span>
        <span>대기 {waiting}</span>
        <button
          type="button"
          onClick={() => {
            setT(t0);
            setR(r0);
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
