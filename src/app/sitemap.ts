// @MX:NOTE: /sitemap.xml. 첫 화면·박물관과 공개 글 주소를 검색엔진에 알린다. 빌드 때 한 번 만든다
// @MX:SPEC: .claude/docs/domains/shell.md

import type { MetadataRoute } from 'next';
import { getPosts } from '@/lib/posts';
import { SITE_URL, postUrl } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getPosts();
  const latest = posts[0]?.date;
  return [
    { url: SITE_URL, lastModified: latest },
    { url: `${SITE_URL}/museum`, lastModified: latest },
    ...posts.map((p) => ({ url: postUrl(p.slug), lastModified: p.date })),
  ];
}
