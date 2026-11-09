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
  experimental: {
    // @MX:WARN: 켜 두면 박물관 '글 읽기'가 두루마리 대신 글 페이지로 넘어간다(실제 겪은 버그)
    // @MX:REASON: 낙관적 라우팅은 첫 화면이 미리 받은 /posts/<slug> 로 '/posts/[slug] 는 가로채기 없음'을 외워
    // 박물관에서 연 다른 글도 서버에 묻지 않고 글 페이지 구조로 그린다. Vercel 의 미리 만든 응답 Vary 에 Next-Url 이
    // 없어 이 패턴이 가로챌 수 있는 주소라는 것도 알 수 없다. ?from=museum 은 같은 주소 캐시만 피하고 이 추측은 못 막는다.
    optimisticRouting: false,
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
