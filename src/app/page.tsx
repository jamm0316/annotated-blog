// @MX:NOTE: 첫 화면. 글 목록을 클라이언트에 필요한 필드만 남겨 PostBrowser 에 넘긴다. 한 시간마다 다시 그려 BEST·HOT 표식을 붙인다
// @MX:SPEC: .claude/docs/domains/browse.md

import { MuseumDoor } from '@/components/MuseumDoor';
import { PostBrowser } from '@/components/PostBrowser';
import { LAB } from '@/lib/lab';
import { getExhibits } from '@/lib/museum';
import { getPosts } from '@/lib/posts';
import { getPostStats } from '@/lib/stats';

// 조회수 순위는 실시간일 필요가 없어 한 시간마다 다시 만든다(ISR). 방문자는 표식이 이미 붙은 페이지를 받아 화면이 흔들리지 않는다
// @MX:WARN: 값은 정적으로 읽혀야 해서 3600 을 그대로 적는다(60 * 60 은 안 된다)
// @MX:REASON: Next.js 가 빌드 때 이 값을 글자 그대로 읽는다(route segment config)
export const revalidate = 3600;

export default async function Home() {
  const { ranks } = await getPostStats();
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
    rank: ranks[slug] ?? null,
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
