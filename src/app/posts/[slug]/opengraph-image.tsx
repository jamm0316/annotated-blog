// @MX:NOTE: 글마다 링크 미리보기 카드. [주제]·제목·날짜·읽는 시간·배지를 로그 한 줄처럼 그린다
// @MX:SPEC: .claude/docs/domains/posts.md

import { OG_SIZE, renderOg } from '@/lib/og';
import { formatDate, getPost, getPosts } from '@/lib/posts';

export const alt = 'evan.log 글 미리보기';
export const size = OG_SIZE;
export const contentType = 'image/png';

export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return renderOg({ title: 'evan.log' });
  return renderOg({
    kicker: post.topic,
    title: post.title,
    meta: `${formatDate(post.date)} · ${post.readingTime}분`,
    badge: post.badge,
  });
}
