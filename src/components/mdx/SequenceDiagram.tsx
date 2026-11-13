// @MX:NOTE: 시퀀스 다이어그램을 HTML 로 그리는 공용 부품. 줄마다 상태(지난·지금·앞으로)와 실행 횟수를 칠한다
// @MX:SPEC: .claude/docs/domains/playgrounds.md

export type SeqRow =
  | { kind: 'msg'; from: number; to: number; label: string; reply?: boolean; loop?: string }
  | { kind: 'note'; from: number; to: number; label: string; sub?: string };

type Props = {
  participants: string[];
  rows: SeqRow[];
  /** 줄마다 붙일 상태. 없으면 모두 보통으로 그린다 */
  marks?: ('past' | 'current' | 'future' | 'hit' | 'off')[];
  /** 줄마다 실행 횟수. 2 이상이면 줄 오른쪽에 ×n 을 붙인다 */
  counts?: number[];
  label: string;
};

// 참여자 i 의 생명선 위치(%)
const at = (i: number, n: number) => ((i + 0.5) / n) * 100;

// 메시지·메모를 한 줄씩 쌓아 그린다. 생명선은 줄 뒤에 깔고, 화살표는 두 생명선 사이에 걸친다.
// 좁은 화면에서는 그림만 가로로 밀어 보게 하고 페이지는 넘치지 않게 한다(.seq__scroll).
export function SequenceDiagram({ participants, rows, marks, counts, label }: Props) {
  const n = participants.length;
  return (
    <div className="seq__scroll">
      <div className="seq mono" role="img" aria-label={label}>
        <div className="seq__heads" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {participants.map((p) => (
            <span key={p} className="seq__head">
              {p}
            </span>
          ))}
        </div>
        <div className="seq__body">
          {participants.map((p, i) => (
            <span key={p} className="seq__life" style={{ left: `${at(i, n)}%` }} />
          ))}
          {rows.map((r, i) => {
            const a = at(Math.min(r.from, r.to), n);
            const b = at(Math.max(r.from, r.to), n);
            const mark = marks?.[i] ?? '';
            const count = counts?.[i] ?? 1;
            const box = { marginLeft: `${a}%`, width: `${b - a}%` };
            if (r.kind === 'note') {
              const pad = 50 / n;
              return (
                <div key={i} className={`seq__row seq__row--note is-${mark}`}>
                  <div className="seq__note" style={{ marginLeft: `${a - pad * 0.8}%`, width: `${b - a + pad * 1.6}%` }}>
                    <span>{r.label}</span>
                    {r.sub && <span className="seq__sub">{r.sub}</span>}
                  </div>
                </div>
              );
            }
            const left = r.to < r.from;
            return (
              <div key={i} className={`seq__row is-${mark}${r.loop ? ' seq__row--loop' : ''}`}>
                {r.loop && (
                  <span className="seq__loop" style={{ left: `${a - 4}%`, width: `${b - a + 8}%` }}>
                    loop · {r.loop}
                  </span>
                )}
                <span className="seq__label" style={box}>
                  {r.label}
                </span>
                <span
                  className={`seq__line${r.reply ? ' seq__line--reply' : ''}${left ? ' seq__line--left' : ''}`}
                  style={box}
                />
                {count > 1 && <span className="seq__count">×{count}</span>}
              </div>
            );
          })}
        </div>
      </div>
      <p className="seq__hint mono">그림을 옆으로 밀어 나머지를 본다</p>
    </div>
  );
}
