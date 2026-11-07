// @MX:NOTE: POST /api/view. 글을 실제로 읽은 조회를 한 사람·하루·글마다 한 번 기록한다(ViewBeacon)
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
