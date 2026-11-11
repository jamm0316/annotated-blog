// @MX:NOTE: 박물관 두루마리 라우트(/museum/read/<slug>). @reader 슬롯에서 Reader 안에 PostArticle 을 띄운다
// @MX:SPEC: .claude/docs/domains/museum.md
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PostArticle } from '@/components/PostArticle';
import { Reader } from '@/components/museum/Reader';
import { getPost, getPosts } from '@/lib/posts';
import { postUrl } from '@/lib/site';

// 박물관에서 '글 읽기'를 고르면 이 주소로 소프트 이동해 장면 위 두루마리에 글을 띄운다.
// @MX:WARN: 두루마리 주소를 글 페이지 주소(/posts/<slug>)와 겹치게 하지 않는다. 가로채기 라우트((..)posts)로 되돌리지 말 것
// @MX:REASON: 같은 주소가 화면 둘(글 페이지·두루마리)을 가리키면, 첫 화면이 미리 받아 둔 /posts/<slug> 의 '글 페이지' 구조를
// Next 클라이언트 캐시가 박물관에서도 서버에 묻지 않고 그대로 써서 두루마리 대신 글 페이지로 넘어갔다. 첫 화면에 보이는
// 최신 글(=기술 노트관 맨 윗줄)에서만 났고, ?from=museum·optimisticRouting 끄기로 두 번 막았지만 Next 캐시 방식이 바뀔 때마다
// 다시 났다(실제 겪은 버그). 주소가 다르면 어떤 캐시도 둘을 헷갈릴 수 없다.
export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

// @MX:WARN: 여기에 `export const dynamicParams = false` 를 더하지 않는다(글 페이지와 맞추지 말 것)
// @MX:REASON: 컴파일 뒤 더한 글은 캐시된 generateStaticParams 에 없어 404 가 됐다(실제 겪은 버그). 없는 글은 아래 getPost 가 notFound 로 막는다

// 이 주소는 박물관 안에서만 쓴다. 검색 로봇에는 원래 글 주소를 알려 주고 색인하지 않게 한다
// (새로고침·공유한 주소는 next.config.ts 의 redirects 가 글 페이지로 돌려보낸다)
export async function generateMetadata({ params }: PageProps<'/museum/read/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: postUrl(slug) },
    robots: { index: false, follow: true },
  };
}

export default async function MuseumReader({ params }: PageProps<'/museum/read/[slug]'>) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  return (
    <Reader key={slug} id={slug} title={post.title} href={`/posts/${slug}`} hasQuiz={!!post.quiz}>
      <PostArticle post={post} />
    </Reader>
  );
}
