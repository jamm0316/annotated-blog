// @MX:NOTE: Supabase Postgres 연결(POSTGRES_URL)과 방문·조회 표 만들기, 방문자 해시·봇 판별·한국 날짜
// @MX:SPEC: .claude/docs/domains/stats.md
import { createHash } from 'node:crypto';
import postgres from 'postgres';

// Vercel 마켓플레이스의 Supabase 연동이 넣어 주는 POSTGRES_URL 하나로 접속한다(서버 전용).
// 값이 없으면(로컬·CI) null 을 돌려 통계 없이 사이트가 그대로 돌게 한다.
// @MX:WARN: 접속 문자열과 비밀번호를 코드·문서에 옮겨 적지 않는다. Vercel 환경변수에만 둔다
// @MX:REASON: 공개 저장소다(AGENTS.md). 이 값이 있으면 누구든 DB 를 읽고 지울 수 있다
let client: postgres.Sql | null | undefined;

export function db(): postgres.Sql | null {
  if (client !== undefined) return client;
  const raw = process.env.POSTGRES_URL;
  if (!raw) return (client = null);
  const url = new URL(raw);
  const ssl = url.searchParams.get('sslmode') === 'disable' ? false : 'require';
  // Supabase 풀러 주소에 붙는 쿼리(supa=…)는 Postgres 접속 인자로 넘어가면 거절될 수 있어 지운다
  url.search = '';
  client = postgres(url.toString(), {
    ssl,
    // 트랜잭션 풀러(6543)는 prepared statement 를 이어 쓰지 못한다
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 5,
  });
  return client;
}

// 표는 처음 쓸 때 만든다(있으면 그대로). SQL Editor 에서 따로 돌릴 일이 없게 한다.
// public 스키마 표는 Supabase REST API 로도 보이므로 RLS 를 켜 둔다. 정책이 없으니 공개 키(anon)로는 읽지도 쓰지도 못하고,
// 서버의 POSTGRES_URL(표 주인 postgres)만 쓴다.
// @MX:WARN: enable row level security 를 빼지 않는다
// @MX:REASON: 브라우저에 공개된 NEXT_PUBLIC_SUPABASE_ANON_KEY 로 누구나 이 표를 읽고 고칠 수 있게 된다
const SCHEMA = `
create table if not exists site_visits (
  day date not null,
  visitor text not null,
  primary key (day, visitor)
);
create table if not exists post_views (
  slug text not null,
  day date not null,
  visitor text not null,
  primary key (slug, day, visitor)
);
create index if not exists post_views_day on post_views (day);
alter table site_visits enable row level security;
alter table post_views enable row level security;
`;

let ready: Promise<void> | null = null;
export function ensureSchema(sql: postgres.Sql): Promise<void> {
  ready ??= sql.unsafe(SCHEMA).then(
    () => undefined,
    (error) => {
      ready = null;
      throw error;
    },
  );
  return ready;
}

/** 한국 시간 기준 날짜 YYYY-MM-DD. 서버는 UTC 라 9시간을 더해 자른다 */
export function kstDay(offsetDays = 0): string {
  return new Date(Date.now() + 9 * 3_600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

// 같은 사람을 하루 동안만 같은 값으로 묶는 해시. IP·브라우저를 그대로 저장하지 않는다.
// 날짜가 섞여 있어 다음 날에는 다른 값이 되므로 며칠에 걸쳐 한 사람을 따라갈 수 없다.
// 소금은 서버만 아는 POSTGRES_URL 에서 뽑아, 표를 봐도 IP 를 되짚을 수 없게 한다.
export function visitorHash(request: Request, day: string): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
  const ua = request.headers.get('user-agent') ?? '';
  const salt = createHash('sha256').update(process.env.POSTGRES_URL ?? '').digest('hex');
  return createHash('sha256').update(`${salt}|${day}|${ip}|${ua}`).digest('hex').slice(0, 32);
}

const BOT = /bot|crawl|spider|slurp|preview|fetch|headless|lighthouse|monitor|curl|wget|python|axios|node-fetch/i;
/** 검색 로봇·미리보기·스크립트는 세지 않는다 */
export function isBot(request: Request): boolean {
  const ua = request.headers.get('user-agent') ?? '';
  return !ua || BOT.test(ua);
}

/** 다른 사이트의 페이지가 방문자 브라우저로 부르는 것을 막는다(/api/ask 와 같은 검사) */
export function foreignOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return !!origin && new URL(origin).host !== request.headers.get('host');
}
