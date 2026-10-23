'use client';

import { useEffect, useState } from 'react';

type Tick = { id: string; label: string; major: boolean; at: number };

// 본문 소제목을 눈금으로 옮긴 세로 자. 지금 읽는 소제목에 ▸ 가 붙는다.
// 눈금 위치는 본문 안에서 소제목이 놓인 비율이다.
export function ReadingRuler() {
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const prose = document.querySelector<HTMLElement>('[data-prose]');
    if (!prose) return;
    const heads = Array.from(prose.querySelectorAll<HTMLElement>('h2[id], h3[id]'));

    const measure = () => {
      const top = prose.getBoundingClientRect().top + window.scrollY;
      const height = prose.offsetHeight || 1;
      let section = 0;
      setTicks(
        heads.map((h) => {
          const major = h.tagName === 'H2';
          if (major) section += 1;
          const at = (h.getBoundingClientRect().top + window.scrollY - top) / height;
          return {
            id: h.id,
            label: major ? `§${section} ${h.textContent ?? ''}` : (h.textContent ?? ''),
            major,
            at: Math.min(1, Math.max(0, at)),
          };
        }),
      );
    };

    const onScroll = () => {
      const line = window.innerHeight * 0.3;
      let current = -1;
      heads.forEach((h, i) => {
        if (h.getBoundingClientRect().top <= line) current = i;
      });
      setActive(current);
    };

    measure();
    onScroll();
    const ro = new ResizeObserver(measure);
    ro.observe(prose);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  if (ticks.length === 0) return null;

  return (
    <nav className="ruler" aria-label="소제목">
      <ol>
        {ticks.map((t, i) => (
          <li
            key={t.id}
            className={`ruler__tick${t.major ? ' is-major' : ''}${i === active ? ' is-active' : ''}`}
            style={{ top: `${t.at * 100}%` }}
          >
            <a href={`#${t.id}`} className="mono">
              <span className="ruler__label">{t.label}</span>
              <span className="ruler__marker" aria-hidden>
                {i === active ? '▸' : ''}
              </span>
              <span className="ruler__line" aria-hidden />
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
