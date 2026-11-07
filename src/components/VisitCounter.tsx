'use client';
// @MX:NOTE: 바닥글의 today · total 방문자 수. 화면을 열 때 /api/visit 를 한 번 불러 기록하고 받은 숫자를 보여 준다
// @MX:SPEC: .claude/docs/domains/stats.md

import { useEffect, useState } from 'react';

// 숫자는 모두 DB 에 실제로 쌓인 값이다. 받기 전이나 실패하면 아무것도 보이지 않는다(지어낸 0 을 보이지 않는다)
export function VisitCounter() {
  const [counts, setCounts] = useState<{ today: number; total: number } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/visit', { method: 'POST' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { today?: number; total?: number } | null) => {
        if (alive && data && typeof data.today === 'number' && typeof data.total === 'number') {
          setCounts({ today: data.today, total: data.total });
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!counts) return null;
  const n = (v: number) => v.toLocaleString('ko-KR');
  return (
    <span className="visit-counter" aria-label={`오늘 방문자 ${n(counts.today)}명, 누적 방문자 ${n(counts.total)}명`}>
      today <span className="visit-counter__n">{n(counts.today)}</span> · total <span className="visit-counter__n">{n(counts.total)}</span>
    </span>
  );
}
