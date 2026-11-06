'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toggleTheme } from './ThemeToggle';

const MODES = [
  { href: '/', label: '읽기', note: '글 목록' },
  { href: '/museum', label: '박물관', note: '3D 기록관' },
] as const;

// 머리말 오른쪽 끝의 모드 고르기. 읽기(글 목록)와 박물관(3D 기록관) 사이를 오간다.
export function ModeMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const current = pathname.startsWith('/museum') ? MODES[1] : MODES[0];

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
        onClick={() => setOpen((o) => !o)}
      >
        {/* 좁은 폰에서는 글자 대신 박공지붕 건물 아이콘만 보인다 */}
        <svg className="mode__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M3 9.5 12 4l9 5.5M5 10v8M9.7 10v8M14.3 10v8M19 10v8M3 20h18" />
        </svg>
        <span className="mode__text">
          <span className="mode__label">모드</span> {current.label} <span aria-hidden="true">▾</span>
        </span>
      </button>
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
