import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { AREAS, type Area } from './areas';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'posts');

export type Category = 'note' | 'book';

/** 박물관에서 글을 다 읽고 나오면 부엉이가 내는 한 문제. 보기 셋, answer 는 0부터 센 정답 위치 */
export type Quiz = { q: string; choices: string[]; answer: number };

export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  category: Category;
  topic: string;
  /** 박물관 진열대에 다가가면 뜨는 이름표. 10자 이내. 없으면 topic */
  short: string;
  /** 기술 노트 2단계 칩. JD 역량 이름(src/lib/areas.ts). 한 글이 여럿에 들 수 있다 */
  areas: Area[];
  series: string;
  /** 목록에 붙는 핵심 수치. 예: `TTFB −96%` */
  badge: string;
  /** YYYY-MM-DD */
  date: string;
  tags: string[];
  /** 본문 언어. 기본 'ko', 영어 글만 'en' */
  lang: string;
  draft: boolean;
  /** 분 단위 예상 읽기 시간 */
  readingTime: number;
  /** 목록 미리보기에 타이핑되는 요약. 에이전트가 본문을 읽고 쓴 핵심 1~2문장 */
  summary: string;
  /** 요약 뒤에 따옴표로 감싸 붙는 본문 인용. 본문 문장을 그대로 옮긴다 */
  hook: string;
  /** summary 가 없을 때 대신 타이핑되는 본문 앞부분. 마크다운·태그를 걷어낸 평문 */
  excerpt: string;
  /** 박물관 퀴즈. 없으면 null */
  quiz: Quiz | null;
};

// 한국어는 글자 수로 센다. 코드 블록과 컴포넌트 태그는 뺀다.
function readingTime(body: string): number {
  const text = body.replace(/```[\s\S]*?```/g, '').replace(/<[^>]+>/g, '');
  return Math.max(1, Math.round(text.replace(/\s/g, '').length / 500));
}

// 본문 앞부분을 평문으로 뽑는다. 코드·표·소제목·그림·컴포넌트 블록은 건너뛴다.
function excerpt(body: string, max = 150): string {
  const text = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter((b) => b && !/^(#|\||<|import |export |!\[|---)/.test(b))
    .map((b) =>
      b
        .replace(/^>\s?/gm, '')
        .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '')
        .replace(/^[—–-]+$/gm, '')
        .replace(/<[^>]+>/g, '')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/[*`]|~~/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    // 글자나 숫자가 하나도 없는 블록(구분선 흉내 등)은 버린다
    .filter((b) => /[\p{L}\p{N}]/u.test(b))
    .join(' ');
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.·:;]+$/, '');
}

// 박물관 이름표는 한 줄에 들어가야 하므로 10자를 넘으면 빌드를 멈춘다
export const SHORT_MAX = 10;
function shortLabel(slug: string, short: unknown, topic: unknown): string {
  const text = String(short ?? topic ?? '').trim();
  if ([...text].length > SHORT_MAX) {
    throw new Error(`[posts] ${slug}/index.mdx 의 short '${text}' 가 ${SHORT_MAX}자를 넘는다.`);
  }
  return text;
}

// 퀴즈가 틀린 모양이면 빌드를 멈춘다. 정답은 본문에 있는 내용이어야 한다(에이전트가 본문을 읽고 쓴다)
function quizOf(slug: string, raw: unknown): Quiz | null {
  if (raw == null) return null;
  const q = raw as { q?: unknown; choices?: unknown; answer?: unknown };
  const choices = Array.isArray(q.choices) ? q.choices.map(String) : [];
  const answer = Number(q.answer);
  if (!q.q || choices.length !== 3 || !Number.isInteger(answer) || answer < 0 || answer > 2) {
    throw new Error(`[posts] ${slug}/index.mdx 의 quiz 는 q, 보기 3개(choices), 0~2 의 answer 가 있어야 한다.`);
  }
  return { q: String(q.q), choices, answer };
}

function readPost(slug: string): PostMeta | null {
  const file = path.join(CONTENT_DIR, slug, 'index.mdx');
  if (!fs.existsSync(file)) return null;

  const { data, content } = matter(fs.readFileSync(file, 'utf8'));
  if (!data.title || !data.date) {
    throw new Error(`[posts] ${slug}/index.mdx 에 title 또는 date 가 없다.`);
  }

  return {
    slug,
    title: String(data.title),
    description: String(data.description ?? ''),
    category: data.category === 'book' ? 'book' : 'note',
    topic: String(data.topic ?? ''),
    short: shortLabel(slug, data.short, data.topic),
    areas: (Array.isArray(data.area) ? data.area.map(String) : []).filter((a: string): a is Area => {
      if ((AREAS as readonly string[]).includes(a)) return true;
      throw new Error(`[posts] ${slug}/index.mdx 의 area '${a}' 는 src/lib/areas.ts 에 없다.`);
    }),
    series: String(data.series ?? ''),
    badge: String(data.badge ?? ''),
    // gray-matter 는 따옴표 없는 날짜를 Date 로 읽는다.
    date: data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    lang: String(data.lang ?? 'ko'),
    draft: Boolean(data.draft),
    readingTime: readingTime(content),
    summary: String(data.summary ?? ''),
    hook: String(data.hook ?? ''),
    excerpt: excerpt(content),
    quiz: quizOf(slug, data.quiz),
  };
}

/** 최신순. 초안은 로컬과 Vercel 미리보기에서만 보인다. */
export function getPosts(category?: Category): PostMeta[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  const showDrafts =
    process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview';

  return fs
    .readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => readPost(e.name))
    .filter((p): p is PostMeta => p !== null)
    .filter((p) => !p.draft || showDrafts)
    .filter((p) => !category || p.category === category)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getPost(slug: string): PostMeta | null {
  const post = readPost(slug);
  if (!post) return null;
  const showDrafts =
    process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview';
  return post.draft && !showDrafts ? null : post;
}

export type Neighbour = { post: PostMeta; reason: string };

/**
 * 다 읽고 이어서 볼 글. 같은 연재의 다음·이전 편을 먼저, 그다음 같은 topic 의 가까운 글을 고른다.
 * series 는 '캐시 · 2/3' 처럼 이름과 순서를 함께 적으므로 ' · ' 앞을 연재 이름으로 본다.
 */
export function getNeighbours(slug: string, limit = 2): Neighbour[] {
  const posts = getPosts();
  const self = posts.find((p) => p.slug === slug);
  if (!self) return [];

  const out: Neighbour[] = [];
  const taken = new Set([slug]);
  const push = (post: PostMeta | undefined, reason: string) => {
    if (!post || taken.has(post.slug) || out.length >= limit) return;
    taken.add(post.slug);
    out.push({ post, reason });
  };

  const seriesName = (p: PostMeta) => p.series.split(' · ')[0];
  if (self.series) {
    // 연재는 오래된 글부터 읽는 순서다.
    const series = posts.filter((p) => p.series && seriesName(p) === seriesName(self)).reverse();
    const i = series.findIndex((p) => p.slug === slug);
    push(series[i + 1], '같은 연재 · 다음 편');
    push(series[i - 1], '같은 연재 · 이전 편');
  }
  if (self.topic) {
    const same = posts.filter((p) => p.topic === self.topic);
    const j = same.findIndex((p) => p.slug === slug);
    push(same[j + 1], `같은 topic · ${self.topic}`);
    push(same[j - 1], `같은 topic · ${self.topic}`);
  }
  // 연재·topic 으로 다 못 채우면 같은 분류에서 날짜가 가까운 글로 채운다. 혼자인 topic 의 글도 끝이 비지 않게 한다.
  const label = self.category === 'book' ? '독후감' : '기술 노트';
  const days = (p: PostMeta) => Math.abs(Date.parse(p.date) - Date.parse(self.date));
  posts
    .filter((p) => p.category === self.category)
    .sort((a, b) => days(a) - days(b))
    .forEach((p) => push(p, `가까운 ${label}`));
  return out;
}

export function formatDate(date: string): string {
  return date.replaceAll('-', '.');
}
