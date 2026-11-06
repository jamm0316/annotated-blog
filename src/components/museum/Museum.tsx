'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { Exhibit } from '@/lib/museum';

// 박물관 모드. 장면은 engine.ts 가 그리고, 여기서는 붙였다 뗄 자리와 AI 검색·이동만 넘긴다.
// three.js 는 이 페이지에서만 불러온다.
export function Museum({ exhibits }: { exhibits: Exhibit[] }) {
  const root = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let unmount: (() => void) | null = null;
    let cancelled = false;
    import('./engine').then(({ mountMuseum }) => {
      if (cancelled) return;
      unmount = mountMuseum(el, {
        exhibits,
        ask: async (q) => {
          const res = await fetch('/api/ask', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ q }),
          });
          const data = (await res.json().catch(() => ({}))) as { picks?: { id: string; reason: string }[]; error?: string };
          if (!res.ok || !data.picks) throw new Error(data.error ?? '지금은 답할 수 없어요.');
          return data.picks.map(({ id, reason }) => ({ id, reason }));
        },
        open: (ex) => {
          if (ex.external) window.open(ex.href, '_blank', 'noopener,noreferrer');
          else router.push(ex.href);
        },
      });
    });
    return () => {
      cancelled = true;
      unmount?.();
    };
  }, [exhibits, router]);

  return (
    <div className="museum" ref={root}>
      <p className="museum__loading mono">기록관 문을 여는 중…</p>
    </div>
  );
}
