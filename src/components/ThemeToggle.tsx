'use client';

import type { MouseEvent } from 'react';

// 다크(검정, 기본) ↔ 밝음(남색 + 크림). 선택은 localStorage 에 남긴다.
// 밝음을 켜면 누른 단추 자리에서 촛불이 켜지듯 빛이 천천히 번지고, 끄면 단추 쪽으로 오므라들며 꺼진다.
// 움직임을 줄인 환경에서는 바로 바뀐다.
export function ThemeToggle() {
  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    const root = document.documentElement;
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    const apply = () => {
      if (next === 'light') root.dataset.theme = 'light';
      else delete root.dataset.theme;
    };
    try {
      localStorage.setItem('theme', next);
    } catch {}

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !document.startViewTransition) {
      apply();
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    // 단추에서 가장 먼 화면 모서리까지 닿는 반지름
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    root.style.setProperty('--theme-x', `${x}px`);
    root.style.setProperty('--theme-y', `${y}px`);
    root.style.setProperty('--theme-r', `${r}px`);

    // 스냅샷 사이에서 바탕색 페이드가 겹치지 않게, 바뀌는 동안은 전환 효과를 끈다
    root.setAttribute('data-theme-switching', '');
    root.dataset.themeDir = next;
    const transition = document.startViewTransition(apply);
    transition.finished.finally(() => {
      root.removeAttribute('data-theme-switching');
      delete root.dataset.themeDir;
    });
  };

  return (
    <button type="button" className="icon-btn" aria-label="테마 전환" onClick={toggle}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" />
      </svg>
    </button>
  );
}
