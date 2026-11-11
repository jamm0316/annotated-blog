'use client';
// @MX:NOTE: 박물관 클라이언트 진입점. engine 을 동적 import 해 붙이고 ask(/api/ask)·open(이동)·social(실시간 관람객, presence.ts)을 넘긴다
// @MX:SPEC: .claude/docs/domains/museum.md

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { Exhibit } from '@/lib/museum';
import { readerHref } from './Reader';

// 박물관 모드. 장면은 engine.ts 가 그리고, 여기서는 붙였다 뗄 자리와 AI 검색·이동만 넘긴다.
// three.js 는 이 페이지에서만 불러온다.
/** 실시간 관람객 연결. 공개돼도 되는 값(프로젝트 주소·공개 키)만 받는다. 없으면 혼자 관람한다 */
export type RealtimeConfig = { url: string; key: string } | null;

export function Museum({ exhibits, realtime }: { exhibits: Exhibit[]; realtime: RealtimeConfig }) {
  const root = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let unmount: (() => void) | null = null;
    let cancelled = false;
    Promise.all([import('./engine'), realtime ? import('./presence') : null]).then(([{ mountMuseum }, presence]) => {
      if (cancelled) return;
      unmount = mountMuseum(el, {
        exhibits,
        social: presence && realtime ? presence.createSocial(realtime) : undefined,
        ask: async (q) => {
          const res = await fetch('/api/ask', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ q }),
          });
          const data = (await res.json().catch(() => ({}))) as {
            answer?: string;
            picks?: { id: string; reason: string }[];
            error?: string;
          };
          if (!res.ok || !data.picks) throw new Error(data.error ?? '지금은 답할 수 없어요.');
          return { answer: data.answer ?? '', picks: data.picks.map(({ id, reason }) => ({ id, reason })) };
        },
        open: (ex) => {
          if (ex.external) window.open(ex.href, '_blank', 'noopener,noreferrer');
          // @MX:WARN: 두루마리는 글 주소(ex.href = /posts/<slug>)가 아니라 박물관 전용 주소(readerHref)로 연다
          // @MX:REASON: 글 주소로 열면 첫 화면이 미리 받아 둔 '글 페이지' 캐시가 그대로 쓰여 두루마리 대신 글 페이지로 넘어간다
          // (실제 겪은 버그. 까닭은 app/museum/@reader/read/[slug]/page.tsx 머리 주석)
          else router.push(readerHref(ex.id));
        },
      });
    });
    return () => {
      cancelled = true;
      unmount?.();
    };
  }, [exhibits, realtime, router]);

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
