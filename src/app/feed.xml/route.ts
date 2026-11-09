// @MX:NOTE: /feed.xml. 공개 글 전체를 최신순 RSS 2.0 으로 내보낸다. 빌드 때 한 번 만든다(글을 더하면 다음 배포에 반영)
// @MX:SPEC: .claude/docs/domains/shell.md

import { getPosts } from '@/lib/posts';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, postUrl } from '@/lib/site';

export const dynamic = 'force-static';

const CATEGORY = { note: '기술 노트', book: '독후감' } as const;

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** YYYY-MM-DD 를 그날 한국 시각 0시로 본 RFC 822 날짜 */
function pubDate(date: string): string {
  return new Date(`${date}T00:00:00+09:00`).toUTCString();
}

export function GET() {
  const posts = getPosts();
  const items = posts
    .map((p) => {
      const url = postUrl(p.slug);
      const categories = [CATEGORY[p.category], p.topic, ...p.tags].filter(Boolean);
      return [
        '    <item>',
        `      <title>${esc(p.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <pubDate>${pubDate(p.date)}</pubDate>`,
        `      <description>${esc(p.summary || p.description)}</description>`,
        ...categories.map((c) => `      <category>${esc(c)}</category>`),
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_NAME}</title>
    <link>${SITE_URL}</link>
    <description>${esc(SITE_DESCRIPTION)}</description>
    <language>ko</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${posts[0] ? `    <lastBuildDate>${pubDate(posts[0].date)}</lastBuildDate>\n` : ''}${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
