import { PostBrowser } from '@/components/PostBrowser';
import { getPosts } from '@/lib/posts';

export default function Home() {
  // 목록에 필요한 필드만 클라이언트로 넘긴다
  const posts = getPosts().map(({ slug, title, category, topic, series, badge, date, lang, summary, hook, excerpt }) => ({
    slug,
    title,
    category,
    topic,
    series,
    badge,
    date,
    lang,
    summary,
    hook,
    excerpt,
  }));

  return (
    <main className="container">
      <section className="hero">
        <h1 className="hero__word mono">
          evan<span className="accent">.log</span>
          <span className="hero__cursor" aria-hidden />
        </h1>
        <p className="mono hero__sub">백엔드 개발자 Evan 의 기술 노트와 독후감</p>
      </section>

      {posts.length === 0 ? <p className="empty">첫 글을 준비하고 있습니다.</p> : <PostBrowser posts={posts} />}
    </main>
  );
}
