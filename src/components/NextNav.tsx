'use client';

// @MX:NOTE: 다 읽으면 바닥에서 올라오는 이어서 읽기 카드
// @MX:SPEC: .claude/docs/domains/posts.md

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type Item = { slug: string; title: string; description: string; date: string; reason: string };

// 다 읽고 이어서 볼 글. 페이지 바닥까지 내리면 위의 본문이 흐려지고 카드가 아래에서 올라온다.
// 다시 위로 올리면 본문이 돌아온다.
export function NextNav({ items }: { items: Item[] }) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<'static' | 'waiting' | 'in'>('static');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const root = document.documentElement;
      const shown = window.scrollY + window.innerHeight >= root.scrollHeight - 24;
      setState(shown ? 'in' : 'waiting');
      // @MX:NOTE: globals.css 의 :root[data-reading-done] 가 목차·머리·본문을 흐린다. 언마운트 때 지운다
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
