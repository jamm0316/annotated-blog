"use client";

// @MX:NOTE: 파드 수와 분산 락을 바꿔 폴링 한 번에 누가 어떤 작업을 선점하는지 보는 그림 (async-job-queue-without-broker)
// @MX:SPEC: .claude/docs/domains/playgrounds.md

import { useState } from "react";

// 본문: findAndModify 는 문서 단위로 원자적이라 두 폴러가 같은 문서를 노리면 한쪽만 가져가고 다른 쪽은 다음 문서를 받는다.
// 분산 락을 걸면 여러 파드 중 하나만 폴러를 실행한다. 그림을 단순하게 하려고 파드는 폴링 한 번에 작업 하나를 가져간다고 둔다.
const JOBS = 8;
const PODS = ["A", "B", "C", "D"];

type Round = { racers: string[]; got: [string, number][] };

export function ClaimPlayground({ caption }: { caption?: string }) {
  const [pods, setPods] = useState(3);
  const [lock, setLock] = useState(false);
  const [rounds, setRounds] = useState<Round[]>([]);

  const owner = new Map<number, string>();
  rounds.forEach((r) => r.got.forEach(([p, j]) => owner.set(j, p)));
  const left = JOBS - owner.size;

  const poll = () => {
    if (left === 0) return;
    // 매번 다른 파드가 먼저 닿게 돌려 경쟁을 보인다. 락이 있으면 락을 잡은 A 만 폴러를 돌린다
    const active = lock ? ["A"] : PODS.slice(0, pods);
    const shift = rounds.length % active.length;
    const order = [...active.slice(shift), ...active.slice(0, shift)];
    let next = owner.size + 1;
    const got: [string, number][] = [];
    for (const p of order) if (next <= JOBS) got.push([p, next++]);
    setRounds([...rounds, { racers: active, got }]);
  };
  const reset = (fn: () => void) => {
    fn();
    setRounds([]);
  };

  return (
    <figure className="figure card playground">
      <div className="playground__controls">
        <label className="playground__field">
          <span className="mono">파드 수</span>
          <input
            type="range"
            min={1}
            max={PODS.length}
            step={1}
            value={pods}
            onChange={(e) => reset(() => setPods(Number(e.target.value)))}
          />
          <output className="mono">{pods}개</output>
        </label>
      </div>
      <div className="stepper__options claim__lock">
        {[false, true].map((v) => (
          <label key={String(v)} className="mono">
            <input
              type="radio"
              name="claim-lock"
              checked={lock === v}
              onChange={() => reset(() => setLock(v))}
            />
            <span>
              {v ? "폴러에 분산 락(ShedLock)" : "락 없이 원자적 선점"}
            </span>
          </label>
        ))}
      </div>

      <ol className="claim__jobs mono" aria-label="RECEIVED 작업, 접수 순">
        {Array.from({ length: JOBS }, (_, i) => i + 1).map((j) => {
          const p = owner.get(j);
          return (
            <li key={j} className={p ? "is-taken" : ""}>
              <span>#{j}</span>
              <span>{p ? `파드 ${p}` : "RECEIVED"}</span>
            </li>
          );
        })}
      </ol>

      <ol className="stepper__log mono" aria-label="폴링 기록">
        {rounds.map((r, i) => (
          <li key={i}>
            {i + 1}회차 ·{" "}
            {r.racers.length > 1
              ? `파드 ${r.racers.join("·")} 가 #${r.got[0][1]} 을 함께 노림 → `
              : `파드 ${r.racers[0]} 만 폴링 → `}
            <strong>{r.got.map(([p, j]) => `${p}:#${j}`).join("  ")}</strong>
          </li>
        ))}
      </ol>

      <p className="playground__result mono" aria-live="polite">
        폴링 {rounds.length}번 · 남은 작업 <strong>{left}건</strong>
        <span className="stepper__token">
          폴링 한 번에 {lock ? 1 : pods}건씩 가져간다
        </span>
      </p>
      <p className="playground__legend mono">
        <span>파드는 폴링 한 번에 작업 하나를 가져간다고 둔다</span>
        <span className="playground__buttons">
          <button
            type="button"
            onClick={() => setRounds([])}
            disabled={rounds.length === 0}
          >
            처음부터
          </button>
          <button
            type="button"
            className="is-primary"
            onClick={poll}
            disabled={left === 0}
          >
            폴링 한 번
          </button>
        </span>
      </p>
      {caption && <figcaption className="mono">{caption}</figcaption>}
    </figure>
  );
}
