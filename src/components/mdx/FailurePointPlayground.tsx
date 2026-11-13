'use client';

// @MX:NOTE: 판독 실패·콜백 실패 지점과 재시도 방식을 골라 다시 실행되는 줄과 AI 호출 횟수를 보는 그림 (async-job-queue-without-broker)
// @MX:SPEC: .claude/docs/domains/playgrounds.md

import { useState } from 'react';
import { SequenceDiagram, type SeqRow } from './SequenceDiagram';

// 줄과 문구는 본문의 실패 지점 시퀀스 다이어그램과 같다. ③ 은 본문의 최소 한 번 전달 문단을 옮겼다.
const PARTICIPANTS = ['요청 시스템', '접수 API', 'MongoDB', '판독 워커', 'AI 에이전트', '콜백 워커'];

type Fail = 'none' | 'read' | 'callback' | 'crash';
type Mode = 'split' | 'merged';

const FAILS: { key: Fail; label: string }[] = [
  { key: 'none', label: '실패 없음' },
  { key: 'read', label: '① 판독 실패' },
  { key: 'callback', label: '② 콜백 실패' },
  { key: 'crash', label: '③ 전송 직후 기록 전 파드 종료' },
];
const MODES: { key: Mode; label: string }[] = [
  { key: 'split', label: '판독·콜백 재시도 나누기' },
  { key: 'merged', label: '하나의 재시도로 묶기' },
];

// 줄 번호를 이름으로 부르려고 키를 붙인다
const ROWS: (SeqRow & { id: string })[] = [
  { id: 'req', kind: 'msg', from: 0, to: 1, label: '판독 요청' },
  { id: 'save', kind: 'msg', from: 1, to: 2, label: 'RECEIVED 문서 저장' },
  { id: 'ack', kind: 'msg', from: 1, to: 0, label: '접수 응답', reply: true },
  { id: 'claim', kind: 'msg', from: 3, to: 2, label: '선점 (RECEIVED → PROCESSING)' },
  { id: 'ask', kind: 'msg', from: 3, to: 4, label: '판독 요청' },
  { id: 'f1', kind: 'note', from: 3, to: 4, label: '실패 ① 판독 실패', sub: '토큰 차감 전' },
  { id: 'answer', kind: 'msg', from: 4, to: 3, label: '판독 결과', reply: true },
  { id: 'done', kind: 'msg', from: 3, to: 2, label: '결과 저장 (DONE)' },
  { id: 'cclaim', kind: 'msg', from: 5, to: 2, label: '콜백 선점' },
  { id: 'send', kind: 'msg', from: 5, to: 0, label: '판독 결과 전송' },
  { id: 'f2', kind: 'note', from: 0, to: 5, label: '실패 ② 콜백 실패', sub: '토큰 차감 후' },
  { id: 'f3', kind: 'note', from: 0, to: 5, label: '③ 전송 직후 기록 전 파드 종료', sub: '보냈다는 기록이 없다' },
  { id: 'mark', kind: 'msg', from: 5, to: 2, label: '콜백 완료 기록' },
];

// 고른 실패와 재시도 방식에서 줄마다 몇 번 실행되는지, 토큰이 몇 번 차감되는지 센다.
// 판독 실패는 결과를 받기 전이라 토큰이 차감되지 않는다. 콜백 실패를 판독과 같은 재시도로 묶으면 판독부터 다시 한다.
function simulate(fail: Fail, mode: Mode) {
  const again: string[] =
    fail === 'read'
      ? ['claim', 'ask']
      : fail === 'callback'
        ? mode === 'merged'
          ? ['claim', 'ask', 'answer', 'done', 'cclaim', 'send']
          : ['cclaim', 'send']
        : fail === 'crash'
          ? ['cclaim', 'send']
          : [];
  const counts = ROWS.map((r) => (again.includes(r.id) ? 2 : 1));
  const tokens = counts[ROWS.findIndex((r) => r.id === 'answer')];
  // 요청 시스템이 받은 결과: 콜백 실패는 받지 못한 전송이므로 한 번, ③ 은 두 번 다 받는다
  const delivered = fail === 'crash' ? 2 : 1;
  const hit = { read: 'f1', callback: 'f2', crash: 'f3', none: '' }[fail];
  const rows = ROWS.filter((r) => r.kind === 'msg' || r.id === hit || (r.id !== 'f3' && fail === 'none'));
  return { rows, counts: rows.map((r) => counts[ROWS.indexOf(r)]), hit, tokens, delivered, again: again.length > 0 };
}

export function FailurePointPlayground({ caption }: { caption?: string }) {
  const [fail, setFail] = useState<Fail>('callback');
  const [mode, setMode] = useState<Mode>('split');
  const s = simulate(fail, mode);
  const marks = s.rows.map((r, i) => (r.id === s.hit ? 'hit' : s.counts[i] > 1 ? 'current' : r.kind === 'note' ? 'off' : 'past'));

  return (
    <figure className="figure card playground stepper">
      <div className="stepper__fields">
        <fieldset className="stepper__field">
          <legend className="mono">실패 지점</legend>
          <div className="stepper__options">
            {FAILS.map((f) => (
              <label key={f.key} className="mono">
                <input type="radio" name="failure-point" checked={fail === f.key} onChange={() => setFail(f.key)} />
                <span>{f.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className={`stepper__field${fail === 'callback' ? '' : ' is-unused'}`}>
          <legend className="mono">재시도 방식</legend>
          <div className="stepper__options">
            {MODES.map((m) => (
              <label key={m.key} className="mono">
                <input type="radio" name="failure-mode" checked={mode === m.key} onChange={() => setMode(m.key)} />
                <span>{m.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <SequenceDiagram
        participants={PARTICIPANTS}
        rows={s.rows}
        marks={marks}
        counts={s.counts}
        label="판독 실패와 콜백 실패 지점, 다시 실행되는 줄"
      />

      <p className="playground__result mono" aria-live="polite">
        토큰 차감 <strong>{s.tokens}번</strong>
        <span className="stepper__token">요청 시스템이 받은 결과 {s.delivered}번</span>
      </p>
      <p className="playground__legend mono">
        <span>{s.again ? '강조한 줄이 다시 실행된다 (×2)' : '모든 줄이 한 번씩 실행된다'}</span>
        {fail !== 'callback' && fail !== 'none' && <span>재시도 방식은 ② 에서만 결과가 갈린다</span>}
      </p>
      {caption && <figcaption className="mono">{caption}</figcaption>}
    </figure>
  );
}
