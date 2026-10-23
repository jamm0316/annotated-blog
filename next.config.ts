import createMDX from '@next/mdx';
import type { NextConfig } from 'next';
import { createCssVariablesTheme } from 'shiki';

// cacheComponents 는 쓰지 않는다. 켜면 공개 글이 0편일 때 generateStaticParams 가 빈 배열이라 빌드가 실패한다.
const nextConfig: NextConfig = {
  pageExtensions: ['ts', 'tsx', 'mdx'],
};

// Turbopack 은 플러그인 옵션을 직렬화해서 넘기므로 플러그인을 import 하지 않고 이름 문자열로 적는다.
const withMDX = createMDX({
  options: {
    remarkPlugins: [['remark-frontmatter'], ['remark-gfm']],
    rehypePlugins: [
      ['rehype-slug'],
      [
        'rehype-pretty-code',
        {
          // 코드 색은 CSS 변수(--code-*)로 받아 globals.css 의 남색·베이지 토큰에서 정한다.
          theme: createCssVariablesTheme({ name: 'annotated', variablePrefix: '--code-' }),
          defaultLang: 'text',
          keepBackground: false,
        },
      ],
    ],
  },
});

export default withMDX(nextConfig);
