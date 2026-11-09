// @MX:NOTE: 글별 조회수와 BEST·HOT 순위. 첫 화면·박물관이 한 시간마다 다시 그릴 때(revalidate) 읽는다
// @MX:SPEC: .claude/docs/domains/stats.md
import { db, ensureSchema, kstDay } from '@/lib/db';
import { getPosts } from '@/lib/posts';

export type Rank = 'hot' | 'best';
export type PostStats = {
  /** 글 slug → 지금까지 읽은 사람 수(하루에 한 사람 한 번) */
  views: Record<string, number>;
  /** 글 slug → 붙일 표식. 한 글에는 하나만 */
  ranks: Record<string, Rank>;
};

// 처음 값. 글이 적고 방문이 적을 때 아무 글에나 붙지 않도록 문턱을 둔다. 데이터가 쌓이면 조정한다
// @MX:TODO: 조회 데이터가 몇 주 쌓이면 문턱과 편수를 다시 본다
export const RANK_RULES = {
  /** HOT: 최근 HOT_DAYS 일 조회 상위 HOT_COUNT 편, 그 기간 HOT_MIN 명 이상 */
  HOT_DAYS: 7,
  HOT_COUNT: 3,
  HOT_MIN: 5,
  /** BEST: 누적 조회 상위 BEST_COUNT 편, 누적 BEST_MIN 명 이상. HOT 인 글은 빼고 센다 */
  BEST_COUNT: 3,
  BEST_MIN: 20,
} as const;

const EMPTY: PostStats = { views: {}, ranks: {} };

/** DB 응답을 기다리는 최대 시간. 넘으면 표식 없이 그린다 */
const STATS_TIMEOUT_MS = 4_000;

// DB 가 없거나(로컬 빌드) 실패하거나 늦으면 표식 없이 그린다. 통계 때문에 페이지가 깨지거나 멈추면 안 된다.
// @MX:WARN: 빌드 중(next build)에는 DB 에 붙지 않는다. 첫 화면·박물관은 빈 표식으로 만들고 revalidate(1시간) 때 채운다
// @MX:REASON: 빌드에서 / 와 /museum 이 DB 응답을 기다리다 60초 제한을 세 번 넘겨 운영 배포가 두 번 실패했다(실제 겪은 버그)
export async function getPostStats(): Promise<PostStats> {
  if (process.env.NEXT_PHASE === 'phase-production-build') return EMPTY;
  const sql = db();
  if (!sql) return EMPTY;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<PostStats>((resolve) => {
    timer = setTimeout(() => {
      console.error('[stats] DB 응답이 늦어 표식 없이 그린다');
      resolve(EMPTY);
    }, STATS_TIMEOUT_MS);
  });
  try {
    return await Promise.race([readStats(sql), late]);
  } finally {
    clearTimeout(timer);
  }
}

async function readStats(sql: NonNullable<ReturnType<typeof db>>): Promise<PostStats> {
  try {
    await ensureSchema(sql);
    const since = kstDay(-(RANK_RULES.HOT_DAYS - 1));
    const [total, recent] = await Promise.all([
      sql<{ slug: string; n: number }[]>`select slug, count(*)::int as n from post_views group by slug`,
      sql<{ slug: string; n: number }[]>`select slug, count(*)::int as n from post_views where day >= ${since} group by slug`,
    ]);
    // 지운 글·초안은 빼고 지금 공개된 글만 본다
    const live = new Set(getPosts().map((p) => p.slug));
    const views: Record<string, number> = {};
    for (const r of total) if (live.has(r.slug)) views[r.slug] = r.n;

    const ranks: Record<string, Rank> = {};
    recent
      .filter((r) => live.has(r.slug) && r.n >= RANK_RULES.HOT_MIN)
      .sort((a, b) => b.n - a.n)
      .slice(0, RANK_RULES.HOT_COUNT)
      .forEach((r) => (ranks[r.slug] = 'hot'));
    Object.entries(views)
      .filter(([slug, n]) => !ranks[slug] && n >= RANK_RULES.BEST_MIN)
      .sort((a, b) => b[1] - a[1])
      .slice(0, RANK_RULES.BEST_COUNT)
      .forEach(([slug]) => (ranks[slug] = 'best'));
    return { views, ranks };
  } catch (error) {
    console.error('[stats]', error);
    return EMPTY;
  }
}
