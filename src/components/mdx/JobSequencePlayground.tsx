'use client';

// @MX:NOTE: 작업 하나가 접수부터 결과 전달까지 가는 흐름을 스스로 한 줄씩 재생하는 시퀀스 (async-job-queue-without-broker)
// @MX:SPEC: .claude/docs/domains/playgrounds.md

import { SequenceDiagram, type SeqRow } from './SequenceDiagram';
import { usePlay } from './usePlay';

// 줄과 문구는 본문의 시퀀스 다이어그램과 같다. 본문 그림을 바꾸면 여기도 같이 바꾼다.
const PARTICIPANTS = [
  '요청 시스템',
  '접수 API',
  'MongoDB 작업 문서',
  '판독 폴러·워커',
  'AI 에이전트',
  '콜백 폴러·워커',
];
const STEPS: (SeqRow & { status?: string })[] = [
  { kind: 'msg', from: 0, to: 1, label: '판독 요청 (이미지·PDF)' },
  { kind: 'msg', from: 1, to: 2, label: '파일 저장 후 문서 생성 [RECEIVED]', status: 'RECEIVED' },
  { kind: 'msg', from: 1, to: 0, label: '접수 응답', reply: true },
  {
    kind: 'msg',
    from: 3,
    to: 2,
    label: 'findAndModify 선점 [RECEIVED → PROCESSING]',
    loop: '5초마다',
    status: 'PROCESSING',
  },
  { kind: 'msg', from: 3, to: 4, label: '판독 요청' },
  { kind: 'msg', from: 4, to: 3, label: '판독 결과', reply: true },
  { kind: 'msg', from: 3, to: 2, label: '결과 저장 [PROCESSING → DONE]', status: 'DONE' },
  { kind: 'msg', from: 5, to: 2, label: 'DONE 작업 선점', loop: '5초마다' },
  { kind: 'msg', from: 5, to: 0, label: '판독 결과 전송 (콜백)' },
  { kind: 'msg', from: 5, to: 2, label: '전송 완료 기록 [DONE → NOTIFIED]', status: 'NOTIFIED' },
];

// 화면에 들어오면 한 줄씩 스스로 재생되고, 지금 줄과 작업 문서 상태가 함께 바뀐다
export function JobSequencePlayground({ caption }: { caption?: string }) {
  const { ref, step, play, done } = usePlay<HTMLElement>(STEPS.length, 650);
  const now = step - 1;
  const status = STEPS.slice(0, step).reduce<string>((s, r) => r.status ?? s, '접수 전');
  const marks = STEPS.map((_, i): 'past' | 'current' | 'future' =>
    i < now ? 'past' : i === now ? 'current' : 'future',
  );

  return (
    <figure ref={ref} className="figure card playground">
      <SequenceDiagram
        participants={PARTICIPANTS}
        rows={STEPS}
        marks={marks}
        label="작업 하나가 접수부터 결과 전달까지 처리되는 흐름"
      />
      <p className="playground__result mono" aria-live="polite">
        작업 문서 <strong>{status}</strong>
      </p>
      <p className="playground__legend mono">
        <span>각 단계는 앞 단계를 부르지 않고 문서 상태만 보고 움직인다</span>
        <button type="button" onClick={play} disabled={!done}>
          다시 보기
        </button>
      </p>
      {caption && <figcaption className="mono">{caption}</figcaption>}
    </figure>
  );
}
