type Props = {
  /** 막대에 올릴 값 */
  value: number;
  /** 점선으로 표시할 한도 */
  limit: number;
  limitLabel: string;
  /** 스크린 리더용 설명 */
  label: string;
};

// 매개변수 그림의 막대. 한도 안은 칠하고 넘친 만큼은 빗금으로 그린다.
export function PlaygroundBar({ value, limit, limitLabel, label }: Props) {
  const within = Math.min(value, limit);
  const over = Math.max(0, value - limit);
  const scale = Math.max(value, limit * 1.25);

  return (
    <div className="playground__bar" role="img" aria-label={label}>
      <span className="playground__acquired" style={{ width: `${(within / scale) * 100}%` }} />
      <span className="playground__waiting" style={{ width: `${(over / scale) * 100}%` }} />
      <span className="playground__pool" style={{ left: `${(limit / scale) * 100}%` }}>
        <span className="mono">{limitLabel}</span>
      </span>
    </div>
  );
}
