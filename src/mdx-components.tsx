import type { ComponentProps } from 'react';
import type { MDXComponents } from 'mdx/types';
import { CodeBlock } from '@/components/mdx/CodeBlock';
import { Figure } from '@/components/mdx/Figure';
import { LoaderPlayground } from '@/components/mdx/LoaderPlayground';

// 글 안에서 import 없이 쓰는 컴포넌트를 여기에 등록한다.
// pre·table 은 마크다운이 만든 태그를 바꿔 끼운다.
const components: MDXComponents = {
  Figure,
  LoaderPlayground,
  pre: CodeBlock,
  table: (props: ComponentProps<'table'>) => (
    <div className="table-wrap">
      <table {...props} />
    </div>
  ),
};

export function useMDXComponents(): MDXComponents {
  return components;
}
