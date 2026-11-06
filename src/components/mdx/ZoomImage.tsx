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
