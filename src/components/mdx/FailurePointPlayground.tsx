'use client';

// @MX:NOTE: 실패 장면 버튼을 누르면 시퀀스가 스스로 재생되며 실패 지점이 깜빡이고 다시 실행되는 줄이 보이는 그림 (async-job-queue-without-broker)
// @MX:SPEC: .claude/docs/domains/playgrounds.md

import { useState } from 'react';
import { SequenceDiagram, type SeqRow } from './SequenceDiagram';
import { usePlay } from './usePlay';

// 줄과 문구는 본문의 실패 지점 시퀀스 다이어그램과 같다. ③ 은 본문의 최소 한 번 전달 문단을 옮겼다.
const PARTICIPANTS = ['요청 시스템', '접수 API', 'MongoDB', '판독 워커', 'AI 에이전트', '콜백 워커'];

const ROWS: (SeqRow & { id: string })[] = [
  { id: 'req', kind: 'msg', from: 0, to: 1, label: '판독 요청' },
  { id: 'save', kind: 'msg', from: 1, to: 2, label: 'RECEIVED 문서 저장' },
  { id: 'ack', kind: 'msg', from: 1, to: 0, label: '접수 응답', reply: true },
  { id: 'claim', kind: 'msg', from: 3, to: 2, label: '선점 (RECEIVED → PROCESSING)' },
  { id: 'ask', kind: 'msg', from: 3, to: 4, label: '판독 요청' },
  { id: 'f1', kind: 'note', from: 3, to: 4, label: '실패 ① 판독 실패', sub: '토큰 차감 전' },
  { id: 'answer', kind: 'msg', from: 4, to: 3, label: '판독 결과 · 토큰 차감', reply: true },
  { id: 'done', kind: 'msg', from: 3, to: 2, label: '결과 저장 (DONE)' },
  { id: 'cclaim', kind: 'msg', from: 5, to: 2, label: '콜백 선점' },
  { id: 'send', kind: 'msg', from: 5, to: 0, label: '판독 결과 전송' },
  { id: 'f2', kind: 'note', from: 0, to: 5, label: '실패 ② 콜백 실패', sub: '토큰 차감 후' },
  { id: 'f3', kind: 'note', from: 0, to: 5, label: '전송 직후, 기록 전에 파드 종료', sub: '보냈다는 기록이 없다' },
  { id: 'mark', kind: 'msg', from: 5, to: 2, label: '콜백 완료 기록' },
];

const HEAD = ['req', 'save', 'ack', 'claim', 'ask'];
const MID = ['answer', 'done', 'cclaim', 'send'];

// 장면마다 재생할 줄 순서. 같은 줄이 두 번 나오면 다시 실행된 것이다
const SCENES = [
  {
    key: 'read',
    label: '① 판독 실패',
    note: 'f1',
    frames: [...HEAD, 'f1', 'claim', 'ask', ...MID, 'mark'],
    tokens: 1,
    delivered: 1,
    point: '판독 실패는 토큰이 차감되기 전이라, 판독부터 다시 해도 토큰은 한 번만 나간다',
  },
  {
    key: 'merged',
    label: '② 콜백 실패 · 재시도를 하나로 묶으면',
    note: 'f2',
    frames: [...HEAD, ...MID, 'f2', 'claim', 'ask', ...MID, 'mark'],
    tokens: 2,
    delivered: 1,
    point: '콜백만 실패했는데 판독을 다시 해 토큰이 중복으로 차감된다',
  },
  {
    key: 'split',
    label: '② 콜백 실패 · 판독과 콜백 재시도를 나누면',
    note: 'f2',
    frames: [...HEAD, ...MID, 'f2', 'cclaim', 'send', 'mark'],
    tokens: 1,
    delivered: 1,
    point: '콜백 폴러는 판독이 끝난 작업만 가져가므로 콜백만 다시 보낸다',
  },
  {
    key: 'crash',
    label: '③ 보낸 직후 기록 전에 파드 종료',
    note: 'f3',
    frames: [...HEAD, ...MID, 'f3', 'cclaim', 'send', 'mark'],
    tokens: 1,
    delivered: 2,
    point: '보냈다는 기록이 없어 다시 보낸다. 받는 쪽은 같은 결과를 두 번 받을 수 있다(최소 한 번 전달)',
  },
];

export function FailurePointPlayground({ caption }: { caption?: string }) {
  const [key, setKey] = useState('split');
  const scene = SCENES.find((s) => s.key === key)!;
  const { ref, step, play, done } = usePlay<HTMLElement>(scene.frames.length, 520);

  const rows = ROWS.filter((r) => r.kind === 'msg' || r.id === scene.note);
  const shown = scene.frames.slice(0, step);
  const current = shown[shown.length - 1];
  const counts = rows.map((r) => shown.filter((f) => f === r.id).length);
  const marks = rows.map((r, i): 'past' | 'current' | 'future' | 'hit' => {
    if (r.kind === 'note') return counts[i] > 0 ? 'hit' : 'future';
    if (r.id === current) return 'current';
    return counts[i] > 0 ? 'past' : 'future';
  });

  return (
    <figure ref={ref} className="figure card playground">
      <div className="scene__buttons">
        {SCENES.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`mono${s.key === key ? ' is-on' : ''}`}
            aria-pressed={s.key === key}
            onClick={() => {
              setKey(s.key);
              play();
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <SequenceDiagram
        participants={PARTICIPANTS}
        rows={rows}
        marks={marks}
        counts={counts}
        label={`${scene.label}: ${scene.point}`}
      />

      <p className={`playground__result mono scene__result${done ? ' is-done' : ''}`} aria-live="polite">
        토큰 차감 <strong>{done ? scene.tokens : '…'}번</strong>
        <span className="stepper__token">요청 시스템이 받은 결과 {done ? scene.delivered : '…'}번</span>
      </p>
      <p className={`scene__point mono${done ? ' is-done' : ''}`}>{scene.point}</p>
      {caption && <figcaption className="mono">{caption}</figcaption>}
    </figure>
  );
}
