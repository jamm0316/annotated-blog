// @MX:NOTE: POST /api/view 는 글을 실제로 읽은 조회를 한 사람·하루·글마다 한 번 기록하고(ViewBeacon), GET 은 글의 조회수를 돌려준다(ViewCount)
// @MX:SPEC: .claude/docs/domains/stats.md
import { db, ensureSchema, foreignOrigin, isBot, kstDay, visitorHash } from '@/lib/db';
import { getPosts } from '@/lib/posts';

// @MX:ANCHOR: 요청 { slug } · 응답 204 | { error } 계약
// @MX:REASON: ViewBeacon 이 이 모양으로 보낸다. 지금 공개된 글 slug 만 받는다
export async function POST(request: Request) {
  if (foreignOrigin(request)) return Response.json({ error: '허용되지 않은 요청입니다.' }, { status: 403 });
  let slug = '';
  try {
    const body = (await request.json()) as { slug?: unknown };
    slug = typeof body.slug === 'string' ? body.slug : '';
  } catch {}
  // 아무 문자열이나 쌓이지 않게 지금 공개된 글만 센다
  if (!getPosts().some((p) => p.slug === slug)) return Response.json({ error: '없는 글입니다.' }, { status: 400 });
  if (isBot(request)) return new Response(null, { status: 204 });
  const sql = db();
  if (!sql) return new Response(null, { status: 204 });
  try {
    await ensureSchema(sql);
    const day = kstDay();
    await sql`insert into post_views (slug, day, visitor) values (${slug}, ${day}, ${visitorHash(request, day)}) on conflict do nothing`;
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('[view]', error);
    return Response.json({ error: '지금은 셀 수 없습니다.' }, { status: 502 });
  }
}

// @MX:ANCHOR: GET /api/view?slug= · 응답 { views } | { error } 계약
// @MX:REASON: ViewCount(글 머리 조회수)가 이 모양으로 읽는다. views = 지금까지 읽은 사람 수(하루에 한 사람 한 번)
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get('slug') ?? '';
  if (!getPosts().some((p) => p.slug === slug)) return Response.json({ error: '없는 글입니다.' }, { status: 400 });
  const sql = db();
  if (!sql) return Response.json({ error: '조회수를 읽을 수 없습니다.' }, { status: 503 });
  try {
    await ensureSchema(sql);
    const [row] = await sql<{ n: number }[]>`select count(*)::int as n from post_views where slug = ${slug}`;
    // 같은 글을 여러 사람이 열어도 DB 를 매번 읽지 않게 CDN 에 1분 둔다
    return Response.json({ views: row?.n ?? 0 }, { headers: { 'cache-control': 'public, s-maxage=60, stale-while-revalidate=300' } });
  } catch (error) {
    console.error('[view]', error);
    return Response.json({ error: '지금은 읽을 수 없습니다.' }, { status: 502 });
  }
}
