import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'posts');

export type Category = 'note' | 'book';

export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  category: Category;
  topic: string;
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
};

// 한국어는 글자 수로 센다. 코드 블록과 컴포넌트 태그는 뺀다.
function readingTime(body: string): number {
  const text = body.replace(/```[\s\S]*?```/g, '').replace(/<[^>]+>/g, '');
  return Math.max(1, Math.round(text.replace(/\s/g, '').length / 500));
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
    series: String(data.series ?? ''),
    badge: String(data.badge ?? ''),
    // gray-matter 는 따옴표 없는 날짜를 Date 로 읽는다.
    date: data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    lang: String(data.lang ?? 'ko'),
    draft: Boolean(data.draft),
    readingTime: readingTime(content),
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

export function formatDate(date: string): string {
  return date.replaceAll('-', '.');
}
