'use client';

// @MX:NOTE: 회수 장면 버튼을 누르면 시간 축이 스스로 흘러 워커와 회수가 어떻게 겹치는지 보여 주는 타임라인 (async-job-queue-without-broker)
// @MX:SPEC: .claude/docs/domains/playgrounds.md

import { useState } from 'react';
import { usePlay } from './usePlay';

type Props = {
  /** 판독 타임아웃(분). 본문 15분 */
  timeout: number;
  /** 회수 기준(분). 본문 20분 */
  stale: number;
  /** 가장 오래 걸린 판독(분). 본문 10분 */
  longest: number;
  caption?: string;
};

// 눈금 끝(분). 시간 축은 1분에 한 칸씩 스스로 흐른다
const SCALE = 35;
const pct = (m: number) => `${(Math.max(0, Math.min(m, SCALE)) / SCALE) * 100}%`;

type Scene = {
  key: string;
  label: string;
  /** 회수 기준 위치(분) */
  at: number;
  /** 기준선 라벨. 본문에 없는 값은 숫자를 붙이지 않는다 */
  atLabel: string;
  /** 워커 A 가 끝나는 시각, dead 면 죽은 시각(그림용 위치) */
  aEnd: number;
  dead: boolean;
  /** 회수돼 워커 B 가 다시 처리하는가 */
  again: boolean;
  /** 끝났을 때 보일 결과 [이름, 값] */
  result: [string, string];
  point: string;
};

export function RecoveryPlayground({ timeout, stale, longest, caption }: Props) {
  // 본문 숫자는 props 로만 받는다. '회수 기준이 짧으면' 장면의 기준선 위치는 그림을 위한 자리라 숫자를 적지 않는다
  const SCENES: Scene[] = [
    {
      key: 'ok',
      label: `본문 설정 · 회수 ${stale}분`,
      at: stale,
      atLabel: `회수 ${stale}분`,
      aEnd: longest,
      dead: false,
      again: false,
      result: ['AI 판독 요청', '1번'],
      point: `가장 오래 걸린 판독 ${longest}분도 타임아웃 ${timeout}분 안에 끝나, 회수 ${stale}분이 오기 전에 작업이 닫힌다`,
    },
    {
      key: 'short',
      label: '회수 기준이 판독보다 짧으면',
      at: longest * 0.6,
      atLabel: '회수 기준',
      aEnd: longest,
      dead: false,
      again: true,
      result: ['AI 판독 요청', '2번'],
      point: '아직 응답을 기다리는 멀쩡한 작업을 회수해, 다른 워커가 같은 작업으로 AI 를 한 번 더 부른다',
    },
    {
      key: 'dead',
      label: '워커가 판독 도중 죽으면',
      at: stale,
      atLabel: `회수 ${stale}분`,
      aEnd: 2,
      dead: true,
      again: true,
      result: ['PROCESSING 으로 멈춰 있던 시간', `${stale}분`],
      point: `작업이 PROCESSING 으로 ${stale}분 동안 멈춰 있다가, 회수된 뒤 다른 워커가 다시 처리한다`,
    },
  ];
  const [key, setKey] = useState('ok');
  const s = SCENES.find((x) => x.key === key)!;
  const { ref, step: now, play, done } = usePlay<HTMLElement>(SCALE, 70);
  const recovered = s.again && now >= s.at;
  const bLen = Math.min(longest, timeout);

  return (
    <figure ref={ref} className="figure card playground">
      <div className="scene__buttons">
        {SCENES.map((x) => (
          <button
            key={x.key}
            type="button"
            className={`mono${x.key === key ? ' is-on' : ''}`}
            aria-pressed={x.key === key}
            onClick={() => {
              setKey(x.key);
              play();
            }}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div className="recov mono" role="img" aria-label={`${s.label}: ${s.point}`}>
        <div className="recov__scale">
          <span className="recov__mark" style={{ left: pct(timeout) }}>
            <span>타임아웃 {timeout}분</span>
          </span>
          <span className={`recov__mark recov__mark--stale${recovered ? ' is-hit' : ''}`} style={{ left: pct(s.at) }}>
            <span>{s.atLabel}</span>
          </span>
          <span className="recov__now" style={{ left: pct(now) }} />
        </div>
        <div className="recov__lane">
          <span className="recov__name">워커 A</span>
          <span className="recov__track">
            <span
              className={`recov__bar${s.dead ? ' recov__bar--dead' : ''}`}
              style={{ width: pct(Math.min(now, s.aEnd)) }}
            />
            {s.dead && now >= s.aEnd && (
              <span className="recov__x" style={{ left: pct(s.aEnd) }}>
                ✕
              </span>
            )}
          </span>
        </div>
        <div className="recov__lane">
          <span className="recov__name">워커 B</span>
          <span className="recov__track">
            {recovered && (
              <span
                className="recov__bar recov__bar--again"
                style={{ left: pct(s.at), width: pct(Math.min(now - s.at, bLen)) }}
              />
            )}
          </span>
        </div>
        <div className="recov__axis">
          {[0, 10, 20, 30].map((m) => (
            <span key={m} style={{ left: pct(m) }}>
              {m}분
            </span>
          ))}
        </div>
      </div>

      <p className="playground__result mono" aria-live="polite">
        {s.result[0]} <strong>{done ? s.result[1] : '…'}</strong>
      </p>
      <p className={`scene__point mono${done ? ' is-done' : ''}`}>{s.point}</p>
      {caption && <figcaption className="mono">{caption}</figcaption>}
    </figure>
  );
}
