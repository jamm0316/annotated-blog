"use client";

// @MX:NOTE: 회수 기준과 판독 시간을 바꿔 멀쩡한 작업이 회수돼 AI 를 두 번 부르는지 보는 타임라인 (async-job-queue-without-broker)
// @MX:SPEC: .claude/docs/domains/playgrounds.md

import { useState } from "react";

type Props = {
  /** 판독 타임아웃(분). 본문 15분 */
  timeout: number;
  /** 회수 기준(분). 본문 20분 */
  stale: number;
  /** 가장 오래 걸린 판독(분). 본문 10분 */
  longest: number;
  caption?: string;
};

// 눈금 끝(분)
const SCALE = 40;
const pct = (m: number) => `${(Math.min(m, SCALE) / SCALE) * 100}%`;

// 워커 A 는 판독을 받거나 타임아웃까지 기다린다. 회수 기준이 그보다 짧으면 A 가 기다리는 동안 문서가 RECEIVED 로 돌아가고
// 다른 워커 B 가 같은 작업으로 AI 를 다시 부른다. 워커가 죽은 경우에는 회수 기준만큼 멈춰 있다가 B 가 다시 처리한다.
// 회수 스케줄러는 60초마다 돌므로 실제 회수는 기준보다 최대 1분 늦을 수 있다(그림은 기준 시각에 그린다).
export function RecoveryPlayground({
  timeout,
  stale: stale0,
  longest,
  caption,
}: Props) {
  const [stale, setStale] = useState(stale0);
  const [read, setRead] = useState(longest);
  const [dead, setDead] = useState(false);

  const end = Math.min(read, timeout);
  const timedOut = read > timeout;
  const recovered = dead || stale < end;
  const calls = recovered ? 2 : 1;
  const changed = stale !== stale0 || read !== longest || dead;

  let verdict: string;
  if (dead) verdict = `작업이 ${stale}분 동안 멈춰 있다가 다시 처리된다`;
  else if (recovered)
    verdict = "아직 응답을 기다리는 작업을 회수해 AI 를 한 번 더 부른다";
  else if (timedOut)
    verdict = `워커가 ${timeout}분에 타임아웃으로 끝낸 뒤라 회수할 일이 없다`;
  else verdict = `워커가 ${end}분에 끝내 회수할 일이 없다`;

  return (
    <figure className="figure card playground">
      <div className="playground__controls">
        <label className="playground__field">
          <span className="mono">회수 기준</span>
          <input
            type="range"
            min={1}
            max={30}
            step={1}
            value={stale}
            onChange={(e) => setStale(Number(e.target.value))}
          />
          <output className="mono">{stale}분</output>
        </label>
        <label className="playground__field">
          <span className="mono">이번 판독 시간</span>
          <input
            type="range"
            min={1}
            max={30}
            step={1}
            value={read}
            disabled={dead}
            onChange={(e) => setRead(Number(e.target.value))}
          />
          <output className="mono">{read}분</output>
        </label>
      </div>
      <div className="stepper__options claim__lock">
        {[false, true].map((v) => (
          <label key={String(v)} className="mono">
            <input
              type="radio"
              name="recovery-dead"
              checked={dead === v}
              onChange={() => setDead(v)}
            />
            <span>{v ? "워커가 판독 도중 죽음" : "워커가 정상"}</span>
          </label>
        ))}
      </div>

      <div
        className="recov mono"
        role="img"
        aria-label={`처리 시작부터 ${SCALE}분까지의 타임라인. ${verdict}`}
      >
        <div className="recov__scale">
          <span className="recov__mark" style={{ left: pct(timeout) }}>
            <span>타임아웃 {timeout}분</span>
          </span>
          <span
            className="recov__mark recov__mark--stale"
            style={{ left: pct(stale) }}
          >
            <span>회수 {stale}분</span>
          </span>
        </div>
        <div className="recov__lane">
          <span className="recov__name">워커 A</span>
          <span className="recov__track">
            {dead ? (
              <span
                className="recov__bar recov__bar--dead"
                style={{ width: pct(1) }}
              />
            ) : (
              <span
                className={`recov__bar${timedOut ? " recov__bar--timeout" : ""}`}
                style={{ width: pct(end) }}
              />
            )}
          </span>
        </div>
        <div className="recov__lane">
          <span className="recov__name">워커 B</span>
          <span className="recov__track">
            {recovered && (
              <span
                className="recov__bar recov__bar--again"
                style={{
                  left: pct(stale),
                  width: pct(Math.min(read, timeout)),
                }}
              />
            )}
          </span>
        </div>
        <div className="recov__axis">
          {[0, 10, 20, 30, 40].map((m) => (
            <span key={m} style={{ left: pct(m) }}>
              {m}분
            </span>
          ))}
        </div>
      </div>

      <p className="playground__result mono" aria-live="polite">
        AI 판독 요청 <strong>{calls}번</strong>
        <span className="stepper__token">{verdict}</span>
      </p>
      <p className="playground__legend mono">
        <span>가장 오래 걸린 판독 {longest}분 · 회수 스케줄러는 60초마다</span>
        <button
          type="button"
          onClick={() => {
            setStale(stale0);
            setRead(longest);
            setDead(false);
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
