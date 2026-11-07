'use client';
// @MX:NOTE: '/'·⌘K 로 여는 검색 팔레트. 키워드는 클라이언트에서 grep, '자연어로 묻기' 줄만 /api/ask 를 불러 AI 답과 고른 글을 보여 준다
// @MX:SPEC: .claude/docs/domains/search.md

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { SearchItem } from '@/lib/search';

type SearchPost = SearchItem;


const LATEST = 8;

// 검색창을 열면 입력칸에 타이핑됐다 지워지는 예시 질문. 실제 글로 답이 나오는 것만 둔다.
// 한 바퀴만 돌고 마지막 질문에서 멈춘다(반복 애니메이션 금지). Tab 을 누르면 지금 보이는 질문이 들어간다.
// @MX:WARN: 실제 글로 답이 나오는 질문만 둔다
// @MX:REASON: 예시를 그대로 Enter 로 AI 에 물으므로, 맞는 글이 없는 질문이면 첫 경험이 '못 찾았다'가 된다(AGENTS.md 규칙)
const SUGGESTIONS = [
  '보안 관련 글 있어?',
  '캐시를 더 자세히 다룬 글이 있어?',
  '다운로드 API 메모리 문제를 푼 글',
  'AI 코딩 에이전트를 어떻게 통제해?',
  '이 사람은 어떤 개발자야?',
];
const TYPE_MS = 70;
const ERASE_MS = 30;
const HOLD_MS = 1600;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function grep(posts: SearchPost[], query: string) {
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
}

type Pick = Omit<SearchItem, 'text'> & { reason: string };
// grep: 키워드로 거른다. ask: 문장을 AI 에 물어 답(answer)과 고른 글을 보여 준다(/api/ask).
type Ask = { status: 'loading' } | { status: 'done'; answer: string; picks: Pick[] } | { status: 'error'; message: string };

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

  const [isOpen, setIsOpen] = useState(false);
  // 입력칸에 타이핑 중인 예시(placeholder)와 그 원문
  const [hint, setHint] = useState('');
  const [suggestion, setSuggestion] = useState(SUGGESTIONS[0]);
  const touched = useRef(false);

  const results = useMemo(() => grep(posts, query), [posts, query]);

  useEffect(() => {
    // 움직임을 줄인 환경에서는 open() 이 첫 질문을 그대로 보여 준다
    if (!isOpen || reducedMotion()) return;
    let timer: number;
    let index = 0;
    let length = 0;
    let erasing = false;
    const step = () => {
      // 사용자가 입력을 시작하면 지금 질문을 다 보여 준 채로 멈춘다
      if (touched.current) {
        setHint(SUGGESTIONS[index]);
        return;
      }
      const text = SUGGESTIONS[index];
      setSuggestion(text);
      const last = index === SUGGESTIONS.length - 1;
      if (!erasing) {
        length += 1;
        setHint(text.slice(0, length));
        if (length < text.length) timer = window.setTimeout(step, TYPE_MS);
        else if (!last) {
          erasing = true;
          timer = window.setTimeout(step, HOLD_MS);
        }
      } else {
        length -= 1;
        setHint(text.slice(0, length));
        if (length > 0) timer = window.setTimeout(step, ERASE_MS);
        else {
          erasing = false;
          index += 1;
          timer = window.setTimeout(step, TYPE_MS * 4);
        }
      }
    };
    timer = window.setTimeout(step, 300);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

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
      const data = (await res.json()) as { answer?: string; picks?: Pick[]; error?: string };
      setAsk(
        res.ok && data.picks
          ? { status: 'done', answer: data.answer ?? '', picks: data.picks }
          : { status: 'error', message: data.error ?? '지금은 답할 수 없습니다.' },
      );
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
    setSuggestion(SUGGESTIONS[0]);
    setHint(reducedMotion() ? SUGGESTIONS[0] : '');
    touched.current = false;
    setIsOpen(true);
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
        // 박물관에서는 '/' 가 부엉이를 부른다(⌘K 는 그대로 검색)
        // @MX:WARN: /museum 제외 조건을 지우면 박물관에서 '/' 한 번에 팔레트와 부엉이가 함께 열린다
        // @MX:REASON: museum 엔진도 window keydown 으로 '/' 를 받는다
      } else if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target) && !window.location.pathname.startsWith('/museum')) {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 글은 이 사이트 안에서, 연구실 항목은 새 탭에서 연다
  const go = (item: { href: string; external: boolean }) => {
    close();
    if (item.external) window.open(item.href, '_blank', 'noopener,noreferrer');
    else router.push(item.href);
  };

  const move = (by: number) => {
    if (count === 0) return;
    const next = (active + by + count) % count;
    setActive(next);
    dialog.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: 'nearest' });
  };

  // 예시 질문을 입력칸에 넣고 '자연어로 묻기' 줄을 골라 둔다. 이어서 Enter 를 누르면 바로 묻는다
  const fill = () => {
    touched.current = true;
    setQuery(suggestion);
    setAsk(null);
    setActive(grep(posts, suggestion).length);
    input.current?.focus();
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.nativeEvent.isComposing) return; // 한글 조합 중 Enter 는 조합을 끝내는 키다
    if (e.key === 'Tab' && !e.shiftKey && !query) {
      e.preventDefault();
      fill();
    } else if (e.key === 'Escape') {
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
        if (ask.status === 'done' && ask.picks[active]) go(ask.picks[active]);
      } else if (results[active]) go(results[active]);
      else if (canAsk) void askAI();
    }
  };

  const activeId = asking
    ? ask.status === 'done' && ask.picks[active]
      ? `ask-${ask.picks[active].id}`
      : undefined
    : results[active]
      ? `search-${results[active].id}`
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
        onClose={() => setIsOpen(false)}
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
                touched.current = true;
                setQuery(next);
                setAsk(null);
                // 묻기 줄은 결과 맨 뒤라, 키워드로 맞는 글이 없으면 첫 줄(0)이 곧 묻기 줄이다
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={hint}
              aria-label="검색어. 키워드나 문장을 쓰거나 Tab 으로 예시 질문을 넣는다"
              aria-controls="search-results"
              aria-activedescendant={activeId}
              autoComplete="off"
              spellCheck={false}
            />
            {/* 빈 칸일 때만 보인다. 누르거나 Tab 을 치면 예시 질문이 들어간다(폰은 눌러서) */}
            {!query && (
              <button type="button" className="key search__tab" tabIndex={-1} aria-label={`예시 질문 넣기: ${suggestion}`} onClick={fill}>
                Tab
              </button>
            )}
          </label>

          <ul id="search-results" className="search__results" role="listbox" aria-label="검색 결과" aria-busy={ask?.status === 'loading'}>
            {!asking &&
              results.map((p, i) => (
                <li
                  key={p.id}
                  id={`search-${p.id}`}
                  role="option"
                  aria-selected={i === active}
                  data-index={i}
                  className={`search__item${i === active ? ' is-active' : ''}`}
                  onPointerMove={() => setActive(i)}
                  onClick={() => go(p)}
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
            {ask?.status === 'loading' && <li className="search__empty mono">글 목록을 읽고 생각하는 중…</li>}
            {ask?.status === 'error' && <li className="search__empty mono">{ask.message}</li>}
            {ask?.status === 'done' && ask.answer && (
              <li className="search__answer" role="presentation">
                {ask.answer}
              </li>
            )}
            {ask?.status === 'done' && !ask.answer && ask.picks.length === 0 && (
              <li className="search__empty mono">이 질문에 맞는 글을 찾지 못했습니다.</li>
            )}
            {ask?.status === 'done' &&
              ask.picks.map((p, i) => (
                <li
                  key={p.id}
                  id={`ask-${p.id}`}
                  role="option"
                  aria-selected={i === active}
                  data-index={i}
                  className={`search__item search__pick${i === active ? ' is-active' : ''}`}
                  onPointerMove={() => setActive(i)}
                  onClick={() => go(p)}
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
                  ? `AI 답 · 고른 글 ${ask.picks.length}편 · 답과 까닭은 AI 가 쓴 것`
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
