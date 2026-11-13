'use client';

// @MX:NOTE: 그림이 화면에 처음 들어올 때 한 번만 true 가 되는 훅. 다이어그램 화살표를 한 번 그려 넣는 데 쓴다
// @MX:SPEC: .claude/docs/domains/playgrounds.md

import { useEffect, useRef, useState } from 'react';

// 반복 애니메이션 금지 규칙에 따라 한 번 그려진 뒤에는 다시 돌지 않는다.
export function useDrawOnce<T extends Element>() {
  const ref = useRef<T>(null);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setDrawn(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, drawn };
}
