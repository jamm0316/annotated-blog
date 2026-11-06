import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PostArticle } from '@/components/PostArticle';
import { Reader } from '@/components/museum/Reader';
import { getPost, getPosts } from '@/lib/posts';

// 박물관에서 '글 읽기'를 고르면 /posts/<slug> 를 가로채 장면 위 읽기 창에 띄운다.
// 주소는 글 주소로 바뀌므로 새로고침하거나 주소를 공유하면 원래 글 페이지가 열린다.
export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<'/posts/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  return post ? { title: post.title, description: post.description } : {};
}

export default async function MuseumReader({ params }: PageProps<'/posts/[slug]'>) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  return (
    <Reader key={slug} id={slug} title={post.title} href={`/posts/${slug}`}>
      <PostArticle post={post} />
    </Reader>
  );
}
