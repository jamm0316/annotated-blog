'use client';
// @MX:NOTE: 박물관 위 두루마리 읽기 창(<dialog>). 끝까지 내리면 도장, 닫으면 READ_EVENT
// @MX:SPEC: .claude/docs/domains/museum.md

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { loadPassport, READ_EVENT, stamp } from './passport';

// 박물관 위에 펼쳐지는 두루마리. 글 내용만 가져와 위아래 나무 축 사이의 종이에 싣고, 종이를 위에서 아래로 스크롤해 읽는다.
// 닫기·Esc·바깥 누르기·뒤로 가기 모두 history 를 한 칸 되돌려, 박물관은 서 있던 자리 그대로 남는다.
// 종이 끝까지 내려가면 관람 수첩에 도장이 찍힌다(passport.ts).
export function Reader({ id, title, href, children }: { id: string; title: string; href: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [sealed, setSealed] = useState(() => typeof window !== 'undefined' && !!loadPassport().stamps[id]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    paper.current?.scrollTo(0, 0);
    paper.current?.focus({ preventScroll: true });
    const opened = performance.now();
    // 스크롤할 것도 없이 짧은 글은 펼치자마자 끝까지 본 것으로 친다
    const raf = requestAnimationFrame(() => checkEnd());
    return () => {
      cancelAnimationFrame(raf);
      dialog.close();
      window.dispatchEvent(new CustomEvent(READ_EVENT, { detail: { id, ms: performance.now() - opened } }));
    };
    // checkEnd 는 paper 만 읽는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function checkEnd() {
    const p = paper.current;
    if (!p || p.scrollTop + p.clientHeight < p.scrollHeight - 80) return;
    stamp(id);
    setSealed(true);
  }

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
        <div className="scroll__paper" ref={paper} tabIndex={-1} onScroll={sealed ? undefined : checkEnd}>
          {children}
          <div className="scroll__seal" data-on={sealed || undefined} role="status">
            <span className="scroll__stamp mono" aria-hidden>
              관람
              <br />
              완료
            </span>
            <p className="mono">{sealed ? '수첩에 도장을 찍었어요. 말아서 닫으면 부엉이가 기다려요.' : '끝까지 읽으면 수첩에 도장이 찍혀요.'}</p>
          </div>
        </div>
        <div className="scroll__rod" aria-hidden />
      </div>
    </dialog>
  );
}
