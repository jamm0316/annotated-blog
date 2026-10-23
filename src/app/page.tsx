import Link from 'next/link';
import { formatDate, getPosts, type PostMeta } from '@/lib/posts';

function PostRow({ post }: { post: PostMeta }) {
  return (
    <li>
      <Link href={`/posts/${post.slug}`} className="row">
        <span className="mono row__topic">
          {post.topic}
          {post.lang === 'en' && ' · English'}
        </span>
        <span className="row__main">
          <span className="row__title" lang={post.lang}>
            {post.title}
          </span>
          {post.series && <span className="mono row__series">▸ {post.series}</span>}
        </span>
        <span>{post.badge && <span className="mono badge">{post.badge}</span>}</span>
        <span className="mono row__date">{formatDate(post.date)}</span>
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
        <div className="mono hero__sheet">
          <span>DWG. 000</span>
          <span>목록</span>
          <span>축척 1 : 1</span>
        </div>
        <h1 className="hero__word">Annotated</h1>
        <div className="dimension">
          <span className="dimension__tick" aria-hidden />
          <span className="dimension__line" aria-hidden />
          <p className="dimension__text">구조를 재고, 읽는 사람의 언어로 설명합니다</p>
          <span className="dimension__line" aria-hidden />
          <span className="dimension__tick" aria-hidden />
        </div>
      </section>

      <section id="notes">
        <div className="section-head">
          <h2 className="mono">01 — 기술 노트</h2>
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
            <h2 className="mono">02 — 독후감</h2>
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
