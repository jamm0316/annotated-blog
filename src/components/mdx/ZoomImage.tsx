'use client';

import Image from 'next/image';
import { useRef } from 'react';

type Props = { src: string; alt: string; width: number; height: number };

// 본문 폭에서는 작아 읽기 힘든 그림을 누르면 화면 가득 크게 연다.
// 원본보다 크게 늘리지는 않고, 세로로 긴 그림은 위아래로 내려 읽는다. 어디를 누르거나 Esc 를 누르면 닫힌다.
export function ZoomImage({ src, alt, width, height }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button type="button" className="zoom__open" aria-label={`그림 크게 보기: ${alt}`} onClick={() => dialog.current?.showModal()}>
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes="(max-width: 760px) 100vw, 680px"
          style={{ width: '100%', height: 'auto' }}
        />
        {/* 누르면 커진다는 표시. 늘 보이게 둔다 */}
        <span className="zoom__badge" aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
          </svg>
        </span>
      </button>
      <dialog ref={dialog} className="zoom" aria-label={alt} onClick={() => dialog.current?.close()}>
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes={`min(100vw, ${width}px)`}
          loading="lazy"
          className="zoom__img"
          style={{ maxWidth: `${width}px` }}
        />
        <span className="zoom__close mono" aria-hidden>
          Esc · 누르면 닫힘
        </span>
      </dialog>
    </>
  );
}
