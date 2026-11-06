// @MX:NOTE: 글 페이지 라우트(/posts/[slug]). 정적 생성, 목차·본문·이어서 읽기를 놓는다
// @MX:SPEC: .claude/docs/domains/posts.md

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextNav } from '@/components/NextNav';
import { PostArticle } from '@/components/PostArticle';
import { Toc } from '@/components/Toc';
import { formatDate, getNeighbours, getPost, getPosts } from '@/lib/posts';

export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

// @MX:WARN: 박물관 가로채기 라우트(app/museum/@reader/(..)posts/[slug])에는 이 값을 옮기지 않는다
// @MX:REASON: 그쪽에서 false 면 컴파일 뒤 더한 새 글이 가로채기에서 404 가 되어 두루마리 대신 글 페이지로 열리던 버그가 있었다
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<'/posts/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    openGraph: { type: 'article', title: post.title, description: post.description, publishedTime: post.date },
  };
}

export default async function PostPage({ params }: PageProps<'/posts/[slug]'>) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const neighbours = getNeighbours(slug);

  return (
    <>
      <div className="post-shell">
        <aside className="post-shell__toc">
          <Toc />
        </aside>
        <PostArticle post={post} />
      </div>

      {neighbours.length > 0 && (
        <NextNav
          items={neighbours.map(({ post: p, reason }) => ({
            slug: p.slug,
            title: p.title,
            description: p.description,
            date: formatDate(p.date),
            reason,
          }))}
        />
      )}
    </>
  );
}
