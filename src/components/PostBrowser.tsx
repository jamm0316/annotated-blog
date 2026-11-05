'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FocusEvent, type PointerEvent } from 'react';
import { LiquidTabs, type TabItem } from './LiquidTabs';

export type BrowserPost = {
  slug: string;
  title: string;
  category: 'note' | 'book';
  topic: string;
  series: string;
  badge: string;
  date: string;
  lang: string;
  summary: string;
  hook: string;
  excerpt: string;
};

const CATEGORY_LABEL = { note: '기술 노트', book: '독후감' } as const;
type Category = keyof typeof CATEGORY_LABEL;

// 주소의 #note / #book 으로 첫 선택을 정한다. 예전 주소(#notes, #books)도 받는다.
function fromHash(hash: string): Category | null {
  const h = hash.replace('#', '');
  if (h === 'note' || h === 'notes') return 'note';
  if (h === 'book' || h === 'books') return 'book';
  return null;
}

// 글 목록과 2단계 필터. 큰 분류(기술 노트·독후감)를 누르면 아래로 물방울이 떨어지며 주제 칩이 펼쳐진다.
export function PostBrowser({ posts }: { posts: BrowserPost[] }) {
  const [main, setMain] = useState<Category | null>(null);
  // 접히는 동안에도 칩이 남아 있어야 하므로 마지막으로 연 분류를 따로 둔다
  const [shown, setShown] = useState<Category>('note');
  const [sub, setSub] = useState('');

  const select = (next: Category | null) => {
    setMain(next);
    if (next) setShown(next);
    setSub('');
  };

  useEffect(() => {
    const sync = () => select(fromHash(window.location.hash));
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const mainItems = useMemo<TabItem[]>(
    () =>
      (Object.keys(CATEGORY_LABEL) as Category[]).map((c) => ({
        value: c,
        label: CATEGORY_LABEL[c],
        count: posts.filter((p) => p.category === c).length,
      })),
    [posts],
  );

  const subItems = useMemo<TabItem[]>(() => {
    const inCategory = posts.filter((p) => p.category === shown);
    const counts = new Map<string, number>();
    inCategory.forEach((p) => p.topic && counts.set(p.topic, (counts.get(p.topic) ?? 0) + 1));
    const topics = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'));
    return [
      { value: '', label: '전체', count: inCategory.length },
      ...topics.map(([topic, count]) => ({ value: topic, label: topic, count })),
    ];
  }, [posts, shown]);

  const list = posts.filter((p) => (!main || p.category === main) && (!main || !sub || p.topic === sub));

  const onMain = (value: string) => {
    const next = value === main ? null : (value as Category);
    select(next);
    history.replaceState(null, '', next ? `#${next}` : window.location.pathname);
  };

  const heading = main ? `${CATEGORY_LABEL[main]}${sub ? ` / ${sub}` : ''}` : '전체 글';

  return (
    <>
      <div className="filters">
        <LiquidTabs items={mainItems} value={main} onChange={onMain} label="큰 분류" drip />
        <div className={`filters__sub${main ? ' is-open' : ''}`} inert={!main}>
          <div className="filters__sub-inner">
            <LiquidTabs key={shown} items={subItems} value={sub} onChange={setSub} label="주제" size="sm" />
          </div>
        </div>
      </div>

      <section id="posts">
        <div className="section-head">
          <h2 className="mono">
            <span className="accent">#</span> {heading}
          </h2>
          <span className="mono">{list.length}편</span>
        </div>
        <ul className="rows" key={`${main}-${sub}`}>
          {list.map((p, i) => (
            <PostRow key={p.slug} post={p} index={i} />
          ))}
        </ul>
      </section>
    </>
  );
}

const formatDate = (date: string) => date.replaceAll('-', '.');

// 손을 올리면 행이 살짝 펼쳐지고, 요약과 본문 인용("…")이 AI 가 쓰듯 몇 글자씩 타이핑된다. 끝에 '… 더보기'.
// 요약이 없는 글은 본문 앞부분을 대신 쓴다.
// 마우스로 지나가기만 할 때 깜빡이지 않도록 잠깐 머문 뒤에 연다. 터치에서는 열지 않는다(누르면 바로 글로 간다).
function PostRow({ post, index }: { post: BrowserPost; index: number }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState(0);
  const intent = useRef<number | undefined>(undefined);
  const lead = post.summary || post.excerpt;
  const quote = post.summary && post.hook ? ` “${post.hook}”` : '';
  const text = lead + quote;

  useEffect(() => {
    if (!open || !text) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let i = 0;
    let timer: number;
    const step = () => {
      // 토큰처럼 1~3 글자씩, 간격도 조금씩 다르게
      i = Math.min(text.length, i + 1 + Math.floor(Math.random() * 3));
      setTyped(i);
      if (i < text.length) timer = window.setTimeout(step, 14 + Math.random() * 26);
    };
    // 행이 펼쳐지는 동안 기다렸다가 쓰기 시작한다
    timer = window.setTimeout(reduce ? () => setTyped(text.length) : step, reduce ? 0 : 200);
    return () => window.clearTimeout(timer);
  }, [open, text]);

  const show = () => {
    window.clearTimeout(intent.current);
    intent.current = window.setTimeout(() => setOpen(true), 120);
  };
  const hide = () => {
    window.clearTimeout(intent.current);
    setOpen(false);
    setTyped(0);
  };

  const done = typed >= text.length;

  return (
    <li className="rows__item" style={{ '--i': Math.min(index, 12) } as CSSProperties}>
      <Link
        href={`/posts/${post.slug}`}
        className={`row${open ? ' is-open' : ''}`}
        onPointerEnter={(e: PointerEvent) => e.pointerType === 'mouse' && show()}
        onPointerLeave={hide}
        onFocus={(e: FocusEvent) => e.currentTarget.matches(':focus-visible') && show()}
        onBlur={hide}
      >
        <span className="mono row__date">{formatDate(post.date)}</span>
        <span className="row__main">
          <span className="mono row__topic">
            [{post.topic}]{post.lang === 'en' && ' English'}
            {post.series && <span className="row__series"> {post.series}</span>}
          </span>
          <span className="row__title" lang={post.lang}>
            {post.title}
          </span>
          {text && (
            <span className="row__preview" aria-hidden>
              <span className="row__preview-inner">
                <span className="row__preview-text" lang={post.lang}>
                  {/* 다 쓴 높이를 미리 잡아 두어 타이핑하는 동안 행 높이가 흔들리지 않게 한다 */}
                  <span className="row__ghost">
                    {lead}
                    <span className="row__quote">{quote}</span>… 더보기
                  </span>
                  <span className="row__typed">
                    {lead.slice(0, typed)}
                    {typed > lead.length && <span className="row__quote">{quote.slice(0, typed - lead.length)}</span>}
                    {done ? (
                      <span className="row__more">
                        … <span className="row__more-link">더보기</span>
                      </span>
                    ) : (
                      <span className="row__caret" />
                    )}
                  </span>
                </span>
              </span>
            </span>
          )}
        </span>
        <span>{post.badge && <span className="mono badge">{post.badge}</span>}</span>
      </Link>
    </li>
  );
}
