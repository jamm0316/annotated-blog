'use client';
// @MX:NOTE: 글 머리의 '조회 N'. 읽는 시간 옆에 GET /api/view 로 받은 값을 보인다. 글 페이지와 박물관 두루마리가 함께 쓴다(PostArticle)
// @MX:SPEC: .claude/docs/domains/stats.md

import { useEffect, useState } from 'react';

// 숫자는 DB 에 실제로 쌓인 값이다. 받기 전이나 실패하면 아무것도 보이지 않는다(지어낸 0 을 보이지 않는다)
export function ViewCount({ slug }: { slug: string }) {
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/view?slug=${encodeURIComponent(slug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { views?: unknown } | null) => {
        if (alive && typeof data?.views === 'number') setViews(data.views);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [slug]);

  if (views === null) return null;
  return (
    <>
      <span aria-hidden>·</span>
      <span>조회 {views.toLocaleString('ko-KR')}</span>
    </>
  );
}
