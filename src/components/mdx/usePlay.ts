'use client';

// @MX:NOTE: 그림을 스스로 한 번 재생하는 훅. 화면에 처음 들어오면 자동으로, 장면 버튼을 누르면 처음부터 다시 재생한다
// @MX:SPEC: .claude/docs/domains/playgrounds.md

import { useCallback, useEffect, useRef, useState } from 'react';

// step 은 지금까지 보여 준 장면 수(0~total). 끝까지 가면 멈추고 반복하지 않는다(반복 애니메이션 금지).
// prefers-reduced-motion 이면 움직이지 않고 바로 마지막 장면을 보여 준다.
export function usePlay<T extends Element>(total: number, ms: number) {
  const ref = useRef<T>(null);
  const [run, setRun] = useState(0);
  const [step, setStep] = useState(0);

  const play = useCallback(() => {
    setStep(0);
    setRun((r) => r + 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          play();
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [play]);

  useEffect(() => {
    if (run === 0) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const id = setTimeout(() => setStep(total), 0);
      return () => clearTimeout(id);
    }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setStep(i);
      if (i >= total) clearInterval(id);
    }, ms);
    return () => clearInterval(id);
  }, [run, total, ms]);

  return { ref, step, play, done: run > 0 && step >= total };
}
