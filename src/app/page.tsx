import Link from 'next/link';
import { formatDate, getPosts, type PostMeta } from '@/lib/posts';

function PostRow({ post }: { post: PostMeta }) {
  return (
    <li>
      <Link href={`/posts/${post.slug}`} className="row">
        <span className="mono row__topic">{post.topic}</span>
        <span className="row__main">
          <span className="row__title">{post.title}</span>
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
        <h1 className="hero__word">Annotated</h1>
        <p className="hero__tagline">구조를 재고, 읽는 사람의 언어로 설명합니다</p>
      </section>

      <section>
        <h2 className="mono section-head">01 — 기술 노트</h2>
        <ul className="rows">
          {notes.map((p) => (
            <PostRow key={p.slug} post={p} />
          ))}
        </ul>
      </section>

      {books.length > 0 && (
        <section>
          <h2 className="mono section-head">02 — 독후감</h2>
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
