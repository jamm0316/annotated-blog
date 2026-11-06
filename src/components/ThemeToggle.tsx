'use client';

// 다크(검정, 기본) ↔ 밝음(크림 바탕 + 남색 글자). 선택은 localStorage 에 남긴다.
// 바꿀 때는 빗방울이 화면 곳곳에 산발적으로 떨어지고, 떨어진 자리마다 새 색이 번져 화면을 덮는다(globals.css 의 rain-n).
// 움직임을 줄인 환경에서는 바로 바뀐다.
const DROPS = 18;

// 좁은 폰에서는 이 버튼을 머리말에서 숨기고 모드 메뉴(ModeMenu)에서 같은 함수를 부른다
export function toggleTheme() {
  {
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

    // 화면을 격자로 나눠 칸마다 한 방울씩, 칸 안에서는 무작위 자리에 떨어뜨린다. 몰리지 않으면서도 불규칙하게 보인다.
    // 떨어지는 순서도 섞는다(CSS 는 n 번째 방울일수록 늦게 떨어진다).
    const cols = 6;
    const rows = Math.ceil(DROPS / cols);
    const cells = Array.from({ length: DROPS }, (_, i) => i).sort(() => Math.random() - 0.5);
    cells.forEach((cell, n) => {
      const x = ((cell % cols) + Math.random()) / cols;
      const y = (Math.floor(cell / cols) + Math.random()) / rows;
      root.style.setProperty(`--rx-${n}`, `${(x * 100).toFixed(1)}%`);
      root.style.setProperty(`--ry-${n}`, `${(y * 100).toFixed(1)}%`);
    });

    // 스냅샷 사이에서 바탕색 페이드가 겹치지 않게, 바뀌는 동안은 전환 효과를 끈다
    root.setAttribute('data-theme-switching', '');
    root.setAttribute('data-theme-rain', '');
    const transition = document.startViewTransition(apply);
    transition.finished.finally(() => {
      root.removeAttribute('data-theme-switching');
      root.removeAttribute('data-theme-rain');
    });
  }
}

export function ThemeToggle() {
  return (
    <button type="button" className="icon-btn theme-btn" aria-label="테마 전환" onClick={toggleTheme}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" />
      </svg>
    </button>
  );
}
