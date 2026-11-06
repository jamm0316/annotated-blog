// @MX:NOTE: 글 머리·MDX 본문·EOF 를 그리는 async 서버 컴포넌트. 글 페이지와 박물관 두루마리가 함께 쓴다
// @MX:SPEC: .claude/docs/domains/posts.md

import { EndMark } from '@/components/EndMark';
import { formatDate, type PostMeta } from '@/lib/posts';

// 글 본문(머리·MDX·EOF). 글 페이지와 박물관의 읽기 창이 함께 쓴다.
export async function PostArticle({ post }: { post: PostMeta }) {
  // @MX:WARN: 본문 경로는 이 파일 위치 기준 상대 경로이고 앞부분이 고정 문자열이어야 한다
  // @MX:REASON: 번들러가 ../../content/posts/ 아래 MDX 를 이 문자열로 찾아 묶는다. 파일을 옮기거나 경로를 변수로 바꾸면 본문을 못 불러온다
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
      {/* @MX:WARN: data-prose 는 Toc 가 본문을 찾는 표식이다 */}
      {/* @MX:REASON: 지우거나 이름을 바꾸면 목차와 읽은 만큼 차는 선이 사라진다 */}
      <div className="prose" data-prose>
        <Body />
      </div>
      <EndMark />
    </article>
  );
}
