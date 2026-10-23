import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { formatDate, getPost, getPosts } from '@/lib/posts';

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

  return (
    <main className="container">
      <article className="article">
        <header className="article__header">
          <div className="mono article__kicker">
            {post.topic && <span>{post.topic}</span>}
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
        <div className="prose">
          <Body />
        </div>
      </article>
    </main>
  );
}
