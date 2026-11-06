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

type Pick = { slug: string; title: string; topic: string; date: string; lang: string; reason: string };
// grep: 키워드로 거른다. ask: 문장을 AI 에 물어 고른 글을 보여 준다(/api/ask).
type Ask = { status: 'loading' } | { status: 'done'; picks: Pick[] } | { status: 'error'; message: string };

// 입력 중인 칸에서 누른 '/' 는 글자로 둔다
const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

// 터미널에서 grep 하듯 글을 찾는다. '/' 나 ⌘K(Ctrl+K)로 어디서든 열고, ↑↓ 로 고르고 Enter 로 연다.
// 띄어 쓴 낱말이 모두 들어 있는 글만 남기고, 제목에 든 글을 먼저 보여 준다. 빈 칸이면 최근 글.
// 결과 맨 아래 '자연어로 묻기' 줄을 고르면 그때만 AI 에 묻는다. 키워드로 맞는 글이 없으면 그 줄이 먼저 골라져 있다.
export function SearchPalette({ posts }: { posts: SearchPost[] }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [ask, setAsk] = useState<Ask | null>(null);

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

  const asking = ask !== null;
  const canAsk = query.trim().length > 0;
  // 지금 ↑↓ 로 고를 수 있는 줄 수. grep 이면 결과 + 묻기 줄, ask 면 AI 가 고른 글
  const count = asking ? (ask.status === 'done' ? ask.picks.length : 0) : results.length + (canAsk ? 1 : 0);

  const askAI = async () => {
    const q = query.trim();
    if (!q) return;
    setAsk({ status: 'loading' });
    setActive(0);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ q }),
      });
      const data = (await res.json()) as { picks?: Pick[]; error?: string };
      setAsk(res.ok && data.picks ? { status: 'done', picks: data.picks } : { status: 'error', message: data.error ?? '지금은 답할 수 없습니다.' });
    } catch {
      setAsk({ status: 'error', message: '연결이 끊겼습니다. 다시 물어 주세요.' });
    }
  };

  const open = () => {
    const d = dialog.current;
    if (!d || d.open) return;
    setQuery('');
    setActive(0);
    setAsk(null);
    d.showModal();
    input.current?.focus();
  };
  const close = () => dialog.current?.close();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyK') {
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
    if (count === 0) return;
    const next = (active + by + count) % count;
    setActive(next);
    dialog.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: 'nearest' });
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.nativeEvent.isComposing) return; // 한글 조합 중 Enter 는 조합을 끝내는 키다
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (asking) {
        if (ask.status === 'done' && ask.picks[active]) go(ask.picks[active].slug);
      } else if (results[active]) go(results[active].slug);
      else if (canAsk) void askAI();
    }
  };

  const activeId = asking
    ? ask.status === 'done' && ask.picks[active]
      ? `ask-${ask.picks[active].slug}`
      : undefined
    : results[active]
      ? `search-${results[active].slug}`
      : canAsk && active === results.length
        ? 'search-ask'
        : undefined;

  return (
    <>
      {/* 입력칸처럼 보이게 해서 누르기 전에 검색이라는 걸 알게 한다. 오른쪽 '/' 는 바로 여는 키 */}
      <button type="button" className="search-trigger mono" aria-label="글 검색 (/)" onClick={open}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="M15.5 15.5 20 20" strokeLinecap="round" />
        </svg>
        <span className="search-trigger__label">검색</span>
        <kbd className="key search-trigger__key">/</kbd>
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
              <span className="accent">$</span> {asking ? 'ask' : 'grep'}
            </span>
            <input
              ref={input}
              // type="search" 는 Esc 를 처음 누르면 글자만 지우고 창을 닫지 않아 text 로 둔다
              type="text"
              inputMode="search"
              enterKeyHint="go"
              value={query}
              onChange={(e) => {
                const next = e.target.value;
                setQuery(next);
                setAsk(null);
                // 묻기 줄은 결과 맨 뒤라, 키워드로 맞는 글이 없으면 첫 줄(0)이 곧 묻기 줄이다
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="키워드나 문장 (예: 보안 관련 글 있어?)"
              aria-label="검색어"
              aria-controls="search-results"
              aria-activedescendant={activeId}
              autoComplete="off"
              spellCheck={false}
            />
          </label>

          <ul id="search-results" className="search__results" role="listbox" aria-label="검색 결과" aria-busy={ask?.status === 'loading'}>
            {!asking &&
              results.map((p, i) => (
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
            {!asking && canAsk && (
              <li
                id="search-ask"
                role="option"
                aria-selected={active === results.length}
                data-index={results.length}
                className={`search__item search__ask${active === results.length ? ' is-active' : ''}`}
                onPointerMove={() => setActive(results.length)}
                onClick={() => void askAI()}
              >
                <span className="mono search__ask-label">
                  {results.length === 0 ? '키워드로는 없습니다 · ' : ''}자연어로 묻기
                </span>
                <span className="search__title">“{query.trim()}”</span>
                <kbd className="key">↵</kbd>
              </li>
            )}
            {ask?.status === 'loading' && <li className="search__empty mono">글 목록을 읽고 고르는 중…</li>}
            {ask?.status === 'error' && <li className="search__empty mono">{ask.message}</li>}
            {ask?.status === 'done' && ask.picks.length === 0 && (
              <li className="search__empty mono">이 질문에 맞는 글을 찾지 못했습니다.</li>
            )}
            {ask?.status === 'done' &&
              ask.picks.map((p, i) => (
                <li
                  key={p.slug}
                  id={`ask-${p.slug}`}
                  role="option"
                  aria-selected={i === active}
                  data-index={i}
                  className={`search__item search__pick${i === active ? ' is-active' : ''}`}
                  onPointerMove={() => setActive(i)}
                  onClick={() => go(p.slug)}
                >
                  <span className="mono search__date">{p.date.replaceAll('-', '.')}</span>
                  <span className="mono search__topic">[{p.topic}]</span>
                  <span className="search__title" lang={p.lang}>
                    {p.title}
                  </span>
                  <span className="search__reason">{p.reason}</span>
                </li>
              ))}
            {!asking && !canAsk && results.length === 0 && <li className="search__empty mono">맞는 글이 없습니다.</li>}
          </ul>

          <p className="search__hint mono" aria-live="polite">
            <span>
              {asking
                ? ask.status === 'done'
                  ? `AI 가 고른 글 ${ask.picks.length}편 · 고른 까닭은 AI 가 쓴 것`
                  : 'AI 에게 묻는 중'
                : canAsk
                  ? `${results.length}편`
                  : '최근 글'}
            </span>
            <span>↑↓ 이동 · Enter 열기 · Esc 닫기 · 목록에서는 j/k</span>
          </p>
        </div>
      </dialog>
    </>
  );
}
