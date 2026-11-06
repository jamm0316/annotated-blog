import { EndMark } from '@/components/EndMark';
import { formatDate, type PostMeta } from '@/lib/posts';

// 글 본문(머리·MDX·EOF). 글 페이지와 박물관의 읽기 창이 함께 쓴다.
export async function PostArticle({ post }: { post: PostMeta }) {
  const { default: Body } = await import(`../../content/posts/${post.slug}/index.mdx`);
  return (
    <article className="article" lang={post.lang}>
      <header className="article__header">
        <div className="mono article__kicker">
          {post.topic && <span className="article__topic">[{post.topic}]</span>}
          {post.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
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
              <span>{post.series}</span>
            </>
          )}
        </div>
      </header>
      <div className="prose" data-prose>
        <Body />
      </div>
      <EndMark />
    </article>
  );
}
