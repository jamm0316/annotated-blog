// @MX:NOTE: POST /api/visit. 오늘 방문을 한 사람 한 번 기록하고 오늘·누적 방문자 수를 돌려준다(바닥글 VisitCounter)
// @MX:SPEC: .claude/docs/domains/stats.md
import { db, ensureSchema, foreignOrigin, isBot, kstDay, visitorHash } from '@/lib/db';

// @MX:ANCHOR: 응답 { today, total } | { error } 계약
// @MX:REASON: VisitCounter 가 이 모양을 그대로 읽는다
export async function POST(request: Request) {
  if (foreignOrigin(request)) return Response.json({ error: '허용되지 않은 요청입니다.' }, { status: 403 });
  const sql = db();
  if (!sql) return Response.json({ error: '통계를 쓰지 않는 환경입니다.' }, { status: 503 });
  try {
    await ensureSchema(sql);
    const day = kstDay();
    // 로봇은 세지 않고 숫자만 돌려준다. 같은 사람이 같은 날 다시 와도 한 줄만 남는다
    if (!isBot(request)) {
      await sql`insert into site_visits (day, visitor) values (${day}, ${visitorHash(request, day)}) on conflict do nothing`;
    }
    const [row] = await sql<{ today: number; total: number }[]>`
      select count(*) filter (where day = ${day})::int as today, count(*)::int as total from site_visits`;
    return Response.json({ today: row.today, total: row.total });
  } catch (error) {
    console.error('[visit]', error);
    return Response.json({ error: '지금은 셀 수 없습니다.' }, { status: 502 });
  }
}
