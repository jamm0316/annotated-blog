'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FocusEvent, type PointerEvent } from 'react';
import { AREAS } from '@/lib/areas';
import type { LabItem } from '@/lib/lab';
import { LabGrid } from './LabGrid';
import { LiquidChips, LiquidTabs, type TabItem } from './LiquidTabs';

export type BrowserPost = {
  slug: string;
  title: string;
  category: 'note' | 'book';
  topic: string;
  areas: string[];
  series: string;
  badge: string;
  date: string;
  lang: string;
  summary: string;
  hook: string;
  excerpt: string;
};

const CATEGORY_LABEL = { note: '기술 노트', book: '독후감', lab: '연구실' } as const;
type Category = keyof typeof CATEGORY_LABEL;

// 고른 탭과 칩을 주소에 남긴다: #note, #note=성능 최적화,캐싱 전략. 글을 보고 뒤로 오면 그대로 돌아오고, 주소를 그대로 공유할 수 있다.
// 예전 주소(#notes, #books)도 받는다.
function fromHash(hash: string): { main: Category | null; sub: string[] } {
  const [head, rest = ''] = hash.replace('#', '').split('=');
  const main =
    head === 'note' || head === 'notes'
      ? 'note'
      : head === 'book' || head === 'books'
        ? 'book'
        : head === 'lab'
          ? 'lab'
          : null;
  let sub: string[] = [];
  try {
    sub = main && rest ? decodeURIComponent(rest).split(',').filter(Boolean) : [];
  } catch {
    // 손으로 고친 주소가 깨져 있으면 칩은 비운다
  }
  return { main, sub };
}

function toHash(main: Category | null, sub: string[]): string {
  if (!main) return window.location.pathname;
  return sub.length ? `#${main}=${sub.map(encodeURIComponent).join(',')}` : `#${main}`;
}

// 글 목록과 2단계 필터. 큰 분류(기술 노트·독후감·연구실)를 누르면 아래로 물방울이 떨어지며 주제 칩이 펼쳐진다.
// 연구실은 글이 아니라 GitHub Pages 에 올린 실험들이라 행 대신 썸네일 카드로 보여 준다.
export function PostBrowser({ posts, lab }: { posts: BrowserPost[]; lab: LabItem[] }) {
  const [main, setMain] = useState<Category | null>(null);
  // 접히는 동안에도 칩이 남아 있어야 하므로 마지막으로 연 분류를 따로 둔다
  const [shown, setShown] = useState<Category>('note');
  // 주제 칩은 여러 개를 함께 고를 수 있다. 고른 것 중 하나라도 맞으면 보인다. 비어 있으면 전체.
  const [rawSub, setSub] = useState<string[]>([]);

  const select = (next: Category | null, picked: string[] = []) => {
    setMain(next);
    if (next) setShown(next);
    setSub(picked);
  };

  useEffect(() => {
    const sync = () => {
      const { main, sub } = fromHash(window.location.hash);
      select(main, sub);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  // 로그 뷰어처럼 j/k 로 한 줄씩 오르내린다. 행에 초점이 가면 손을 올렸을 때처럼 펼쳐지고, Enter 로 연다.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 글자(e.key) 대신 자판 위치(e.code)로 본다. 한글 자판이면 같은 키가 'ㅓ'·'ㅏ' 로 들어오기 때문이다.
      if (e.code !== 'KeyJ' && e.code !== 'KeyK') return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (document.querySelector('dialog[open]')) return;
      const items = [...document.querySelectorAll<HTMLElement>('#posts .row, #posts .lab-card__link')];
      if (items.length === 0) return;
      e.preventDefault();
      const at = items.indexOf(document.activeElement as HTMLElement);
      const next = at < 0 ? 0 : Math.min(items.length - 1, Math.max(0, at + (e.code === 'KeyJ' ? 1 : -1)));
      items[next].focus({ preventScroll: true });
      items[next].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const mainItems = useMemo<TabItem[]>(
    () =>
      (Object.keys(CATEGORY_LABEL) as Category[]).map((c) => ({
        value: c,
        label: CATEGORY_LABEL[c],
        count: c === 'lab' ? lab.length : posts.filter((p) => p.category === c).length,
      })),
    [posts, lab],
  );

  const subItems = useMemo<TabItem[]>(() => {
    // 기술 노트는 JD 역량 이름으로, 정해 둔 순서대로 묶는다. 한 글이 여러 칩에 들 수 있다.
    if (shown === 'note') {
      const notes = posts.filter((p) => p.category === 'note');
      return [
        { value: '', label: '전체', count: notes.length },
        ...AREAS.map((a) => ({ value: a, label: a, count: notes.filter((p) => p.areas.includes(a)).length })).filter(
          (a) => a.count > 0,
        ),
      ];
    }
    const inCategory =
      shown === 'lab' ? lab.map((l) => l.kind) : posts.filter((p) => p.category === shown).map((p) => p.topic);
    const counts = new Map<string, number>();
    inCategory.forEach((t) => t && counts.set(t, (counts.get(t) ?? 0) + 1));
    const topics = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'));
    return [
      { value: '', label: '전체', count: inCategory.length },
      ...topics.map(([topic, count]) => ({ value: topic, label: topic, count })),
    ];
  }, [posts, lab, shown]);

  // 예전 링크에 지금은 없는 칩 이름이 남아 있으면 무시한다. 다음에 칩을 누르면 주소에서도 빠진다.
  const sub = rawSub.filter((v) => v !== '' && subItems.some((i) => i.value === v));
  const labList = lab.filter((l) => sub.length === 0 || sub.includes(l.kind));
  const matches = (p: BrowserPost) => (main === 'note' ? p.areas.some((a) => sub.includes(a)) : sub.includes(p.topic));
  const list = posts.filter((p) => (!main || p.category === main) && (!main || sub.length === 0 || matches(p)));

  const onMain = (value: string) => {
    const next = value === main ? null : (value as Category);
    select(next);
    history.replaceState(null, '', toHash(next, []));
  };

  const onSub = (next: string[]) => {
    setSub(next);
    history.replaceState(null, '', toHash(main, next));
  };

  // 칩을 많이 고르면 제목이 길어지므로 두 개까지만 적고 나머지는 '외 n'
  const picked = sub.length > 2 ? `${sub.slice(0, 2).join(' · ')} 외 ${sub.length - 2}` : sub.join(' · ');
  const heading = main ? `${CATEGORY_LABEL[main]}${picked ? ` / ${picked}` : ''}` : '전체 글';

  return (
    <>
      <div className="filters">
        <LiquidTabs items={mainItems} value={main} onChange={onMain} label="큰 분류" drip />
        <div className={`filters__sub${main ? ' is-open' : ''}`} inert={!main}>
          <div className="filters__sub-inner">
            <LiquidChips key={shown} items={subItems} values={sub} onChange={onSub} label="주제 (여러 개 선택)" />
          </div>
        </div>
      </div>

      <section id="posts">
        <div className="section-head">
          <h2 className="mono">
            <span className="accent">#</span> {heading}
          </h2>
          <span className="mono section-head__meta">
            {/* 마우스를 쓰는 화면에서만 보인다. 키 모양만으로 j/k 로 움직일 수 있다는 걸 알린다 */}
            <span className="keys-hint" aria-hidden>
              <kbd className="key">j</kbd>
              <kbd className="key">k</kbd>
            </span>
            {main === 'lab' ? `${labList.length}개` : `${list.length}편`}
          </span>
        </div>
        {main === 'lab' ? (
          <LabGrid key={`lab-${sub.join()}`} items={labList} />
        ) : (
          <ul className="rows" key={`${main}-${sub.join()}`}>
            {list.map((p, i) => (
              <PostRow key={p.slug} post={p} index={i} />
            ))}
          </ul>
        )}
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
