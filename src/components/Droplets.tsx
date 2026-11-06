'use client';

// @MX:NOTE: 전역 물방울 인터랙션(누른 자리 물방울, 행·카드의 차오르는 바탕)과 goo 필터 #goo. layout.tsx 에서 한 번만 그린다
// @MX:SPEC: .claude/docs/domains/browse.md

import { useEffect } from 'react';

// 누를 수 있는 것을 누르면 누른 자리에서 물방울이 번진다.
// 목록 행·카드는 손이 들어온 자리를 --px/--py 로 넘겨, 바탕이 그 점에서부터 물처럼 차오르게 한다.
// @MX:WARN: 여기 선택자를 더할 때는 globals.css 에서 그 요소에 position: relative; overflow: hidden 도 줘야 한다
// @MX:REASON: .droplet 은 대상 안에 absolute 로 붙어서, 둘이 없으면 물방울이 요소 밖으로 번진다. FILL 대상은 ::before 의 clip-path 가 --px/--py 를 써야 보인다
const RIPPLE = '.row, .lab-card, .liquid__tab, .icon-btn, .search-trigger, .next-nav__item, .code__bar button, .playground__legend button';
const FILL = '.row, .next-nav__item, .lab-card';

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
        {/* @MX:WARN: id goo 는 globals.css 의 .liquid__goo { filter: url(#goo) } 가 쓴다 */}
        {/* @MX:REASON: id 를 바꾸거나 Droplets 를 레이아웃에서 빼면 LiquidTabs·LiquidChips 물방울이 엉겨 붙지 않는다 */}
        <filter id="goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" />
        </filter>
      </defs>
    </svg>
  );
}
