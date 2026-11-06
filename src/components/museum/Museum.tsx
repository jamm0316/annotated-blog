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

  // 박물관을 떠나는 링크(머리말·모드 메뉴·영수증의 '블로그로 나가기')를 누르면 두루마리처럼 말려 올라간 뒤 이동한다.
  // 들어올 때 펼쳐지는 움직임은 CSS(.museum 의 museum-unroll)가 맡는다
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer = 0;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      // 두루마리(글 읽기)의 '전체 페이지'는 그 위에서 바로 넘어간다
      if (a.closest('dialog')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname.startsWith('/museum')) return;
      const el = root.current;
      if (!el || el.dataset.leaving) return;
      e.preventDefault();
      e.stopPropagation();
      el.dataset.leaving = '1';
      timer = window.setTimeout(() => router.push(url.pathname + url.search + url.hash), 620);
    };
    window.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('click', onClick, true);
      window.clearTimeout(timer);
    };
  }, [router]);

  return (
    <div className="museum" ref={root}>
      <p className="museum__loading mono">기록관 문을 여는 중…</p>
    </div>
  );
}
