'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';

export type SearchPost = {
  slug: string;
  title: string;
  topic: string;
  date: string;
  lang: string;
  /** 제목 말고 함께 찾을 글자들: 주제·칩·태그·요약·설명 */
  text: string;
};

const LATEST = 8;

// 입력 중인 칸에서 누른 '/' 는 글자로 둔다
const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

// 터미널에서 grep 하듯 글을 찾는다. '/' 나 ⌘K(Ctrl+K)로 어디서든 열고, ↑↓ 로 고르고 Enter 로 연다.
// 띄어 쓴 낱말이 모두 들어 있는 글만 남기고, 제목에 든 글을 먼저 보여 준다. 빈 칸이면 최근 글.
export function SearchPalette({ posts }: { posts: SearchPost[] }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return posts.slice(0, LATEST);
    return posts
      .map((p) => {
        const title = p.title.toLowerCase();
        const all = `${title} ${p.text.toLowerCase()}`;
        if (!terms.every((t) => all.includes(t))) return null;
        return { p, score: terms.filter((t) => title.includes(t)).length };
      })
      .filter((r): r is { p: SearchPost; score: number } => r !== null)
      .sort((a, b) => b.score - a.score || b.p.date.localeCompare(a.p.date))
      .map((r) => r.p);
  }, [posts, query]);

  const open = () => {
    const d = dialog.current;
    if (!d || d.open) return;
    setQuery('');
    setActive(0);
    d.showModal();
    input.current?.focus();
  };
  const close = () => dialog.current?.close();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (dialog.current?.open) close();
        else open();
      } else if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = (slug: string) => {
    close();
    router.push(`/posts/${slug}`);
  };

  const move = (by: number) => {
    if (results.length === 0) return;
    const next = (active + by + results.length) % results.length;
    setActive(next);
    dialog.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: 'nearest' });
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.nativeEvent.isComposing) return; // 한글 조합 중 Enter 는 조합을 끝내는 키다
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      go(results[active].slug);
    }
  };

  return (
    <>
      <button type="button" className="icon-btn" aria-label="글 검색 (/)" title="글 검색 ( / )" onClick={open}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="M15.5 15.5 20 20" strokeLinecap="round" />
        </svg>
      </button>

      <dialog
        ref={dialog}
        className="search"
        aria-label="글 검색"
        // 바깥(어두운 바탕)을 누르면 닫는다
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <div className="search__panel">
          <label className="search__prompt mono">
            <span aria-hidden>
              <span className="accent">$</span> grep
            </span>
            <input
              ref={input}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="제목, 주제, 태그"
              aria-label="검색어"
              aria-controls="search-results"
              aria-activedescendant={results[active] ? `search-${results[active].slug}` : undefined}
              autoComplete="off"
              spellCheck={false}
            />
          </label>

          <ul id="search-results" className="search__results" role="listbox" aria-label="검색 결과">
            {results.map((p, i) => (
              <li
                key={p.slug}
                id={`search-${p.slug}`}
                role="option"
                aria-selected={i === active}
                data-index={i}
                className={`search__item${i === active ? ' is-active' : ''}`}
                onPointerMove={() => setActive(i)}
                onClick={() => go(p.slug)}
              >
                <span className="mono search__date">{p.date.replaceAll('-', '.')}</span>
                <span className="mono search__topic">[{p.topic}]</span>
                <span className="search__title" lang={p.lang}>
                  {p.title}
                </span>
              </li>
            ))}
            {results.length === 0 && <li className="search__empty mono">맞는 글이 없습니다.</li>}
          </ul>

          <p className="search__hint mono" aria-live="polite">
            <span>{query.trim() ? `${results.length}편` : '최근 글'}</span>
            <span>↑↓ 이동 · Enter 열기 · Esc 닫기 · 목록에서는 j/k</span>
          </p>
        </div>
      </dialog>
    </>
  );
}
