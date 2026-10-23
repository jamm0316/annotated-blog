import type { MDXComponents } from 'mdx/types';
import { Figure } from '@/components/mdx/Figure';

// 글 안에서 import 없이 쓰는 컴포넌트를 여기에 등록한다.
const components: MDXComponents = {
  Figure,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
