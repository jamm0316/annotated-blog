'use client';

// @MX:NOTE: 다 읽으면 바닥에서 올라오는 이어서 읽기 카드
// @MX:SPEC: .claude/docs/domains/posts.md

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type Item = { slug: string; title: string; description: string; date: string; reason: string };

// 다 읽고 이어서 볼 글. 페이지 바닥까지 내리면 위의 본문이 흐려지고 카드가 아래에서 올라온다.
// 다시 위로 올리면 본문이 돌아온다. 목차로 건너뛰어 바닥에 닿았을 때는 한 번 더 내려야 흐려진다.
export function NextNav({ items }: { items: Item[] }) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<'static' | 'waiting' | 'in'>('static');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    // 목차·# 링크로 건너뛰어 바닥에 닿은 것은 '다 읽음'이 아니다. 독자가 직접 한 번 더 내릴 때까지 흐리지 않는다
    let jumped = location.hash !== '';
    const onScroll = () => {
      const shown = window.scrollY + window.innerHeight >= root.scrollHeight - 24;
      setState(shown ? 'in' : 'waiting');
      // @MX:NOTE: globals.css 의 :root[data-reading-done] 가 목차·머리·본문을 흐린다. 언마운트 때 지운다
      root.toggleAttribute('data-reading-done', shown && !jumped);
    };
    const onJump = (e: Event) => {
      if (e.type === 'click' && !(e.target as Element).closest?.('a[href^="#"]')) return;
      jumped = true;
      root.removeAttribute('data-reading-done');
    };
    // 바닥에서는 더 내려도 scroll 이벤트가 없으므로 휠·터치·키 입력을 직접 본다
    // 아래로 내리는 입력만 본다. 위로 올리는 휠·다른 키까지 보면 올라가기 전에 잠깐 흐려진다
    const DOWN_KEYS = ['ArrowDown', 'PageDown', 'End', ' '];
    const onUserScroll = (e: Event) => {
      if (!jumped) return;
      if (e instanceof WheelEvent && e.deltaY <= 0) return;
      if (e instanceof KeyboardEvent && !DOWN_KEYS.includes(e.key)) return;
      jumped = false;
      onScroll();
    };
    onScroll();
    const user = ['wheel', 'touchmove', 'keydown'] as const;
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('click', onJump, true);
    window.addEventListener('hashchange', onJump);
    user.forEach((t) => window.addEventListener(t, onUserScroll, { passive: true }));
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', onJump, true);
      window.removeEventListener('hashchange', onJump);
      user.forEach((t) => window.removeEventListener(t, onUserScroll));
      root.removeAttribute('data-reading-done');
    };
  }, []);

  return (
    <nav ref={ref} className="next-nav" data-state={state} aria-label="이어서 읽을 글">
      <div className="next-nav__inner">
        <p className="mono next-nav__heading">이어서 읽기</p>
        <div className="next-nav__list">
          {items.map((p) => (
            <Link key={p.slug} href={`/posts/${p.slug}`} className="next-nav__item card">
              <span className="mono next-nav__meta">
                <span className="accent">{p.reason}</span>
                <span>{p.date}</span>
              </span>
              <span className="next-nav__title">{p.title}</span>
              {p.description && <span className="next-nav__desc">{p.description}</span>}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
