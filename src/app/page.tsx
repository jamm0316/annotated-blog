import Link from 'next/link';
import { formatDate, getPosts, type PostMeta } from '@/lib/posts';

// 목록 한 줄은 로그 한 줄처럼 읽힌다: 날짜 · [주제] · 제목 · 핵심 수치.
function PostRow({ post }: { post: PostMeta }) {
  return (
    <li>
      <Link href={`/posts/${post.slug}`} className="row">
        <span className="mono row__date">{formatDate(post.date)}</span>
        <span className="row__main">
          <span className="mono row__topic">
            [{post.topic}]{post.lang === 'en' && ' English'}
            {post.series && <span className="row__series"> {post.series}</span>}
          </span>
          <span className="row__title" lang={post.lang}>
            {post.title}
          </span>
        </span>
        <span>{post.badge && <span className="mono badge">{post.badge}</span>}</span>
      </Link>
    </li>
  );
}

export default function Home() {
  const notes = getPosts('note');
  const books = getPosts('book');

  return (
    <main className="container">
      <section className="hero">
        <h1 className="hero__word mono">
          evan<span className="accent">.log</span>
          <span className="hero__cursor" aria-hidden />
        </h1>
        <p className="hero__tagline">구조를 재고, 읽는 사람의 언어로 설명합니다</p>
        <p className="mono hero__sub">백엔드 개발자 Evan 의 기술 노트와 독후감</p>
      </section>

      <section id="notes">
        <div className="section-head">
          <h2 className="mono">
            <span className="accent">#</span> 기술 노트
          </h2>
          <span className="mono">{notes.length}편</span>
        </div>
        {notes.length === 0 ? (
          <p className="empty">첫 글을 준비하고 있습니다.</p>
        ) : (
          <ul className="rows">
            {notes.map((p) => (
              <PostRow key={p.slug} post={p} />
            ))}
          </ul>
        )}
      </section>

      {books.length > 0 && (
        <section id="books">
          <div className="section-head">
            <h2 className="mono">
              <span className="accent">#</span> 독후감
            </h2>
            <span className="mono">{books.length}편</span>
          </div>
          <ul className="rows">
            {books.map((p) => (
              <PostRow key={p.slug} post={p} />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
