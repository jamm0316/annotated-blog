'use client';

// @MX:NOTE: 머리말 오른쪽 끝 모드 메뉴(읽기 ↔ 박물관)와 첫 방문 박물관 안내 말풍선. 좁은 폰에서는 테마 바꾸기도 여기로 온다
// @MX:SPEC: .claude/docs/domains/shell.md

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { TIP_KEY } from './SearchPalette';
import { toggleTheme } from './ThemeToggle';

const MODES = [
  { href: '/', label: '읽기', note: '글 목록' },
  { href: '/museum', label: '박물관', note: '3D 기록관' },
] as const;

// 처음 온 방문자에게 한 번만 박물관 모드를 알리는 말풍선. 이 브라우저에서 한 번 보이면 다시 띄우지 않는다.
// 첫 방문에는 검색 안내(SearchPalette 의 TIP_KEY)가 먼저 뜨므로, 이 말풍선은 검색 안내를 본 다음 방문에 띄운다
const HINT_KEY = 'evan-log:museum-hint';

// 머리말 오른쪽 끝의 모드 고르기. 읽기(글 목록)와 박물관(3D 기록관) 사이를 오간다.
export function ModeMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const current = pathname.startsWith('/museum') ? MODES[1] : MODES[0];

  useEffect(() => {
    // 박물관에 바로 들어온 사람에게는 알릴 필요가 없다
    if (pathname.startsWith('/museum')) return;
    let seen = true;
    try {
      // 검색 안내를 아직 안 봤으면 이번 방문은 그쪽 차례다. 박물관 말풍선은 다음 방문으로 미룬다
      if (localStorage.getItem(TIP_KEY) !== '1') return;
      seen = localStorage.getItem(HINT_KEY) === '1';
      if (!seen) localStorage.setItem(HINT_KEY, '1');
    } catch {}
    if (seen) return;
    // 첫 화면 입장이 끝난 뒤에 띄운다
    const t = window.setTimeout(() => setHint(true), 900);
    return () => window.clearTimeout(t);
    // 첫 방문 한 번만 본다. 경로가 바뀌어도 다시 재지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hint) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHint(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [hint]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="mode" ref={wrap}>
      <button
        type="button"
        className="mode__btn mono"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`모드: ${current.label}`}
        onClick={() => {
          setHint(false);
          setOpen((o) => !o);
        }}
      >
        {/* 좁은 폰에서는 글자 대신 박공지붕 건물 아이콘만 보인다 */}
        <svg className="mode__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M3 9.5 12 4l9 5.5M5 10v8M9.7 10v8M14.3 10v8M19 10v8M3 20h18" />
        </svg>
        <span className="mode__text">
          <span className="mode__label">모드</span> {current.label} <span aria-hidden="true">▾</span>
        </span>
      </button>
      {hint && !open && !pathname.startsWith('/museum') && (
        <div className="mode__hint" role="status">
          <p className="mode__hint-title mono">NEW · 박물관 모드</p>
          <p className="mode__hint-text">블로그를 걸어 다니며 직접 둘러보세요. 부엉이가 글을 찾아 줘요.</p>
          <div className="mode__hint-actions mono">
            <Link href="/museum" className="mode__hint-go" onClick={() => setHint(false)}>
              둘러보기 →
            </Link>
            <button type="button" className="mode__hint-close" onClick={() => setHint(false)}>
              닫기
            </button>
          </div>
        </div>
      )}
      {open && (
        <ul className="mode__menu" role="list">
          {MODES.map((m) => (
            <li key={m.href}>
              <Link
                href={m.href}
                className="mode__item mono"
                aria-current={m === current ? 'page' : undefined}
                onClick={() => setOpen(false)}
              >
                <span>{m.label}</span>
                <small>{m.note}</small>
              </Link>
            </li>
          ))}
          <li className="mode__theme">
            <button
              type="button"
              className="mode__item mono"
              onClick={() => {
                setOpen(false);
                toggleTheme();
              }}
            >
              <span>테마 바꾸기</span>
              <small>밝음·어둠</small>
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
