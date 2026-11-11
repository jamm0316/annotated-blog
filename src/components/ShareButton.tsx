'use client';
// @MX:NOTE: 글 머리 오른쪽 끝 '공유' 버튼. 공유 시트가 있으면(주로 휴대폰) 띄우고, 없으면 주소를 클립보드에 복사한다
// @MX:SPEC: .claude/docs/domains/posts.md

import { useEffect, useRef, useState } from 'react';

type State = 'idle' | 'copied' | 'failed';

/** '복사됨'·'복사 실패' 를 보여 주는 시간 */
const FEEDBACK_MS = 2_000;

// url 은 서버에서 만든 운영 절대 주소를 받는다. 지금 주소창을 쓰면 박물관 두루마리 주소(/museum/read/<slug>)나 미리보기 도메인이 공유된다
export function ShareButton({ url, title }: { url: string; title: string }) {
  const [state, setState] = useState<State>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const show = (next: State) => {
    setState(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), FEEDBACK_MS);
  };

  const share = async () => {
    // 휴대폰처럼 공유 시트가 있는 곳만 쓴다. 데스크톱 시트는 메신저 목록이 빈약해 복사가 더 쓸모 있다
    const touch = window.matchMedia('(pointer: coarse)').matches;
    if (touch && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        // 사용자가 시트를 닫은 것은 실패가 아니다
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      show('copied');
    } catch {
      show('failed');
    }
  };

  return (
    <button type="button" className="share-button mono" onClick={share} aria-live="polite">
      {state === 'copied' ? '링크 복사됨' : state === 'failed' ? '복사 실패' : '공유'}
    </button>
  );
}
