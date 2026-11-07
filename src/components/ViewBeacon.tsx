'use client';
// @MX:NOTE: 글을 실제로 읽었을 때만 조회 한 번을 /api/view 로 보낸다. 글 페이지와 박물관 두루마리가 함께 쓴다(PostArticle)
// @MX:SPEC: .claude/docs/domains/stats.md

import { useEffect } from 'react';

/** 탭이 보이는 동안 이만큼 머물러야 읽은 것으로 센다. 들어왔다 바로 나간 것과 로봇을 거른다 */
const READ_MS = 10_000;

export function ViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    let spent = 0;
    let last = performance.now();
    let sent = false;
    const tick = () => {
      const now = performance.now();
      if (document.visibilityState === 'visible') spent += now - last;
      last = now;
      if (!sent && spent >= READ_MS) {
        sent = true;
        window.clearInterval(timer);
        fetch('/api/view', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ slug }),
          keepalive: true,
        }).catch(() => {});
      }
    };
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [slug]);
  return null;
}
