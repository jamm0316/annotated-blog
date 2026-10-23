import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ReadingRuler } from '@/components/ReadingRuler';
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

  const { default: Body } = await import(`../../../../content/posts/${slug}/index.mdx`);
  const neighbours = getNeighbours(slug);

  return (
    <>
      <div className="post-shell">
        <aside className="post-shell__ruler">
          <ReadingRuler />
        </aside>
        <article className="article" lang={post.lang}>
          <header className="article__header">
            <div className="mono article__kicker">
              {post.topic && <span className="article__topic">{post.topic}</span>}
              {post.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <h1 className="article__title">{post.title}</h1>
            {post.description && <p className="article__desc">{post.description}</p>}
            <div className="mono article__meta">
              <span>{formatDate(post.date)}</span>
              <span aria-hidden>·</span>
              <span>{post.readingTime}분</span>
              {post.series && (
                <>
                  <span aria-hidden>·</span>
                  <span>▸ {post.series}</span>
                </>
              )}
            </div>
          </header>
          <div className="prose" data-prose>
            <Body />
          </div>
          <p className="mono article__end">
            <span aria-hidden />끝
          </p>
        </article>
      </div>

      {neighbours.length > 0 && (
        <nav className="next-nav" aria-label="이어서 읽을 글">
          <div className="next-nav__inner">
            {neighbours.map(({ post: p, reason }) => (
              <Link key={p.slug} href={`/posts/${p.slug}`} className="next-nav__item">
                <span className="mono">▸ {reason}</span>
                <span className="next-nav__title">{p.title}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
