// @MX:NOTE: 글 MDX 안에서 import 없이 쓰는 컴포넌트와 pre·table 대체를 등록한다
// @MX:SPEC: .claude/docs/domains/posts.md

import type { ComponentProps } from 'react';
import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';
import { BatchPlayground } from '@/components/mdx/BatchPlayground';
import { ClaimPlayground } from '@/components/mdx/ClaimPlayground';
import { CodeBlock } from '@/components/mdx/CodeBlock';
import { FailurePointPlayground } from '@/components/mdx/FailurePointPlayground';
import { Figure } from '@/components/mdx/Figure';
import { HeapPlayground } from '@/components/mdx/HeapPlayground';
import { JobSequencePlayground } from '@/components/mdx/JobSequencePlayground';
import { JobStateDiagram } from '@/components/mdx/JobStateDiagram';
import { LoaderPlayground } from '@/components/mdx/LoaderPlayground';
import { NextStepPlayground } from '@/components/mdx/NextStepPlayground';
import { QueueClassDiagram } from '@/components/mdx/QueueClassDiagram';
import { RecoveryPlayground } from '@/components/mdx/RecoveryPlayground';

// 글 안에서 import 없이 쓰는 컴포넌트를 여기에 등록한다.
// pre·table 은 마크다운이 만든 태그를 바꿔 끼운다.
// @MX:ANCHOR: 키 이름이 곧 글 MDX 의 태그 이름이다
// @MX:REASON: content/posts/*/index.mdx 가 이 이름(Figure, *Playground)으로 쓴다. 이름을 바꾸면 그 글들의 렌더가 깨진다
// @MX:WARN: 여기 등록한 클라이언트 컴포넌트에 글에서 함수를 props 로 넘기지 않는다
// @MX:REASON: MDX 는 서버에서 그리므로 클라이언트 컴포넌트로 함수를 넘기면 직렬화 오류가 난다
const components: MDXComponents = {
  BatchPlayground,
  ClaimPlayground,
  FailurePointPlayground,
  Figure,
  HeapPlayground,
  JobSequencePlayground,
  JobStateDiagram,
  LoaderPlayground,
  NextStepPlayground,
  QueueClassDiagram,
  RecoveryPlayground,
  // 글끼리 잇는 내부 링크(/posts/<slug>)는 사이트 안에서 이동한다. 밖으로 가는 링크는 그대로 둔다.
  // 박물관 두루마리 안에서는 Reader 가 이 링크를 가로채 그 글의 두루마리로 바꿔 연다.
  // @MX:WARN: 내부 링크에 prefetch 를 켜지 않는다
  // @MX:REASON: 두루마리 안에서는 Reader 가 이 링크를 /museum/read/<slug> 로 바꿔 열어, 미리 받은 /posts/<slug> 는 쓰이지 않고 요청만 늘어난다
  a: ({ href = '', ...props }: ComponentProps<'a'>) =>
    href.startsWith('/') ? <Link href={href} prefetch={false} {...props} /> : <a href={href} {...props} />,
  pre: CodeBlock,
  table: (props: ComponentProps<'table'>) => (
    <div className="table-wrap">
      <table {...props} />
    </div>
  ),
};

// @MX:WARN: 파일 위치(src/mdx-components.tsx)와 함수 이름 useMDXComponents 는 @next/mdx 가 요구한다
// @MX:REASON: 옮기거나 이름을 바꾸면 App Router 에서 MDX 가 동작하지 않는다(node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/mdx-components.md)
export function useMDXComponents(): MDXComponents {
  return components;
}
