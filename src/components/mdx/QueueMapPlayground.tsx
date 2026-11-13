"use client";

// @MX:NOTE: 작업 큐 구성 요소를 눌러 누구를 부르고 무엇을 바꾸는지 보는 구조도 (async-job-queue-without-broker)
// @MX:SPEC: .claude/docs/domains/playgrounds.md

import { useState } from "react";

// 이름·관계·라벨은 본문의 클래스 다이어그램과 같다. 본문 그림을 바꾸면 여기도 같이 바꾼다.
type Node = { id: string; group: string; items?: string[] };
const NODES: Node[] = [
  { id: "JobReceiveService", group: "접수" },
  { id: "WorkerPoller", group: "스케줄러" },
  { id: "CallbackPoller", group: "스케줄러" },
  { id: "StaleJobRecoverer", group: "스케줄러" },
  { id: "JobProcessor", group: "워커" },
  { id: "CallbackProcessor", group: "워커" },
  {
    id: "JobQueueRepository",
    group: "저장",
    items: [
      "save(job)",
      "claimNext()",
      "claimCallback()",
      "recoverStale()",
      "markDone(jobId, expectedStartedAt)",
    ],
  },
  {
    id: "Job",
    group: "저장",
    items: [
      "status",
      "receivedAt",
      "processingStartedAt",
      "nextAttemptAt",
      "retryCount",
      "callbackStartedAt",
      "callbackNextAttemptAt",
      "callbackRetryCount",
      "result",
    ],
  },
  { id: "AiClient", group: "바깥" },
  { id: "CallbackClient", group: "바깥" },
];

// method 는 화살표가 닿는 저장소 메서드. 클래스 다이어그램의 화살표 라벨과 메서드 이름을 짝지었다
const EDGES: { from: string; to: string; label: string; method?: string }[] = [
  {
    from: "JobReceiveService",
    to: "JobQueueRepository",
    label: "넣기",
    method: "save(job)",
  },
  {
    from: "WorkerPoller",
    to: "JobQueueRepository",
    label: "선점",
    method: "claimNext()",
  },
  { from: "WorkerPoller", to: "JobProcessor", label: "전용 스레드풀에 제출" },
  {
    from: "CallbackPoller",
    to: "JobQueueRepository",
    label: "리스 선점",
    method: "claimCallback()",
  },
  {
    from: "CallbackPoller",
    to: "CallbackProcessor",
    label: "전용 스레드풀에 제출",
  },
  {
    from: "StaleJobRecoverer",
    to: "JobQueueRepository",
    label: "회수",
    method: "recoverStale()",
  },
  {
    from: "JobProcessor",
    to: "JobQueueRepository",
    label: "조건부 갱신",
    method: "markDone(jobId, expectedStartedAt)",
  },
  { from: "JobProcessor", to: "AiClient", label: "판독 요청" },
  { from: "CallbackProcessor", to: "CallbackClient", label: "결과 통지" },
  { from: "JobQueueRepository", to: "Job", label: "문서" },
];

// 세 줄로 놓는다: 부르는 쪽 · 실행하는 쪽과 바깥 · 저장
const COLUMNS = [["접수", "스케줄러"], ["워커", "바깥"], ["저장"]];

export function QueueMapPlayground({ caption }: { caption?: string }) {
  const [picked, setPicked] = useState("WorkerPoller");
  const edges = EDGES.filter((e) => e.from === picked || e.to === picked);
  const linked = new Set(edges.flatMap((e) => [e.from, e.to]));
  const methods = new Set(edges.map((e) => e.method).filter(Boolean));

  return (
    <figure className="figure card playground">
      <div className="qmap">
        {COLUMNS.map((col) => (
          <div key={col.join()} className="qmap__col">
            {col.map((g) => (
              <div key={g} className="qmap__group">
                <p className="qmap__title mono">{g}</p>
                {NODES.filter((n) => n.group === g).map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    aria-pressed={picked === n.id}
                    className={`qmap__node mono${picked === n.id ? " is-picked" : linked.has(n.id) ? " is-linked" : ""}`}
                    onClick={() => setPicked(n.id)}
                  >
                    <span className="qmap__name">{n.id}</span>
                    {n.items && (
                      <span className="qmap__items">
                        {n.items.map((m) => (
                          <span
                            key={m}
                            className={methods.has(m) ? "is-hit" : ""}
                          >
                            {m}
                          </span>
                        ))}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      <ul
        className="stepper__log mono"
        aria-live="polite"
        aria-label={`${picked} 의 관계`}
      >
        {edges.map((e) => (
          <li key={e.from + e.to + e.label}>
            {e.from} —{e.label}→{" "}
            <strong>{e.method ? `${e.to}.${e.method}` : e.to}</strong>
          </li>
        ))}
      </ul>
      <p className="playground__legend mono">
        <span>구성 요소를 누르면 그 요소와 이어진 관계만 보인다</span>
      </p>
      {caption && <figcaption className="mono">{caption}</figcaption>}
    </figure>
  );
}
