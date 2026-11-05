'use client';

import { useEffect } from 'react';

// 누를 수 있는 것을 누르면 누른 자리에서 물방울이 번진다.
// 목록 행·카드는 손이 들어온 자리를 --px/--py 로 넘겨, 바탕이 그 점에서부터 물처럼 차오르게 한다.
const RIPPLE = '.row, .liquid__tab, .icon-btn, .next-nav__item, .code__bar button, .playground__legend button';
const FILL = '.row, .next-nav__item';

export function Droplets() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    const onDown = (e: PointerEvent) => {
      if (reduce.matches) return;
      const target = (e.target as Element | null)?.closest<HTMLElement>(RIPPLE);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const size = Math.hypot(rect.width, rect.height) * 2;
      const drop = document.createElement('span');
      drop.className = 'droplet';
      drop.style.left = `${e.clientX - rect.left}px`;
      drop.style.top = `${e.clientY - rect.top}px`;
      drop.style.width = drop.style.height = `${size}px`;
      drop.addEventListener('animationend', () => drop.remove(), { once: true });
      target.appendChild(drop);
    };

    const onOver = (e: PointerEvent) => {
      const target = (e.target as Element | null)?.closest<HTMLElement>(FILL);
      if (!target || target.contains(e.relatedTarget as Node | null)) return;
      const rect = target.getBoundingClientRect();
      target.style.setProperty('--px', `${e.clientX - rect.left}px`);
      target.style.setProperty('--py', `${e.clientY - rect.top}px`);
    };

    document.addEventListener('pointerdown', onDown);
    document.addEventListener('pointerover', onOver);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerover', onOver);
    };
  }, []);

  return (
    // 물방울 층에 거는 goo 필터. 흐리게 번진 가장자리를 알파 대비로 다시 세워 물방울끼리 엉겨 붙게 한다.
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden focusable="false">
      <defs>
        <filter id="goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" />
        </filter>
      </defs>
    </svg>
  );
}
