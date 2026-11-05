'use client';

import { useEffect, useState } from 'react';

type Item = { id: string; label: string; major: boolean };

// 본문 소제목 목차. 지금 읽는 소제목은 주황으로 표시하고, 왼쪽 선이 읽은 만큼 차오른다.
// 지금 읽는 소제목에는 본문 쪽에도 data-current 를 달아 표시한다. 목차가 숨는 좁은 화면에서도 위치가 보인다.
export function Toc() {
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState(-1);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const prose = document.querySelector<HTMLElement>('[data-prose]');
    if (!prose) return;
    const heads = Array.from(prose.querySelectorAll<HTMLElement>('h2[id], h3[id]'));
    const collect = () =>
      setItems(heads.map((h) => ({ id: h.id, label: h.textContent ?? '', major: h.tagName === 'H2' })));

    const onScroll = () => {
      const line = window.innerHeight * 0.3;
      let current = -1;
      heads.forEach((h, i) => {
        if (h.getBoundingClientRect().top <= line) current = i;
      });
      setActive(current);
      heads.forEach((h, i) => h.toggleAttribute('data-current', i === current));
      const rect = prose.getBoundingClientRect();
      setProgress(Math.min(1, Math.max(0, (line - rect.top) / (rect.height || 1))));
    };

    collect();
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      heads.forEach((h) => h.removeAttribute('data-current'));
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <nav className="toc" aria-label="목차">
      <p className="mono toc__heading">목차</p>
      <div className="toc__body">
        <span className="toc__track" aria-hidden>
          <span className="toc__fill" style={{ transform: `scaleY(${progress})` }} />
        </span>
        <ol>
          {items.map((t, i) => (
            <li key={t.id} className={`toc__item${t.major ? '' : ' is-minor'}${i === active ? ' is-active' : ''}`}>
              <a href={`#${t.id}`} aria-current={i === active ? 'location' : undefined}>
                {t.label}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
