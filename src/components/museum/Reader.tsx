'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

// 박물관 위에 펼쳐지는 두루마리. 글 내용만 가져와 위아래 나무 축 사이의 종이에 싣고, 종이를 위에서 아래로 스크롤해 읽는다.
// 닫기·Esc·바깥 누르기·뒤로 가기 모두 history 를 한 칸 되돌려, 박물관은 서 있던 자리 그대로 남는다.
export function Reader({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    paper.current?.scrollTo(0, 0);
    paper.current?.focus({ preventScroll: true });
    return () => dialog.close();
  }, [href]);

  return (
    <dialog
      ref={ref}
      className="reader"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        router.back();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) router.back();
      }}
    >
      <div className="scroll">
        <div className="scroll__rod mono">
          {/* 일반 링크로 열어 가로채지 않고 글 페이지 전체(목차·이어서 읽기)로 간다 */}
          <a className="scroll__tag" href={href}>
            전체 페이지
          </a>
          <button type="button" className="scroll__tag" onClick={() => router.back()}>
            말기 <kbd className="key">Esc</kbd>
          </button>
        </div>
        <div className="scroll__paper" ref={paper} tabIndex={-1}>
          {children}
        </div>
        <div className="scroll__rod" aria-hidden />
      </div>
    </dialog>
  );
}
