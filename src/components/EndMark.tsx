'use client';

import { useEffect, useRef, useState } from 'react';

// 본문 끝 표시. 화면에 들어오면 점이 가로선으로 늘어나고 '끝'이 선 끝에 놓인다.
export function EndMark() {
  const ref = useRef<HTMLParagraphElement>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setDrawn(true);
        io.disconnect();
      },
      { rootMargin: '0px 0px -20% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <p ref={ref} className={`mono end-mark${drawn ? ' is-drawn' : ''}`}>
      <span className="end-mark__line" aria-hidden />
      <span className="end-mark__word">끝</span>
    </p>
  );
}
