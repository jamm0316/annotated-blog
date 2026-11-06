// @MX:NOTE: 첫 화면. 글 목록을 클라이언트에 필요한 필드만 남겨 PostBrowser 에 넘긴다
// @MX:SPEC: .claude/docs/domains/browse.md

import { MuseumDoor } from '@/components/MuseumDoor';
import { PostBrowser } from '@/components/PostBrowser';
import { LAB } from '@/lib/lab';
import { getExhibits } from '@/lib/museum';
import { getPosts } from '@/lib/posts';

export default function Home() {
  // 목록에 필요한 필드만 클라이언트로 넘긴다
  const posts = getPosts().map(({ slug, title, category, topic, areas, series, badge, date, lang, summary, hook, excerpt }) => ({
    slug,
    title,
    category,
    topic,
    areas,
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
        <div className="hero__intro">
          <h1 className="hero__word mono">
            evan<span className="accent">.log</span>
            <span className="hero__cursor" aria-hidden />
          </h1>
          <p className="mono hero__sub">백엔드 개발자 Evan 의 기술 노트와 독후감</p>
        </div>
        {/* 머리말 모드 메뉴 안에만 있던 박물관 모드를 첫 화면에서도 보이게 한다 */}
        <MuseumDoor count={getExhibits().length} />
      </section>

      {posts.length === 0 ? <p className="empty">첫 글을 준비하고 있습니다.</p> : <PostBrowser posts={posts} lab={LAB} />}
    </main>
  );
}
