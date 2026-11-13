'use client';

// @MX:NOTE: 원자적 선점과 분산 락 장면을 스스로 재생해 폴링마다 누가 어떤 작업을 가져가는지 보여 주는 그림 (async-job-queue-without-broker)
// @MX:SPEC: .claude/docs/domains/playgrounds.md

import { useState } from 'react';
import { usePlay } from './usePlay';

// 본문: findAndModify 는 문서 단위로 원자적이라 두 폴러가 같은 문서를 노리면 한쪽만 가져가고 다른 쪽은 다음 문서를 받는다.
// 분산 락을 걸면 여러 파드 중 하나만 폴러를 실행한다. 파드 3개·작업 6건은 그림을 위한 예시이고,
// 파드는 폴링 한 번에 작업 하나를 가져간다고 단순하게 둔다.
const PODS = ['A', 'B', 'C'];
const JOBS = 6;

type Round = { pollers: string[]; got: [string, number][] };

// 회차마다 먼저 닿는 파드를 돌려 경쟁을 보인다
function rounds(lock: boolean): Round[] {
  const out: Round[] = [];
  let next = 1;
  while (next <= JOBS) {
    const pollers = lock ? ['A'] : PODS;
    const shift = out.length % pollers.length;
    const order = [...pollers.slice(shift), ...pollers.slice(0, shift)];
    const got: [string, number][] = [];
    for (const p of order) if (next <= JOBS) got.push([p, next++]);
    out.push({ pollers, got });
  }
  return out;
}

const SCENES = [
  {
    lock: false,
    label: '락 없이 원자적 선점',
    point: '세 파드가 같은 문서를 노려도 한 파드만 가져가고, 나머지는 다음 문서를 받는다',
  },
  {
    lock: true,
    label: '폴러에 분산 락(ShedLock)',
    point: '겹침은 막지만 한 파드만 폴링해 파드를 늘려도 처리량이 그대로다',
  },
];

export function ClaimPlayground({ caption }: { caption?: string }) {
  const [lock, setLock] = useState(false);
  const scene = SCENES.find((s) => s.lock === lock)!;
  const all = rounds(lock);
  const { ref, step, play, done } = usePlay<HTMLElement>(all.length, 900);
  const shown = all.slice(0, step);
  const last = shown[shown.length - 1];
  const owner = new Map<number, string>();
  shown.forEach((r) => r.got.forEach(([p, j]) => owner.set(j, p)));
  const fresh = new Set(last?.got.map(([, j]) => j));

  return (
    <figure ref={ref} className="figure card playground">
      <div className="scene__buttons">
        {SCENES.map((s) => (
          <button
            key={s.label}
            type="button"
            className={`mono${s.lock === lock ? ' is-on' : ''}`}
            aria-pressed={s.lock === lock}
            onClick={() => {
              setLock(s.lock);
              play();
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="claim__pods mono">
        {PODS.map((p) => {
          const polling = last?.pollers.includes(p);
          return (
            <span key={p} className={`claim__pod${polling ? ' is-on' : ''}`}>
              파드 {p}
              <small>{!last ? '' : polling ? '폴링' : '락 대기'}</small>
            </span>
          );
        })}
      </div>

      <ol className="claim__jobs mono" aria-label="RECEIVED 작업, 접수 순">
        {Array.from({ length: JOBS }, (_, i) => i + 1).map((j) => {
          const p = owner.get(j);
          return (
            <li key={j} className={`${p ? 'is-taken' : ''}${fresh.has(j) ? ' is-fresh' : ''}`}>
              <span>#{j}</span>
              <span>{p ? `파드 ${p}` : 'RECEIVED'}</span>
            </li>
          );
        })}
      </ol>

      <p className="playground__result mono" aria-live="polite">
        폴링 <strong>{step}번</strong>
        <span className="stepper__token">
          {last ? `이번 폴링: ${last.got.map(([p, j]) => `${p}→#${j}`).join(' ')}` : '폴링 전'}
        </span>
      </p>
      <p className={`scene__point mono${done ? ' is-done' : ''}`}>
        {scene.point} · 6건을 폴링 {all.length}번에 가져간다
      </p>
      {caption && <figcaption className="mono">{caption}</figcaption>}
    </figure>
  );
}
