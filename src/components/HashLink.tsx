'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { MouseEvent, ReactNode } from 'react';

// 머리말의 '/#note' 같은 링크. next/link 는 같은 페이지에서 해시만 바꿀 때 pushState 만 하고 hashchange 를 띄우지 않아
// 첫 화면 목록(PostBrowser)이 탭을 바꾸지 못한다. 첫 화면에서는 location.hash 를 직접 바꿔 hashchange 가 나게 한다.
export function HashLink({ href, className, children }: { href: `/#${string}`; className?: string; children: ReactNode }) {
  const pathname = usePathname();
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (pathname !== '/' || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    window.location.hash = href.slice(2);
  };
  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
