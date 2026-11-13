// @MX:NOTE: 글(posts)과 연구실(LAB)에서 박물관 진열품(Exhibit)을 만든다
// @MX:SPEC: .claude/docs/domains/museum.md
import { LAB } from '@/lib/lab';
import { getPosts, type Quiz } from '@/lib/posts';
import type { PostStats, Rank } from '@/lib/stats';

// 박물관 모드의 진열품. 글과 연구실 항목에서 자동으로 만든다. 글을 올리면 진열대가 저절로 하나 늘어난다.
export type PropKind =
  | 'db'
  | 'down'
  | 'phone'
  | 'shield'
  | 'scroll'
  | 'key'
  | 'bot'
  | 'branch'
  | 'leaf'
  | 'calendar'
  | 'book'
  | 'monitor';

// @MX:ANCHOR: 박물관 진열품 타입
// @MX:REASON: engine.ts(배치·대화·수첩), Museum.tsx(open), app/museum/page.tsx 가 기댄다. id 는 search 의 id 와 같아야 /api/ask picks 가 진열대에 맞는다
export type Exhibit = {
  /** 검색과 같은 id. 글은 slug, 연구실은 'lab:<repo>' */
  id: string;
  /** note = 기술 노트관, book = 로비 책장, lab = 연구실 별관 */
  hall: 'note' | 'book' | 'lab';
  /** 가까이 가면 뜨는 이름표(10자 이내) */
  short: string;
  title: string;
  topic: string;
  date: string;
  href: string;
  external: boolean;
  /** 유리 돔 안에 놓을 소품 */
  prop: PropKind;
  /** 연재 글이면 이름과 몇 번째인지. 같은 연재 진열대는 바닥 점선으로 잇는다 */
  series: { name: string; no: number; of: number } | null;
  /** 다 읽고 나오면 부엉이가 내는 문제 */
  quiz: Quiz | null;
  /** 가장 최근 글 하나에만 NEW 리본과 조명을 단다 */
  isNew: boolean;
  /** 조회수로 정한 표식(stats 도메인). HOT 은 뚜껑 둘레 빛 테, BEST 는 몸통 금 메달. NEW 인 진열대에는 달지 않는다 */
  rank: Rank | null;
  /** 지금까지 읽은 사람 수. 설명판에만 보인다(진열대에는 새기지 않는다) */
  views: number;
};

// series 는 '캐시 · 2/3' 꼴. 모양이 다르면 연재로 보지 않는다
function seriesOf(series: string): Exhibit['series'] {
  const m = series.match(/^(.+?)\s*·\s*(\d+)\/(\d+)$/);
  return m ? { name: m[1], no: Number(m[2]), of: Number(m[3]) } : null;
}

// 주제마다 진열대 소품을 정한다. 없는 주제는 펼친 책
const PROP_BY_TOPIC: Record<string, PropKind> = {
  캐시: 'db',
  '다운로드 API': 'down',
  '2단계 인증': 'phone',
  '입력 정제': 'shield',
  '감사 로그': 'scroll',
  '권한 모델': 'key',
  'AI 코딩': 'bot',
  Git: 'branch',
  MongoDB: 'leaf',
  '작업 큐': 'db',
  회고: 'calendar',
};

export function getExhibits(): Exhibit[] {
  const all = getPosts();
  const newest = all[0]?.slug;
  const posts: Exhibit[] = all.map((p) => ({
    id: p.slug,
    hall: p.category === 'book' ? 'book' : 'note',
    short: p.short,
    title: p.title,
    topic: p.category === 'book' ? '독후감' : p.topic,
    date: p.date,
    href: `/posts/${p.slug}`,
    external: false,
    prop: p.category === 'book' ? 'book' : (PROP_BY_TOPIC[p.topic] ?? 'book'),
    series: seriesOf(p.series),
    quiz: p.quiz,
    isNew: p.slug === newest,
    rank: null,
    views: 0,
  }));
  const lab: Exhibit[] = LAB.map((item) => ({
    id: `lab:${item.repo}`,
    hall: 'lab',
    short: item.short,
    title: item.title,
    topic: '연구실',
    date: item.date,
    href: item.url ?? `https://github.com/jamm0316/${item.repo}`,
    external: true,
    prop: 'monitor',
    series: null,
    quiz: null,
    isNew: false,
    rank: null,
    views: 0,
  }));
  return [...posts, ...lab];
}

// 조회수 순위를 진열품에 얹는다. 한 진열대에는 표식 하나만: NEW 가 있으면 HOT·BEST 는 달지 않는다
export function withStats(exhibits: Exhibit[], stats: PostStats): Exhibit[] {
  return exhibits.map((e) => ({
    ...e,
    rank: e.isNew ? null : (stats.ranks[e.id] ?? null),
    views: stats.views[e.id] ?? 0,
  }));
}
