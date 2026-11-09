// @MX:NOTE: /robots.txt. 모두 허용하고 API 만 막는다. sitemap 주소를 알린다
// @MX:SPEC: .claude/docs/domains/shell.md

import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
