// @MX:NOTE: 박물관에서 /posts/<slug> 를 가로채 Reader(두루마리) 안에 PostArticle 을 띄운다
// @MX:SPEC: .claude/docs/domains/museum.md
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

// @MX:WARN: 여기에 `export const dynamicParams = false` 를 더하지 않는다(글 페이지와 맞추지 말 것)
// @MX:REASON: 컴파일 뒤 더한 글은 캐시된 generateStaticParams 에 없어 가로채기가 404 → 글 페이지로 넘어갔다(실제 겪은 버그)
// dynamicParams 를 false 로 두지 않는다. 이 라우트가 한 번 컴파일된 뒤 더한 글은 generateStaticParams 의
// 캐시된 목록에 없어 가로채기가 404 가 되고, Next 는 가로채기를 포기하고 글 페이지로 바로 넘어간다
// (새 글만 두루마리가 아니라 글 페이지로 열리던 버그). 없는 글은 아래 getPost 가 notFound 로 막는다.

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
    <Reader key={slug} id={slug} title={post.title} href={`/posts/${slug}`} hasQuiz={!!post.quiz}>
      <PostArticle post={post} />
    </Reader>
  );
}
