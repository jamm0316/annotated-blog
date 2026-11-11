import path from 'node:path';
import createMDX from '@next/mdx';
import type { NextConfig } from 'next';
import { createCssVariablesTheme } from 'shiki';

// cacheComponents 는 쓰지 않는다. 켜면 공개 글이 0편일 때 generateStaticParams 가 빈 배열이라 빌드가 실패한다.
const nextConfig: NextConfig = {
  pageExtensions: ['ts', 'tsx', 'mdx'],
  // 자연어 검색·조회수 API 는 요청 때 글 목록을 읽으므로 글 파일을 함수에 함께 싣는다
  outputFileTracingIncludes: {
    '/api/ask': ['./content/posts/**/*.mdx'],
    '/api/view': ['./content/posts/**/*.mdx'],
  },
  // 박물관 두루마리 주소(/museum/read/<slug>)는 박물관 안 소프트 이동에서만 쓴다.
  // 새로고침하거나 공유한 주소로 바로 열면(문서 요청) 원래 글 페이지로 보낸다.
  // @MX:WARN: missing 의 rsc 조건을 빼지 않는다
  // @MX:REASON: 박물관 안의 이동(RSC 요청, 헤더 `rsc: 1`)까지 글 페이지로 돌려보내 두루마리가 뜨지 않는다
  async redirects() {
    return [
      {
        source: '/museum/read/:slug',
        missing: [{ type: 'header', key: 'rsc' }],
        destination: '/posts/:slug',
        permanent: false,
      },
    ];
  },
};

// Turbopack 은 플러그인 옵션을 직렬화해서 넘기므로 플러그인을 import 하지 않고 이름 문자열로 적는다.
const withMDX = createMDX({
  options: {
    // 로컬 플러그인도 같은 이유로 절대 경로 문자열로 넘긴다. 빌드는 프로젝트 루트에서 돈다.
    remarkPlugins: [
      ['remark-frontmatter'],
      ['remark-gfm'],
      [path.join(process.cwd(), 'src/lib/remark-unnest-links.mjs')],
    ],
    rehypePlugins: [
      ['rehype-slug'],
      [
        'rehype-pretty-code',
        {
          // 코드 색은 CSS 변수(--code-*)로 받아 globals.css 의 토큰에서 정한다.
          theme: createCssVariablesTheme({ name: 'evan-log', variablePrefix: '--code-' }),
          defaultLang: 'text',
          keepBackground: false,
        },
      ],
    ],
  },
});

export default withMDX(nextConfig);
