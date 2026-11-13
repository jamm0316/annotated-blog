'use client';

// @MX:NOTE: 작업 하나가 접수부터 결과 전달까지 가는 흐름을 한 단계씩 넘겨 보는 그림 (async-job-queue-without-broker)
// @MX:SPEC: .claude/docs/domains/playgrounds.md

import { useState } from 'react';
import { SequenceDiagram, type SeqRow } from './SequenceDiagram';

// 줄과 문구는 본문의 시퀀스 다이어그램과 같다. 본문 그림을 바꾸면 여기도 같이 바꾼다.
const PARTICIPANTS = ['요청 시스템', '접수 API', 'MongoDB 작업 문서', '판독 폴러·워커', 'AI 에이전트', '콜백 폴러·워커'];
const STEPS: (SeqRow & { status?: string })[] = [
  { kind: 'msg', from: 0, to: 1, label: '판독 요청 (이미지·PDF)' },
  { kind: 'msg', from: 1, to: 2, label: '파일 저장 후 문서 생성 [RECEIVED]', status: 'RECEIVED' },
  { kind: 'msg', from: 1, to: 0, label: '접수 응답', reply: true },
  { kind: 'msg', from: 3, to: 2, label: 'findAndModify 선점 [RECEIVED → PROCESSING]', loop: '5초마다', status: 'PROCESSING' },
  { kind: 'msg', from: 3, to: 4, label: '판독 요청' },
  { kind: 'msg', from: 4, to: 3, label: '판독 결과', reply: true },
  { kind: 'msg', from: 3, to: 2, label: '결과 저장 [PROCESSING → DONE]', status: 'DONE' },
  { kind: 'msg', from: 5, to: 2, label: 'DONE 작업 선점', loop: '5초마다' },
  { kind: 'msg', from: 5, to: 0, label: '판독 결과 전송 (콜백)' },
  { kind: 'msg', from: 5, to: 2, label: '전송 완료 기록 [DONE → NOTIFIED]', status: 'NOTIFIED' },
];

export function JobSequencePlayground({ caption }: { caption?: string }) {
  // 지금 보고 있는 줄. -1 이면 아직 시작 전
  const [step, setStep] = useState(-1);
  const last = STEPS.length - 1;
  const status = STEPS.slice(0, step + 1).reduce<string>((s, r) => r.status ?? s, '없음');
  const marks = STEPS.map((_, i): 'past' | 'current' | 'future' => (i < step ? 'past' : i === step ? 'current' : 'future'));

  return (
    <figure className="figure card playground">
      <SequenceDiagram participants={PARTICIPANTS} rows={STEPS} marks={marks} label="작업 하나가 접수부터 결과 전달까지 처리되는 흐름" />

      <p className="playground__result mono" aria-live="polite">
        {step < 0 ? '아직 요청 전' : `${step + 1} / ${STEPS.length}`} · 작업 문서 <strong>{status}</strong>
      </p>
      <p className="playground__legend mono">
        <span>각 단계는 앞 단계를 부르지 않고 문서 상태만 본다</span>
        <span className="playground__buttons">
          <button type="button" onClick={() => setStep(-1)} disabled={step < 0}>
            처음부터
          </button>
          <button type="button" className="is-primary" onClick={() => setStep((s) => Math.min(last, s + 1))} disabled={step >= last}>
            다음 단계
          </button>
        </span>
      </p>
      {caption && <figcaption className="mono">{caption}</figcaption>}
    </figure>
  );
}
