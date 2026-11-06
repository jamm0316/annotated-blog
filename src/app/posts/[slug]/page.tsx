import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextNav } from '@/components/NextNav';
import { PostArticle } from '@/components/PostArticle';
import { Toc } from '@/components/Toc';
import { formatDate, getNeighbours, getPost, getPosts } from '@/lib/posts';

export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

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
