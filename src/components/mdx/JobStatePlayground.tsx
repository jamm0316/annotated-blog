'use client';

// @MX:NOTE: 작업 문서 하나에 사건을 일으켜 상태 전이와 재시도 횟수를 따라가 보는 그림 (async-job-queue-without-broker)
// @MX:SPEC: .claude/docs/domains/playgrounds.md

import { useState } from 'react';

// 상태와 전이 이름은 본문의 상태 전이도와 같다. 재시도 규칙은 본문의 재시도 목록과 남은 과제를 그대로 옮겼다.
// - 연결 실패·5xx: 1분, 10분, 60분 간격으로 최대 3번 다시 시도
// - 요청 형식 오류: 바로 실패, 판독 타임아웃: 다시 시도하지 않는다
// - 회수: 재시도 횟수를 올리기만 하고 상한을 확인하지 않는다(남은 과제). 호출 실패와 같은 횟수를 쓴다
// - 판독과 콜백은 다른 재시도 횟수를 쓴다
// @MX:WARN: 상태 이름·전이·숫자는 본문 그림·문장과 짝이다
// @MX:REASON: 한쪽만 바꾸면 글과 그림이 다른 동작을 말한다

type Status = 'RECEIVED' | 'PROCESSING' | 'DONE' | 'FAILED' | 'NOTIFIED' | 'NOTIFY_FAILED';
type Job = {
  status: Status | null;
  retryCount: number;
  nextAttemptAt: string | null;
  callbackRetryCount: number;
  aiCalls: number;
  log: string[];
};

const MAX_RETRY = 3;
const BACKOFF = ['1분', '10분', '60분'];
const START: Job = { status: null, retryCount: 0, nextAttemptAt: null, callbackRetryCount: 0, aiCalls: 0, log: [] };

type Event = { label: string; run: (j: Job) => Job };

const go = (j: Job, status: Status, line: string, patch: Partial<Job> = {}): Job => ({
  ...j,
  ...patch,
  status,
  log: [...j.log, `${j.status ?? '·'} → ${status}  ${line}`],
});

// 지금 상태에서 일어날 수 있는 사건
function events(j: Job): Event[] {
  switch (j.status) {
    case null:
      return [{ label: '접수', run: (x) => go(x, 'RECEIVED', '접수 API 가 문서 저장') }];
    case 'RECEIVED':
      return [
        {
          label: j.nextAttemptAt ? `${j.nextAttemptAt} 뒤 폴러 선점` : '폴러 선점',
          run: (x) => go(x, 'PROCESSING', '판독 폴러가 선점, AI 에 판독 요청', { nextAttemptAt: null, aiCalls: x.aiCalls + 1 }),
        },
      ];
    case 'PROCESSING':
      return [
        { label: '판독 성공', run: (x) => go(x, 'DONE', '결과 저장') },
        {
          label: '연결 실패·5xx',
          run: (x) =>
            x.retryCount < MAX_RETRY
              ? go(x, 'RECEIVED', `재시도 예약 ${x.retryCount + 1}/${MAX_RETRY}`, {
                  retryCount: x.retryCount + 1,
                  nextAttemptAt: BACKOFF[x.retryCount],
                })
              : go(x, 'FAILED', '재시도 횟수 소진'),
        },
        { label: '요청 형식 오류', run: (x) => go(x, 'FAILED', '다시 해도 같은 실패') },
        { label: '판독 타임아웃', run: (x) => go(x, 'FAILED', '다시 시도하지 않는다') },
        {
          label: '워커가 죽음',
          run: (x) => go(x, 'RECEIVED', '20분 넘게 PROCESSING 이라 회수', { retryCount: x.retryCount + 1 }),
        },
      ];
    case 'DONE':
    case 'FAILED':
      return [
        { label: '통지 성공', run: (x) => go(x, 'NOTIFIED', '콜백 폴러가 결과 전송') },
        {
          label: '통지 실패',
          run: (x) =>
            x.callbackRetryCount < MAX_RETRY
              ? {
                  ...x,
                  callbackRetryCount: x.callbackRetryCount + 1,
                  log: [...x.log, `${x.status} 유지  콜백 재시도 예약 ${x.callbackRetryCount + 1}/${MAX_RETRY}`],
                }
              : go(x, 'NOTIFY_FAILED', '콜백 재시도 횟수 소진'),
        },
      ];
    default:
      return [];
  }
}

// 상태 전이도의 자리. 위에서 아래로 접수 → 처리 → 결과 → 통지
const ROWS: Status[][] = [['RECEIVED'], ['PROCESSING'], ['DONE', 'FAILED'], ['NOTIFIED', 'NOTIFY_FAILED']];

export function JobStatePlayground({ caption }: { caption?: string }) {
  const [job, setJob] = useState<Job>(START);
  const seen = new Set(job.log.map((l) => l.split('  ')[0].split(' → ')[1]));

  return (
    <figure className="figure card playground">
      <div className="jobstate">
        <div className="jobstate__map" role="img" aria-label={`작업 문서 상태 ${job.status ?? '접수 전'}`}>
          {ROWS.map((row) => (
            <div key={row.join()} className="jobstate__row">
              {row.map((s) => (
                <span
                  key={s}
                  className={`jobstate__state mono${job.status === s ? ' is-current' : seen.has(s) ? ' is-seen' : ''}`}
                >
                  {s}
                </span>
              ))}
            </div>
          ))}
        </div>

        <dl className="jobstate__doc mono" aria-live="polite">
          <div>
            <dt>status</dt>
            <dd>{job.status ?? '—'}</dd>
          </div>
          <div>
            <dt>retryCount</dt>
            <dd className={job.retryCount > MAX_RETRY ? 'accent' : ''}>{job.retryCount}</dd>
          </div>
          <div>
            <dt>nextAttemptAt</dt>
            <dd>{job.nextAttemptAt ? `지금 + ${job.nextAttemptAt}` : 'null'}</dd>
          </div>
          <div>
            <dt>callbackRetryCount</dt>
            <dd>{job.callbackRetryCount}</dd>
          </div>
          <div>
            <dt>AI 판독 요청</dt>
            <dd className={job.aiCalls > 1 ? 'accent' : ''}>{job.aiCalls}번</dd>
          </div>
        </dl>
      </div>

      <div className="jobstate__events">
        {events(job).map((e) => (
          <button key={e.label} type="button" className="mono" onClick={() => setJob(e.run(job))}>
            {e.label}
          </button>
        ))}
        {(job.status === 'NOTIFIED' || job.status === 'NOTIFY_FAILED') && (
          <span className="jobstate__end mono">작업 종료</span>
        )}
      </div>

      {job.log.length > 0 && (
        <ol className="stepper__log mono" aria-label="상태 변화 기록">
          {job.log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ol>
      )}

      <p className="playground__legend mono">
        <span>워커를 여러 번 죽여 보면 회수는 재시도 상한을 보지 않는다</span>
        <button type="button" onClick={() => setJob(START)} disabled={job.status === null}>
          처음부터
        </button>
      </p>
      {caption && <figcaption className="mono">{caption}</figcaption>}
    </figure>
  );
}
