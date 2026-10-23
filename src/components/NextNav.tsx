'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type Item = { slug: string; title: string; description: string; date: string; reason: string };

// 다 읽고 이어서 볼 글. 끝까지 내려 이 칸의 윗변이 화면 가운데를 넘으면
// 위의 본문이 흐려지고 카드가 아래에서 올라온다. 다시 위로 올리면 본문이 돌아온다.
export function NextNav({ items }: { items: Item[] }) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<'static' | 'waiting' | 'in'>('static');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const shown = el.getBoundingClientRect().top < window.innerHeight * 0.5;
      setState(shown ? 'in' : 'waiting');
      document.documentElement.toggleAttribute('data-reading-done', shown);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.documentElement.removeAttribute('data-reading-done');
    };
  }, []);

  return (
    <nav ref={ref} className="next-nav" data-state={state} aria-label="이어서 읽을 글">
      <div className="next-nav__inner">
        <p className="mono next-nav__heading">이어서 읽기</p>
        <div className="next-nav__list">
          {items.map((p) => (
            <Link key={p.slug} href={`/posts/${p.slug}`} className="next-nav__item frame">
              <span className="mono next-nav__reason">▸ {p.reason}</span>
              <span className="next-nav__title">{p.title}</span>
              {p.description && <span className="next-nav__desc">{p.description}</span>}
              <span className="mono next-nav__date">{p.date}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
